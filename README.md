# Verify Bot (NUS)

## Introduction

I am the creator of the Telegram Group [NUS Lost and Found](https://t.me/NUSlostandfound). This was created in 2016 when I lost a valuable item during one of my classes and could not find it.

I then thought that there was an inherent gap in the community where people help one another look out for lost items around school. Since inception, the group has grown to 12,000+ members strong (as of March 2026), and I am greatly heartened to know that this group is helping and benefitting so many people.

## Past Moderation Efforts

Up until now, moderation has been mostly automated, huge thanks to Rose bot. It was mostly carried out by learning from the common keywords that people tend to send when they were trying to send spam or scam messages. Think keywords like "invest, crypto, paid". This also includes profanities and sexually explicit keywords.

Rose has largely served us well for the most part, and we are thankful for such automated intervention.

Apart from that, there is a small lean team of human moderators who look at reports when chat members flag them out to us. However, being humans, we are not always on our devices and we are not available 24/7.

## Recent Problems

Scam and spam messages have gotten increasingly creative and harder to detect, with the moderation team observing active efforts to bypass Rose.

Some of these include:

1. Forwarding of images
2. Forwarding of stories
3. Sending in non-English languages
4. Insertion of spaces into forbidden keywords (e.g. in vest)
5. Substitution of characters in forbidden keywords

An example scam message is as follows:

`Givi ng away my 15-inch MacBook Air (M4) — bareIy used and stiII in exceIIent condition.`

## Challenges and Considerations:

1. We cannot turn off image sending, as this is crucial for showing what the lost item look like.
2. We cannot reliably add every single permutation of white-spaced words to the block, as it would be a non-exhaustive list.

## Possible Solution(s):

1. AI-assisted moderation bot:
   This bot would analyse every message sent into the group and determine whether it is spam or a scam. While powerful in theory, this approach presents several significant challenges:

- **Model training**: A custom model would need to be trained on thousands of labelled examples of scam messages specific to our group's context, requiring significant data collection and annotation effort
- **Ongoing API costs**: Using a third-party LLM API (such as Claude or GPT-4) to screen every single message in a 12,000-member group would incur substantial and unpredictable monthly costs, especially as the group grows
- **Latency**: Every message would need to be screened before or after delivery, adding complexity to the moderation pipeline
- **False positives**: AI models are imperfect — legitimate lost and found posts could be flagged and removed, eroding member trust
- **Adversarial adaptation**: Scammers actively probe and adapt to automated detection systems, meaning the model would require continuous retraining to remain effective

In short, AI-assisted moderation would be a significant engineering and financial investment that is ultimately overkill for a community group of this nature.

2. Identity verification:
   All NUS students and Staff are assigned a NUS email. We can perform email verification via OTP (One-Time Passwords) sent to their NUS emails.

## Final Solution: Verifybot

Verifybot is a serverless Telegram bot built on Cloudflare Workers that enforces institutional identity verification before allowing members to post in the group.

### Architecture

The bot is built on a fully serverless stack with zero infrastructure to maintain:

- **Cloudflare Workers** — runs the bot logic on-demand at the edge, triggered by Telegram webhook events
- **Cloudflare D1** — serverless SQLite database storing verified members and in-flight verifications
- **Resend** — transactional email delivery for OTP codes
- **Grammy** — TypeScript framework for the Telegram Bot API

### How It Works

1. A new member joins the group → bot immediately restricts them to read-only mode
2. Bot attempts to DM the member with verification instructions. If the member has never interacted with the bot before (which is the case for most new members), Telegram does not allow bots to initiate conversations — so the bot falls back to posting a silent notification in the group instead, prompting them to DM the bot directly
3. Member DMs the bot and submits their NUS email address (`@u.nus.edu` or `@nus.edu.sg`)
4. Bot generates a cryptographically secure 6-digit OTP and emails it to their NUS inbox
5. Member submits the OTP back to the bot
6. Bot verifies the code, permanently records the member as verified, and lifts their posting restrictions

Additional quality-of-life behaviours:

- The group notification is sent silently (no ping/notification sound) to avoid disrupting ongoing conversations
- If multiple new members join in quick succession, the bot automatically deletes the previous welcome message before posting a new one, so there is always at most one welcome message visible at any time
- The welcome message is automatically deleted after 15 seconds to keep the chat clean

Since only NUS students and staff have access to NUS email inboxes, this guarantees that every member who can post in the group is a verified member of the NUS community — making it significantly harder for external bad actors to infiltrate and spam the group.

### Why Serverless?

The bot runs entirely on Cloudflare's global edge network with no server to manage or maintain. It costs nothing beyond a domain name (~$10/year), scales automatically to handle any number of simultaneous verifications, and has no single point of failure.

## Self-Hosting

Want to deploy your own instance for your NUS Telegram group? Here's how:

**Prerequisites**

- Node.js 18+
- A Cloudflare account (free)
- A Resend account (free)
- A domain name for sending emails (~$10/year)

**Setup**

1. Clone the repository

```bash
git clone https://github.com/0mgABear/verifybot
cd verifybot
npm install
```

2. Create a Telegram bot via [@BotFather](https://t.me/BotFather) and copy the token

3. Create a Cloudflare D1 database

```bash
npx wrangler d1 create verifybot-db
```

Copy the database ID into `wrangler.jsonc`

4. Apply the database schema

```bash
npx wrangler d1 execute verifybot-db --remote --file=schema.sql
```

5. Add your secrets

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put RESEND_API_KEY
```

6. Deploy

```bash
npx wrangler deploy
```

7. Register your webhook (replace `YOUR_BOT_TOKEN` and `YOUR_WORKER_URL`)

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "YOUR_WORKER_URL", "allowed_updates": ["message", "chat_member"]}'
```

8. Add the bot to your Telegram group and grant it admin rights with **Restrict Members** and **Send Messages** permissions

Note: By default, verified members are granted permission to send text messages, photos, and videos. If your group has different default permissions, update the restrictChatMember call in src/index.ts after the OTP verification to match your group's settings before deploying.

```
can_send_messages: true,       // text messages
can_send_photos: true,         // images
can_send_videos: true,         // videos
can_send_documents: true,      // files
can_send_audios: true,         // music
can_send_voice_notes: true,    // voice messages
can_send_video_notes: true,    // video messages
can_send_other_messages: true, // stickers, GIFs
can_send_polls: true,          // polls
can_add_web_page_previews: true // link previews
```

Set any permission to false to restrict that content type for verified members.

**Using this for a non-NUS organisation?**

This bot is not NUS-specific. To use it for any organisation with institutional email addresses, set the `ALLOWED_DOMAINS` environment variable to a comma-separated list of your allowed domains:

```bash
npx wrangler secret put ALLOWED_DOMAINS
# Enter: yourdomain.com,anotherdomain.com
```

The bot will automatically accept emails from those domains only. If `ALLOWED_DOMAINS` is not set, it defaults to `u.nus.edu` and `nus.edu.sg`.

If you run into any issues, feel free to open an issue on GitHub or reach out directly — happy to help.

## Credits:

The Original Idea came from the creator of [this bot](https://t.me/marketplace_automod_bot), and he goes by the name of Billy Cao. [Telegram Contact](https://t.me/aliencaocao)

This idea whilst not original, has been open-sourced. I have not adopted any of his work and/or code in any way or form.

I strongly believe that we all play a part in prevention of spam and especially scams, and hence I have decided to open-source this project. I have also personally covered the domain costs.

For more of my work, please do check out https://linktr.ee/commonertech.
Please also consider supporting me (for domain costs).

This is proudly a @commonertech product.
