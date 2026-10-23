---
title: Live configuration and logging
description: LOGGING_CONFIG, /setlogchannel, Workers Logs, and the live /settings keys.
---

# Live configuration and logging

## Logging and observability

Telegram logging is compiled **on** and still **sends nothing** until a destination resolves. In `src/config.ts`, `LOGGING_CONFIG.enabled`, `auditAdminActions`, and `analyticsEnabled` all ship as `true`. `getEffectiveLogChannel()` returns null when no target is configured. `LoggerService` then returns before `sendMessage`: no Bot API subrequest and no D1 write on that path.

Analytics Engine is a different switch. `analyticsEnabled: true` means a real event may call `writeDataPoint` on `FILESTORE_ANALYTICS`. Turning Telegram logs off does not turn that off, and the reverse is also true.

::: tip
Four controls. They are not aliases of each other: the compile-time object, the `LOG_CHANNEL_ID` secret, live `/setlogchannel`, and the commented `[observability]` block.
:::

### Compile-time `LOGGING_CONFIG`

Changing this object needs a commit and a Worker deploy. It is not on `/settings`.

| Field | Shipping value | What it controls |
|---|---|---|
| `enabled` | `true` | Master switch for Telegram operational and audit logging. `false` means the Worker does not resolve a log chat, does not build the log HTML, and does not call `sendMessage` for logs, even if a secret or a `system_config` row is left behind. |
| `auditAdminActions` | `true` | When a destination is active, successful admin mutations emit an audit message. `false` keeps operational alerts and silences admin actions. |
| `alertCooldownMs` | 15 minutes | In-memory dedupe for the same operational alert on this isolate. A different isolate has its own window. The D1 free-tier alert uses its own one-hour cooldown instead of this value. |
| `maxDedupeEntries` | 500 | Cap on that map. Updating a key that is already present does not evict another key. A new key at capacity evicts the oldest insertion. |
| `analyticsEnabled` | `true` | Allows `writeDataPoint`. `false` leaves the Analytics Engine write quota untouched. |

With these defaults, Telegram logging still does nothing until scenario 2 or 3 below supplies a destination. `enabled: false` is the compile-time way to guarantee that a leftover secret cannot send.

### GitHub secret `LOG_CHANNEL_ID`

Set it to a negative channel id (`-100…`) where the bot can post. The next Worker deploy injects it. It is used only when `system_config.log_channel_id` is empty.

Leave the secret unset. Telegram logging stays off. The owner's private chat is not a fallback for ordinary alerts, so there is no background spam.

Clearing the secret on a later deploy does not erase a `system_config` value the owner already saved.

### Live `/setlogchannel`

Owner only. The command writes `system_config.log_channel_id`. `getDynamicConfig` caches that row for 60 seconds; the write clears the cache on the isolate that handled the command. Other isolates pick it up within 60 seconds. No Worker deploy.

| Command | Effect |
|---|---|
| `/setlogchannel -100123456789` | Operational alerts and admin audit logs go to that channel. The bot must be allowed to post there. |
| `/setlogchannel owner` | Same stream, to the owner's private chat (`OWNER_ID`). |
| `/setlogchannel me` | Same as `owner`. |
| `/setlogchannel off` | Telegram logs off, even if `LOG_CHANNEL_ID` is set. |
| `/setlogchannel disable` | Same as `off`. |
| `/setlogchannel clear` | Same as `off`. |

`off` / `disable` / `clear` do not mean "fall back to the secret". To use the secret again, point the command at a channel id or at `owner` / `me`. An empty secret plus no override stays off.

Resolution order inside `getEffectiveLogChannel()`:

1. `LOGGING_CONFIG.enabled === false` → nothing.
2. D1 value `off`, `disable`, `disabled`, `clear`, or `none` → nothing, even when the secret is set.
3. D1 value `owner` or `me` → `OWNER_ID`.
4. D1 numeric chat id → that chat.
5. Any other non-empty D1 value → nothing. Fail closed. Do not leak to the secret.
6. Empty D1 value → `LOG_CHANNEL_ID`, or nothing.

**What is sent when a destination is active**

Operational alerts, deduplicated:

- D1 free-tier hard failure (daily rows read or written). At most one Telegram notify per isolate per hour, not a storm.
- Storage channel 403 (bot kicked or missing rights). This is not the "bot was blocked by the user" path. A blocked user is silent.
- Quota-cache saturation, when the in-memory "daily cap reached" map hits `QUOTA_CACHE_CONFIG.maxEntries` (1000).
- A force-join channel found dead on an admin recheck. Membership checks on the user's download path do not send this alert themselves.
- Unhandled errors that reach grammY `bot.catch`.

Admin audit, when `auditAdminActions` is on: `/addadmin`, `/deladmin` (and `/removeadmin`), `/ban`, `/unban`, `/addvip`, `/maintenance` (and `/maint`), `/factoryreset` (and `/resetfactory`).

Messages are Telegram HTML. Dynamic text goes through `escapeHtml()`. The body is truncated to 4,096 characters.

::: warning Factory reset is the only owner-chat fallback
`getFactoryResetTarget()` sends the JSON backup to the active log destination, or to `OWNER_ID` when no channel resolves. If that send fails, the wipe does not run. Ordinary alerts never use this fallback, so an owner who left logging off does not receive them in private.
:::

### Workers Logs and `wrangler tail`

Workers Logs are not Telegram and they are not Analytics Engine. `[observability]` in `wrangler.toml` ships commented out, so a normal request does not ingest a Workers Logs event. The Free plan includes 200,000 log events a day. The cron alone is 1,440 invocations before any user traffic.

::: danger Do not uncomment the block to "see counters"
Analytics Engine counters are the `filestore_analytics` dataset. Uncommenting `[observability]` turns on a different quota. If you do turn it on, set `head_sampling_rate = 0.01` rather than `1`, and leave traces off unless you have a reason.
:::

`npx wrangler tail` streams console output for new invocations. It does not edit `wrangler.toml`, does not enable Workers Logs in the dashboard, and does not turn Telegram logging on. The token needs **Workers Tail → Read**, which the Edit Cloudflare Workers template already includes. Stop it with Ctrl-C. It is a debug session, not a permanent logger.

| You want | Do this | Stays off when |
|---|---|---|
| No Telegram logs and no owner spam | Leave `LOG_CHANNEL_ID` empty and do not run `/setlogchannel` | Default, even though `LOGGING_CONFIG.enabled` is `true` |
| Logs in a channel after deploy | Set `LOG_CHANNEL_ID` | `/setlogchannel off` |
| Change the target without a deploy | `/setlogchannel` as the owner | `LOGGING_CONFIG.enabled` is `false` |
| Dashboard log events | Uncomment `[observability]`, sample, and deploy the Worker | The block stays commented |
| A few minutes of live console output | `npx wrangler tail` | You are not running tail |

## Constants and live `/settings`

Source of the constants: `src/config.ts`. Live operator settings are rows in D1 `system_config`. Live changes do not need a deploy. A constant in `src/config.ts` changes only after the Worker workflow deploys it.

`getDynamicConfig()` caches each `system_config` key in the isolate for **60 seconds**. Writes from `/settings` and `/setlogchannel` clear that cache on the isolate that handled the command. Another isolate can serve the previous value until its 60 seconds end.

`LOGGING_CONFIG` is not editable from `/settings`.

### `PROJECT_CONFIG`

| Constant | Value | What it actually controls |
|---|---|---|
| `DEFAULT_WORKER_NAME` | `telegram-filestore-bot` | Documents the Worker name. The workflow reads `name` from `wrangler.toml`, not this constant. A workflow form can override the toml name for that run only. |
| `DEFAULT_DB_NAME` | `filestore-db` | Documents the D1 name. The workflow reads `database_name` from `wrangler.toml`. |
| `ANALYTICS_DATASET_NAME` | `filestore_analytics` | Documents the dataset name. The binding that matters is the one in `wrangler.toml`. Do not rename one without the other. |

### `LIMITS`

All of these are live and require a deploy to change.

| Constant | Value | Effect |
|---|---|---|
| `MAX_FORCE_JOIN_CHANNELS` | 8 | Maximum active force-join channels. |
| `FORCE_JOIN_THROTTLE_SEC` | 3 | Minimum gap between a user's force-join re-checks. |
| `DEFAULT_DAILY_DOWNLOADS` | 10 | Fallback when `system_config.daily_download_limit` is missing. The live number is the D1 row, edited with `/setdailylimit`. |
| `DEFAULT_FILE_DAILY_LIMIT` | 3 | Fallback when `file_daily_limit` is missing. Live number is `/setfilelimit` (owner). |
| `RATE_LIMIT_BURST` | 3 | Non-admin messages allowed inside the window. The next one is muted. |
| `RATE_LIMIT_WINDOW_SEC` | 5 | Window for that burst. Mute length is 60 seconds, hardcoded in `rate_limit.ts`, and it exists only on that isolate. |
| `MAX_BUNDLE_ITEMS` | 25 | Maximum files stored in one bundle JSON document. |
| `MAX_PER_SESSION_UPLOAD` | 20 | Maximum files accepted in one `/batch` session. Also capped by `MAX_BUNDLE_ITEMS`. |
| `CHUNK_DELIVERY_SIZE` | 10 | Files sent per delivery step. The next chunk is a button, which is another update, so a 25-file bundle is three Worker invocations, not one giant fan-out. |
| `MAX_ADMINS` | 10 | Maximum rows with `role = 'admin'`. Super admins and the owner are not counted. |
| `MAX_PASSCODE_ADMIN` | 5 | Maximum active password-protected bundles created by a regular Admin. |
| `MAX_PASSCODE_SUPERADMIN` | 15 | Maximum active password-protected bundles created by a Super Admin. |
| `OWNER_PASSCODE_WARN_THRESHOLD` | 20 | Advisory warning threshold for Owner password-protected bundles. |
| `MAX_ROTATING_ADMIN` | 3 | Maximum active rotating bundles created by a regular Admin. |
| `MAX_ROTATING_SUPERADMIN` | 10 | Maximum active rotating bundles created by a Super Admin. |
| `MAX_ROTATING_PER_CHANNEL` | 10 | Maximum active rotating bundles pointing to a single channel. |
| `OWNER_ROTATING_WARN_THRESHOLD` | 20 | Advisory warning threshold for Owner rotating bundles. |
| `POST_SYNC_COOLDOWN_SEC` | 300 | Cooldown in seconds (5m) for non-owner admins between channel post sync/rotations. |
| `OWNER_SYNC_WARN_COOLDOWN_SEC` | 60 | Cooldown in seconds (1m) before owner advisory notice on channel post sync. |

### `QUOTA_CACHE_CONFIG`

Used by delivery as a same-isolate hint that a user is already over the daily cap, so a repeat click does not have to hit D1 first. It is not the quota authority. The ledger write is.

| Field | Value | Effect |
|---|---|---|
| `enabled` | `true` | Turn the hint on. Set the Worker secret `ENABLE_QUOTA_CACHE` to the string `false` to disable it without editing code. The GitHub workflow does not set that secret. |
| `ttlMs` | 5 minutes | How long a "daily cap reached" hint lives in this isolate. |
| `maxEntries` | 1000 | Cap on the map. A full map evicts so the isolate cannot grow it without bound. |
| `alertCooldownMs` | 15 minutes | Kept for the quota-cache warning. That warning goes through `LoggerService` and this cooldown, not a direct `LOG_CHANNEL_ID` send. |

`DEFAULT_BOT_INFO` is the static grammY identity used on the cold path (cannot join groups, no inline mode, and the other flags). `first_name` falls back to `File Store Bot` unless `BOT_FIRST_NAME` is set.

### Live `/settings` (no deploy)

`/settings` and `/botconfig` are Super Admin and Owner commands. The message shows the current D1 values. Owner-only rows are hidden from Super Admins.

| What | Who | How | D1 key |
|---|---|---|---|
| Daily download cap for ordinary users | Super Admin, Owner | Button on `/settings`, or `/setdailylimit <count>` | `daily_download_limit` |
| Default channel for bundle posts | Super Admin, Owner | `/setpubchannel <-100…\|off\|clear>` | `publish_channel_id` |
| Telegram log channel | Owner | `/setlogchannel` with a channel id, `owner`, or `off` | `log_channel_id` (`off` disables even if `LOG_CHANNEL_ID` is set; empty uses the secret; missing both is off) |
| Bot profile (name, description, short description) | Super Admin, Owner | `/botprofile` or the profile button | Telegram, not D1 |
| Per-link cap | Owner | `/setfilelimit <count>` | `file_daily_limit` |
| Auto-delete of delivered messages | Owner | `/setautodel <seconds>` (`0` disables), or the button, which cycles `0 → 60 → 300 → 600 → 1800 → 3600` | `auto_delete_seconds` |
| Default bundle expiry TTL | Owner | `/setbundlettl <seconds\|presets>`, or button, cycling `0 → 1h → 6h → 24h → 7d → 30d` | `default_bundle_ttl_seconds` |
| Maintenance mode | Owner | `/maintenance` or `/maint`, or the button | `maintenance_mode` (`0` / `1`) |
| Default language | Owner | Button toggles `en` / `fa` | `default_language` |
| Global protect content | Owner | Button | `global_protect_content` (`0` / `1`) |

Maintenance mode blocks non-admins. Admins, super admins, and the owner still get through.

Language selection, in order: if the Telegram `language_code` starts with `fa`, the user gets Persian. Otherwise they get Persian only when `default_language` is `fa`, and English in every other case.

Auto-delete `0` means the cron does not queue those messages. Any other value is seconds until the minute cron calls `deleteMessages`. The cron reads at most 25 queue rows per minute and stops at 35 Bot API calls or the first 429.

These are also live, but they are not on the `/settings` screen:

| Command | Who | Effect |
|---|---|---|
| `/setverifybtn <label>` | Admin | Force-join verify button label. Key `cfg_fj_verify_btn`. |
| `/setchannelbtn <channel_id> <label>` | Admin | Button label for one force-join channel (2–40 characters). |

VIP multipliers and the admin 150/20 caps are code, not `/settings`. Changing the daily limit scales VIP (`× 5` and `× 3`) and does not change the admin caps.

---
