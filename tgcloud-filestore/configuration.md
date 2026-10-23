---
title: Dynamic Configuration
description: Zero-Env architecture, runtime system_config table, dynamic keys, and management commands.
---

# Dynamic Configuration

Comprehensive guide to the Zero-Env dynamic configuration system powering the Telegram Serverless FileStore Bot.

---

## Zero-Environment-Variable Philosophy

Traditional bot frameworks require environment files (`.env`), deployment secrets, and process variables (`process.env.VARIABLE`) to store limits and settings. This introduces key limitations:
- Any configuration change requires code rebuilds or isolate redeployments.
- Sensitive parameters can be accidentally leaked in stack traces or logs.
- Hardcoded settings cannot be tuned live by bot administrators in chat.

In this Telegram Serverless edition:
1. **No `process.env`:** The runtime contains no environment variables.
2. **`system_config` Table:** All system parameters are stored dynamically in the embedded SQLite database table `system_config`.
3. **60-Second In-Memory TTL Micro-Cache:** Settings are read using `getConfig(key, fallback)` and admin roles are resolved via `getAdmins()` using an in-memory micro-cache with a 60-second TTL, completely eliminating redundant database read queries on high-frequency lookups.
4. **Live Mutation:** SuperAdmins and Owners adjust settings directly inside Telegram using slash commands or the `/settings` interactive panel via `setConfig(key, value)`.

---

## In-Memory Caching & Memory Eviction Safeguards

To maintain peak performance in serverless micro-isolates with bounded memory:
- **60-Second TTL Micro-Cache:** High-frequency lookups for `getConfig()` and `getAdmins()` are cached in memory for 60 seconds, eliminating redundant database queries on incoming requests. Administrative mutations via `setConfig(key, value)` update the active isolate immediately and propagate across parallel isolates on TTL expiry.
- **Bounded Memory Eviction Guards:** Rate-limiting and throttle tracking maps (`strikeMap` in `middlewares/rate_limiter.js`) enforce strict memory bounds (capped at 2,000 entries) with automatic LRU eviction and timestamp-based throttle pruning, ensuring a bounded memory footprint across all execution isolates.
- **Modular Services Architecture:** Dynamic features are managed by modular single-purpose services under `tgcloud/lib/services/`:
  - `storage_channel.js`: Storage channel configuration and zero-byte file synchronization.
  - `log_channel.js`: Event logging, administrative auditing, and security strike alerts.
  - `media_config.js`: Dynamic runtime media-type validation and allowed upload categories.

---

## Configuration Keys Reference

The following parameters are stored in `system_config`:

| Configuration Key | Data Type | Default Value | Minimum Role | Description |
|---|---|---|---|---|
| `daily_download_limit` | `number` | `10` | Level 3: SuperAdmin | Maximum files standard users can download across all links per UTC day. |
| `file_daily_limit` | `number` | `3` | Level 4: Owner | Maximum times a standard user can download files from the same share link per UTC day. |
| `storage_channel_id` | `string` | `""` (disabled) | Level 3: SuperAdmin | Channel ID (`-100...`) where uploaded files are permanently mirrored for bulk `copyMessages` delivery. |
| `log_channel_id` | `string` | `""` (disabled) | Level 4: Owner | Channel ID (`-100...`) or `'owner'` for security strike alerts and audit events. |
| `owner_id` | `number` | `null` | Public (Cold Start) | Telegram user ID of the primary bot owner, established during initial `/setbotowner` bootstrap. |
| `maintenance_mode` | `number` (0/1) | `0` | Level 4: Owner | When `1`, blocks standard users from accessing links and presents a localized maintenance notice. |
| `bot_username` | `string` | Cached | System | Auto-populated at startup via `api.getMe()`; used for deep-link generation (`https://t.me/<bot>?start=<code>`). |

---

## Configuration Commands & Workflows

### 1. Interactive Settings Panel (`/settings`)
SuperAdmins and Owners can execute `/settings` to open an inline button dashboard showing:
- Current daily and per-link quotas.
- Force-join channel count and status.
- Storage channel binding status.
- Quick buttons to adjust thresholds interactively.

### 2. Daily Download Limit (`/setdailylimit <count>`)
Updates the global daily download cap for ordinary consumers:
```
/setdailylimit 25
```

### 3. Per-Link Limit (`/setfilelimit <count>`)
Updates the maximum download attempts allowed per individual bundle per day:
```
/setfilelimit 5
```

### 4. Storage Channel (`/setstoragechannel <-100...|off|clear>`)
Binds or detaches the mirror storage channel:
```
/setstoragechannel -1001234567890
/setstoragechannel off
```

### 5. Log Channel (`/setlogchannel <-100...|owner|off>`)
Routes audit and security events:
```
/setlogchannel -1009876543210
/setlogchannel owner
/setlogchannel off
```

### 6. Maintenance Mode Toggle (`/maintenance`)
Toggles `maintenance_mode` between `0` and `1`. When active:
- Standard users attempting to download bundles receive a maintenance alert.
- Admins and SuperAdmins retain full access to test and configure the bot.

Background maintenance tasks are guarded by an **Atomic Compare-And-Swap (CAS)** on the `last_maint_at` timestamp in `system_config`, preventing duplicate background cleanup executions across parallel serverless isolates.
