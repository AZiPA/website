---
title: Setup & Deployment
description: Zero-Env configuration, GitHub Actions deployment via @tgcloud/cli, and Telegram Serverless setup.
---

# Setup & Deployment

Complete guide to deploying, configuring, and maintaining the Telegram Serverless FileStore Bot.

---

## Zero-Env Architecture Philosophy

This bot operates under a strict **Zero-Environment-Variable (`Zero-Env`)** design:
- **No `process.env`:** Telegram Serverless isolates do not rely on local `.env` files or host environment variables.
- **Dynamic Database Configuration:** All runtime settings (download caps, mirror channel IDs, log channel targets, maintenance mode) are stored persistently in the `system_config` table and managed dynamically through bot commands or the settings panel.
- **Dynamic Identity:** The bot's username and identity are retrieved directly at runtime via native `api.getMe()`.
- **Zero-State Cold Bootstrap:** Ownership is securely claimed on first launch using `/setbotowner` (or `/ermia`), permanently seeding the primary owner without hardcoding IDs.

---

## Deployment Methods

### Option 1: Automated GitHub Actions CI/CD (Recommended)

Deployment is completely automated via `.github/workflows/deploy.yml` on push to `main`:

1. Fork or push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**.
3. Add the single required secret:
   - `TGCLOUD_TOKEN`: Your `@tgcloud/cli` access token provided by Telegram Serverless.
4. Push your changes to `main`. The CI workflow performs:
   ```bash
   tgcloud fetch
   tgcloud push
   tgcloud migrate --safe
   tgcloud webhook sync
   ```
5. GitHub Actions executes pure deployment using the pinned CLI binary (`./node_modules/.bin/tgcloud`) with zero dependency on local developer scripts.

::: tip Zero-Config Forks
Forks stay 100% zero-config: the only secret needed is `TGCLOUD_TOKEN`. Pull requests receive no secrets for security.
:::

---

### Option 2: Local Deployment via `@tgcloud/cli`

For local deployment and manual schema migrations:

1. Clone or navigate to the repository:
   ```bash
   cd telegram-filestore-tgcloud
   ```

2. Install runtime and CLI dependencies:
   ```bash
   npm install
   ```

3. Push modules and synchronize database migrations:
   ```bash
   npx @tgcloud/cli push
   npx @tgcloud/cli migrate --safe
   npx @tgcloud/cli webhook sync
   ```

---

### Option 3: BotFather Web UI / Direct Paste

For operators who manage bot code directly through BotFather's Serverless web editor:

1. Locate the distribution files in `dist/`:
   - `dist/schema.js`: Paste into the Database Schema editor tab.
   - `dist/single-file-core.js`: Standalone monolithic distribution containing all modular business logic (`helpers`, `buttons`, `delivery`, `bundles`, `admin`) with bilingual locale dictionaries pre-inlined.
   - `dist/handlers/message.js`: Paste into the Message Handler editor tab.
   - `dist/handlers/callback_query.js`: Paste into the Callback Query Handler editor tab.
2. Save and publish within the BotFather interface.

---

## Post-Deployment Bootstrap & Configuration

### 1. Primary Owner Bootstrap (`/setbotowner`)

Immediately after deploying to a fresh database:
1. Open a direct private chat with your bot in Telegram.
2. Send the cold-start bootstrap command:
   ```
   /setbotowner
   ```
   *(Alias: `/ermia`)*
3. If no owner exists in `system_config`, the bot records your numeric Telegram ID with role `owner` (Level 4) and permanently locks bootstrap. Any future bootstrap attempts will be rejected.

---

### 2. Private Storage Channel (`/setstoragechannel`)

Configuring a storage mirror channel enables zero-byte, bulk `copyMessages` delivery:
1. Create a **Private Channel** in Telegram (e.g. `FileStore Archive`).
2. Add your bot as an **Administrator** with permission to:
   - Post Messages
   - Edit Messages
   - Delete Messages
3. Obtain the channel's numeric ID (e.g. `-1001234567890`).
4. In your private chat with the bot, execute:
   ```
   /setstoragechannel -1001234567890
   ```
5. To disable the mirror storage channel:
   ```
   /setstoragechannel off
   ```

---

### 3. Log Channel (`/setlogchannel`)

Audit logs, security strike alerts, and administrative actions can be forwarded to a dedicated channel:
1. Create a private channel and add the bot as an Administrator.
2. Link the log channel:
   ```
   /setlogchannel -1009876543210
   ```
3. Alternatively, forward logs to your private chat (`/setlogchannel owner`) or disable logging (`/setlogchannel off`).

---

### 4. Force-Join Channels (`/channels`)

Configure up to **8** mandatory subscription channels:
1. Execute `/channels`.
2. Follow the interactive wizard to add public or private channels.
3. **Passive Verification:** Channel membership verification is purely passive via `getChatMember`, generating zero invite-link API mutations and eliminating HTTP 429 rate-limit risks. Verification requests run concurrently in waves of at most 6 outgoing requests.
