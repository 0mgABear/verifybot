# Verify Bot (NUS)

## Project Background:

---

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
2. Member receives a prompt to DM the bot and run `/verify`
3. Member submits their NUS email address (`@u.nus.edu.sg` or `@nus.edu.sg`)
4. Bot generates a cryptographically secure 6-digit OTP and emails it to their NUS inbox
5. Member submits the OTP back to the bot
6. Bot verifies the code, permanently records the member as verified, and lifts their posting restrictions

Since only NUS students and staff have access to NUS email inboxes, this guarantees that every member who can post in the group is a verified member of the NUS community — making it significantly harder for external bad actors to infiltrate and spam the group.

### Why Serverless?

The bot runs entirely on Cloudflare's global edge network with no server to manage or maintain. It costs nothing beyond a domain name (~$10/year), scales automatically to handle any number of simultaneous verifications, and has no single point of failure.

## Credits:

The Original Idea came from the creator of [this bot](https://t.me/marketplace_automod_bot), and he goes by the name of Billy Cao. [Telegram Contact](https://t.me/aliencaocao)

This idea whilst not original, has been open-sourced. I have not adopted any of his work and/or code in any way or form.

I strongly believe that we all play a part in prevention of spam and especially scams, and hence I have decided to open-source this project. I have also personally covered the domain costs.

For more of my work, please do check out https://linktr.ee/commonertech.
Please also consider supporting me (for domain costs).

This is proudly a @commonertech product.
