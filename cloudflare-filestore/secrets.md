---
title: GitHub Actions secrets
description: Required and optional Actions secrets. There is no BOT_ID secret.
---

# GitHub Actions secrets

::: danger Do not create `BOT_ID`
The numeric id is derived at runtime from `BOT_TOKEN` with `/^(\d+):/`. Never split the token, and never log it.
:::

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

`BOT_ID` is **not** a secret and must not be created. The numeric id is derived at runtime from `BOT_TOKEN`.

### Required

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy, D1, and secret injection. Section 2.4. |
| `CLOUDFLARE_ACCOUNT_ID` | Account the Worker and D1 live in. |
| `BOT_TOKEN` | From BotFather. Injected into the Worker. Never log it. The id prefix is parsed locally; the rest of the token is not split or stored separately. |
| `BOT_USERNAME` | Without `@`. Together with the derived id, this skips `getMe` on cold start. The workflow does not fail the job when this is empty; set it anyway. |
| `OWNER_ID` | Numeric Telegram user id of the owner. Seeded into `admins` as `role = 'owner'` on every deploy. Runtime also treats this id as owner even if the row is missing. |
| `WEBHOOK_PATH` | Secret path segment, no leading slash. The Worker accepts only `POST /<WEBHOOK_PATH>`. A guessable path (`webhook`, `bot`) makes the WAF rule the only thing hiding the Worker. Use a long random string. |
| `WEBHOOK_SECRET` | Sent to Telegram as `secret_token` and checked against `X-Telegram-Bot-Api-Secret-Token`. Strictly enforced (fail-closed): the CI workflow (`.github/workflows/deploy.yml`) exits if missing or < 16 characters; the Worker (`src/index.ts`) returns HTTP 403 if unset or mismatched. |

The job's hard fail list (it exits before D1 provision) is `WEBHOOK_PATH`, `BOT_TOKEN`, `OWNER_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `WEBHOOK_SECRET` (fails closed if missing or < 16 characters; Worker returns HTTP 403 if unset or mismatched). `BOT_USERNAME` is still required for static bot info.

### Optional

| Secret | Purpose |
|---|---|
| `STORAGE_CHANNEL_ID` | Numeric id of a channel where the bot is admin (usually `-100...`). On upload, the bot `copyMessage`s each file there and stores `storage_message_id`. Delivery then uses bulk `copyMessages` from that channel. If the secret is omitted, delivery sends each item by `file_id`, one request at a time. The bot does not proxy file bytes in either mode. |
| `LOG_CHANNEL_ID` | Optional default Telegram log channel (`-100…`). Used only when `system_config.log_channel_id` is empty. Omitted secret + empty D1 row = Telegram logging off (no Bot API log calls, no log writes, nothing sent to `OWNER_ID`). `/setlogchannel off` stores `off` and wins over this secret. `/setlogchannel owner` routes logs to the owner's private chat. Factory reset is the only path that falls back to `OWNER_ID` when no log target resolves. |
| `BOT_FIRST_NAME` | Optional display name baked into static `botInfo`. If omitted, the cold-start name is `File Store Bot` from `DEFAULT_BOT_INFO`. Not required. The workflow injects it only when it is non-empty. |

Empty optional secrets are omitted from `wrangler secret bulk`. They are not pushed as blank values.

Worker runtime secrets are only: `BOT_TOKEN`, `BOT_USERNAME`, `BOT_FIRST_NAME`, `WEBHOOK_PATH`, `WEBHOOK_SECRET`, `OWNER_ID`, `STORAGE_CHANNEL_ID`, `LOG_CHANNEL_ID`. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` stay on GitHub.

---
