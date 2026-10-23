---
title: Commands & Roles
description: RBAC permissions (Levels 0-4), quotas, interactive ForceReply flows with /cancel breakout, and complete command reference.
---

# Commands & Roles

Reference manual for user roles, download quotas, interactive management hubs, session prompts, and available bot commands.

---

## Canonical RBAC Hierarchy

Permissions follow a strict hierarchical role structure from Level 0 to Level 4:

$$\text{Level 4: Owner} > \text{Level 3: SuperAdmin} > \text{Level 2: Admin} > \text{Level 1: VIP} > \text{Level 0: User}$$

| Level | Role | Quotas & Capabilities |
|---|---|---|
| **Level 4** | **Owner** | Full superuser authority. Unrestricted downloads, manage all admins, unlock any locked bundle, configure global settings, toggle maintenance mode. |
| **Level 3** | **SuperAdmin** | Elevated management. Can manage regular admins, configure storage and daily limits, and unlock standard bundles created by subordinate admins. |
| **Level 2** | **Admin** | Standard operator. Upload bundles, manage force-join channels (up to 8), inspect statistics, and configure per-bundle protections. |
| **Level 1** | **VIP** | Privileged subscriber. Unlimited downloads, exempt from daily quotas and mandatory force-join verification. |
| **Level 0** | **User** | Standard consumer. Subject to daily download quotas, link limits, and mandatory channel memberships. |

::: tip In-Memory RBAC Micro-Cache
Staff roles (`getAdmins()`) and system thresholds (`getConfig()`) are evaluated via a 60-second in-memory TTL micro-cache, eliminating redundant database lookups on high-frequency command execution.
:::

---

## Download Quota Matrix

Quotas are tracked per UTC day (`YYYY-MM-DD`) and atomic per-link counters in `user_downloads` (`code` column):

| Role | Daily Download Limit | Per-Link Limit | Force-Join Required |
|---|---|---|---|
| Level 4: Owner | Unlimited | Unlimited | No |
| Level 3: SuperAdmin / Level 2: Admin | 150 downloads | 20 downloads | No |
| Level 1: VIP (unexpired) | $\text{Daily} \times 5$ | $\text{Per-Link} \times 3$ | No |
| Level 0: Standard User | `daily_download_limit` (default 10) | `file_daily_limit` (default 3) | Yes (up to `MAX_FORCE_JOIN_CHANNELS = 8` channels, verified passively via `getChatMember`) |

---

## Interactive Session Flows & `/cancel` Breakout

Certain workflows require user or admin input via Telegram `ForceReply` prompts:
- **PIN Entry:** End users prompted to enter a passcode to unlock protected bundles.
- **Bundle Renaming:** Admins prompted to send the new bundle title.
- **PIN Setting:** Admins prompted to provide a 4-to-8 digit PIN.
- **Channel Addition:** Admins prompted to forward a channel post or send a channel username/ID.
- **Limit Configuration:** Admins prompted to input numeric limit thresholds.

::: tip `/cancel` Breakout Invariant
At any point during an interactive `ForceReply` prompt, sending `/cancel` (or clicking the inline Cancel button) immediately clears the active session (`clearAdminSession` or `clearUserSession`) and restores normal command routing.
:::

---

## User Commands

| Command | Minimum Role | Arguments | Description |
|---|---|---|---|
| `/start` | Level 0: User | None | Welcomes the user, displays general information and help overview. |
| `/start <code>` | Level 0: User | `code` (12 chars) | Resolves a bundle code and initiates paginated file delivery. |
| `/help` | Level 0: User | None | Displays contextual help based on the user's current role level. |
| `/setlang` | Level 0: User | None | Switches user interface language (`English` or `فارسی`). |
| `/cancel` | Level 0: User | None | Immediately aborts any pending `ForceReply` prompt or active batch session. |

---

## Bundle Creation & Uploads

### Single File Upload
Admins (Level 2+) can send any supported document, audio, video, photo, or animation directly to the bot. The bot generates an unguessable 12-character share code (Web Crypto) and displays an interactive Bundle Hub.

### Multi-File Batch Sessions
To bundle up to 25 files into a single code:
1. Run `/batch`.
2. Send files sequentially (up to 20 per session buffer, max 25 total).
3. Send `/done` to commit the bundle and generate the share link.
4. Send `/cancel` at any point to discard the batch session.

---

## Bundle Management Hub (`/manage` & `/edit`)

Executing `/manage <code>` or `/edit <code>` displays an interactive inline panel with the following controls:

- **Rename Bundle:** Update the title displayed during delivery (`setname.js`).
- **PIN Passcode Protection:** Set a 4-to-8 digit PIN code (`/setpin <code> <pin>` or inline prompt). Uses **`v2` rotation-safe PIN hashes** (PBKDF2/SHA-256 with bundle-specific salt) so rotating share codes never breaks existing PINs.
- **Auto-Expiry:** Configure self-destruction intervals: `1h`, `6h`, `12h`, `24h`, `48h`.
- **One-Time Burn:** Enable single-use delivery (`is_one_time = 1`), purging the bundle immediately upon completion.
- **Scheduled Link Rotation:** Enable automatic code replacement (`6h`, `12h`, `24h`, `48h`) with live updating of channel post buttons.
- **Hierarchical Owner Lock:** Toggle `owner_locked` to prevent peer or subordinate admins from editing or deleting the bundle.
- **Review Items (`/review <code>`):** Preview individual files with item-level deletion buttons.

---

## Administrative Commands

| Command | Minimum Role | Arguments | Description |
|---|---|---|---|
| `/setbotowner` (alias `/ermia`) | Public (Cold Start) | None | **Zero-State Bootstrap:** On initial cold start when no owner exists in `system_config`, claims primary bot ownership (Level 4) and locks permanently. |
| `/setstoragechannel` | Level 3: SuperAdmin | `<-100...\|off\|clear>` | Configures or clears the private file mirror storage channel in `system_config` (managed via `services/storage_channel.js`). |
| `/channels` | Level 2: Admin | None | Opens the Force-Join channel management panel (supports up to 8 active channels, verified purely passively via `getChatMember` with zero invite mutations and zero 429 risk). |
| `/vips` | Level 2: Admin | None | Lists active VIP subscribers and subscription expiries. |
| `/addvip` | Level 3: SuperAdmin | `<user_id> [days]` | Grants VIP status for a specified duration (defaults to 30 days). |
| `/delvip` | Level 3: SuperAdmin | `<user_id>` | Revokes VIP privileges immediately. |
| `/stats` | Level 2: Admin | None | Displays real-time download counts, bundle totals, and active bans. |
| `/settings` | Level 3: SuperAdmin | None | Opens interactive settings panel for system parameters and quotas. |
| `/setdailylimit` | Level 3: SuperAdmin | `<count>` | Updates standard daily download cap for ordinary users. |
| `/setfilelimit` | Level 4: Owner | `<count>` | Updates per-link download limit. |
| `/setlogchannel` | Level 4: Owner | `<-100...\|owner\|off>` | Configures log channel (`-100...`, owner DM, or disabled; managed via `services/log_channel.js`). |
| `/maintenance` | Level 4: Owner | None | Toggles maintenance mode on or off in `system_config` (opportunistic background tasks guarded by Atomic CAS on `last_maint_at`). |
| `/factoryreset` | Level 4: Owner | None | **Factory Reset:** Initiates a complete wiping of all bundles, quotas, sessions, and database tables. Strictly 100% button-driven via `maint_factory_confirm` (textual command arguments are fully disabled). Confirmation or cancellation prompts delete immediately to prevent stale UI state. |
