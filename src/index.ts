import { Bot, webhookCallback } from 'grammy';
import { Resend } from 'resend';

export interface Env {
	TELEGRAM_BOT_TOKEN: string;
	RESEND_API_KEY: string;
	verifybot_db: D1Database;
}

const ALLOWED_DOMAINS = ['u.nus.edu', 'nus.edu.sg'];

//Cloudflare entry point
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
		const resend = new Resend(env.RESEND_API_KEY);

		//NEW MEMBER JOIN
		bot.on('chat_member', async (ctx) => {
			const member = ctx.chatMember.new_chat_member;
			if (member.status !== 'member') return;
			if (member.user.is_bot) return;

			const userId = member.user.id;
			const chatId = ctx.chat.id;

			const existingUser = await env.verifybot_db
				.prepare('SELECT * FROM verified_users WHERE user_id = ? AND chat_id=?')
				.bind(userId, chatId)
				.first();

			if (existingUser) return;

			await ctx.api.restrictChatMember(chatId, userId, {
				can_send_messages: false,
			});

			await ctx.api.sendMessage(chatId, `👋 Welcome ${member.user.first_name}! Please DM me to verify your NUS email before you can post.`);

			await env.verifybot_db
				.prepare('INSERT OR REPLACE INTO pending_otps (user_id, group_chat_id, email, otp, expires_at) VALUES (?, ?, ?, ?, ?)')
				.bind(userId, chatId, '', '', '')
				.run();
		});

		bot.command('start', async (ctx) => {
			if (ctx.chat.type !== 'private') return;
			await ctx.reply(
				'👋 Welcome! Please enter your NUS email address to verify:\n- Student: e1234567@u.nus.edu\n- Staff: john@nus.edu.sg',
			);
		});

		//VERIFICATION
		bot.command('verify', async (ctx) => {
			if (ctx.chat.type !== 'private') {
				await ctx.reply('Please DM me this command privately!');
				return;
			}
			await ctx.reply('Please enter your NUS email address:\n- Student: e1234567@u.nus.edu\n- Staff: john@nus.edu.sg');
		});

		//EMAIL CHECK
		bot.on('message:text', async (ctx) => {
			if (ctx.chat.type !== 'private') return;
			const pendingGroup = await env.verifybot_db.prepare('SELECT * FROM pending_otps WHERE user_id = ?').bind(ctx.from.id).first();

			if (!pendingGroup) {
				await ctx.reply('❌ You have no pending verifications!');
				return;
			}
			const text = ctx.message.text.trim().toLowerCase();

			if (text.includes('@')) {
				const domain = text.split('@')[1];
				if (!ALLOWED_DOMAINS.includes(domain)) {
					await ctx.reply(`❌ Only NUS emails are allowed. Please use your @u.nus.edu or @nus.edu.sg email.`);
					return;
				}
				//Secure OTP generation
				const otp = String((crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000);
				const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
				await env.verifybot_db
					.prepare('UPDATE pending_otps SET email = ?, otp = ?, expires_at = ? WHERE user_id = ?')
					.bind(text, otp, expiresAt, ctx.from.id)
					.run();

				await resend.emails.send({
					from: 'verify@commonertech.dev',
					to: text,
					subject: 'Your NUS Group Verification Code',
					html: `
        <p>Hi,</p>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    `,
				});

				await ctx.reply(
					"📧 A verification code has been sent to your email. Can't find it? Look out for an email from verify@commonertech.dev. Please enter it here:",
				);
			} else if (/^\d{6}$/.test(text)) {
				const pending = await env.verifybot_db.prepare('SELECT * FROM pending_otps WHERE user_id = ?').bind(ctx.from.id).first();

				if (!pending) {
					await ctx.reply('❌ No pending verification found. Please start with /verify.');
					return;
				}
				if (new Date(pending.expires_at as string) < new Date()) {
					await ctx.reply('❌ Code expired. Please start again with /verify.');
					return;
				}
				if (pending.otp !== text) {
					await ctx.reply('❌ Incorrect code. Please try again.');
					return;
				}
				// OTP is correct — save to verified_users
				await env.verifybot_db
					.prepare('INSERT OR REPLACE INTO verified_users (user_id, chat_id, email) VALUES (?, ?, ?)')
					.bind(ctx.from.id, pending.group_chat_id, pending.email)
					.run();

				await env.verifybot_db.prepare('DELETE FROM pending_otps WHERE user_id = ?').bind(ctx.from.id).run();

				// Unmute them in the group
				await ctx.api.restrictChatMember(pending.group_chat_id as number, ctx.from.id, {
					can_send_messages: true,
				});

				await ctx.reply('✅ Email verified! You can now post in the group. Welcome!');
			}
		});

		const handleUpdate = webhookCallback(bot, 'cloudflare-mod');
		return handleUpdate(request);
	},
} satisfies ExportedHandler<Env>;
