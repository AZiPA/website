---
title: Commands and roles
description: Owner, super admin, admin, VIP, and user commands, plus the deploy checklist.
---

# Commands and roles

Rank, highest first: **Owner > Super Admin > Regular Admin > VIP > User**. One row per user in `admins`. A person is not both super admin and admin. VIP is a separate table (`vips`), not an admin role.

`command_guard` lets the owner call every command. Everyone else is limited to the set for their rank. A callback is not a command: mutating buttons check the role themselves.

The owner is `OWNER_ID`, and also any `admins.role = 'owner'` row. CI keeps `OWNER_ID` on `owner`. Commands cannot ban, demote, or remove that id.

### Owner

Everything below, plus:

| Command | Effect |
|---|---|
| `/maintenance`, `/maint` | Toggle maintenance mode. |
| `/resetfactory confirm`, `/factoryreset confirm` | Sends a JSON backup (config, force-join channels, bundle count, admin count) to the log channel, or to `OWNER_ID` if no log channel resolves. Aborts if that send fails. Then deletes `bundles`, `bundle_votes`, `admin_sessions`, `deletion_queue`, `user_quotas`, `user_downloads`, `force_channels`, and `vips`. **Does not delete `admins` or `system_config`.** Parameter `confirm` is required. |
| `/restore` | Reply to a backup `.json` document (up to 256 KB) to restore `system_config` entries and `force_channels` in a single atomic batch write. |
| `/setautodel <0 \| 10..172800>` | Auto-delete delay in seconds (`0` off, or `10..172800` up to 48 hours). |
| `/setbundlettl <0\|off\|1h\|6h\|24h\|7d\|30d\|seconds>` | Default expiration TTL applied to newly uploaded bundles (`0` disables). |
| `/setfilelimit <count>` | Per-link daily cap for ordinary users. |
| `/setlogchannel <target>` | Log destination. Channel id, `owner`, `me`, `off`, `disable`, or `clear`. See [Logging and observability](/cloudflare-filestore/configuration#logging-and-observability). |
| `/addadmin <user_id> superadmin` | Only the owner may grant `superadmin`. |

Owner downloads are not written to `user_downloads` and are not capped.

### Super Admin

Owner commands above are refused. Super Admin can manage regular admins and cannot manage the owner or another super admin (`roleRank` / `outranks`).

| Command | Effect |
|---|---|
| `/settings`, `/botconfig` | Settings menu. Daily limit, publish channel, and bot profile. Owner-only toggles are not shown. |
| `/setdailylimit <count>` | Ordinary-user daily cap. |
| `/setpubchannel <channel_id\|off\|clear>` | Set default channel ID for bundle posts and link rotation. |
| `/botprofile` | Name, description, short description. |
| `/admins` | List super admins and regular admins. Shows the regular-admin count against 10. |
| `/addadmin <user_id>` | Add a regular admin, or change a lower role to admin. Fails at 10 regular admins. |
| `/addadmin <user_id> superadmin` | Refused. Owner only. |
| `/deladmin <user_id>`, `/removeadmin <user_id>` | Remove a user this caller outranks. |
| `/ban <user_id> [1..3650]` | Ban for 1 to 3650 days (default **30** days). Cannot target the owner or a peer/higher role. |
| `/unban <user_id>` | Clear `banned_until` and strikes. |
| `/addvip <user_id> [days]` | VIP. Omit days or pass `0` for no expiry (`expires_at = 0`). |
| `/vips` | List active VIP members with inline controls (Refresh, Clear All). |
| `/delvip <user_id>`, `/removevip <user_id>` | Remove VIP status for a specific user. |
| `/delvip all`, `/clearvips` | Clear all VIP members with confirmation prompt. |

Plus every Regular Admin command.

### Regular Admin

Refused for Super Admin and Owner commands.

| Command | Effect |
|---|---|
| `/upload` | One file. The next file you send becomes a one-item bundle and returns a `t.me` deep link. |
| `/batch` | Up to 20 files (and at most 25 in the document). |
| `/done` | Close a batch (writes one `bundles` row) or leave edit mode. |
| `/cancel` | Drop the open session. |
| `/edit <code>`, `/manage <code>`, `/review <code>` | Bundle hub for an 8–36 character code. Item removal uses compare-and-swap on `items`. Respects hierarchical ownership lock (`owner_locked`). |
| `/setexpiry <code> <duration>` | Set bundle expiration timer (`0`, `off`, `1h`, `6h`, `24h`, `3d`, `7d`, `30d`, or seconds). |
| `/setpass <code> <pin\|off\|clear>` | Set PIN passcode (4-32 alphanumeric chars, enforces content protection) or clear it. |
| `/postbundle <code> [channel_id]` | Publish or sync bundle post with download button to default or target channel. |
| `/rotatelink <code>` | Rotate bundle UUID link immediately, update channel post, and invalidate prior link. |
| `/setname <code> <title>` | Search title. `/setname <code> clear` removes it. Protected bundles cannot take a title. |
| `/search <text>`, `/find <text>` | Admin search by title. At least 2 characters. Limit 10. Does not load `items`. |
| `/stats`, `/status` | Bundle count, file count (`json_array_length`), download sum. Cached 5 minutes. |
| `/top`, `/topfiles` | Top 5 codes by downloads in that same snapshot. |
| `/channels`, `/fjmenu`, `/forcejoin` | Force-join menu. |
| `/addchannel` | See the syntax below. |
| `/delchannel <channel_id>` | Remove a channel and revoke its invite link. |
| `/setchannelbtn <channel_id> <label>` | Channel button label, 2–40 characters. |
| `/setverifybtn <label>` | The "I have joined" button label. |

`/addchannel` syntax:

- Reply to a forwarded channel post with `/addchannel [member_limit] [button label]`, or
- `/addchannel <channel_id> [member_limit] [button label]`

The channel id must look like `-100...`. The bot must be an administrator there and must be allowed to invite users. `member_limit` of `0` or omitted keeps a permanent link (public `t.me` username, or the existing link). A positive limit creates a new invite link with that member cap. At most 8 channels.

Admin download caps are 150/day and 20 per link per day, independent of `/setdailylimit`.

### VIP

No admin commands. Same user surface as a normal user. While `expires_at` is `0` or still in the future, caps are five times the daily limit and three times the per-link limit. Super Admins can list active VIPs via `/vips`, revoke a single user's VIP status via `/delvip <user_id>` (or `/removevip <user_id>`), or clear all VIPs via `/delvip all` or `/clearvips`. Factory reset deletes `vips` and does not delete `admins`.

### User

| Command | Effect |
|---|---|
| `/start` | Short welcome. |
| `/start <code>` | Deliver that bundle, after force-join (if configured) and quota checks. |
| `/start <code>_<pin>` | Deliver password-protected bundle in a single step. |
| `/help` | How to use a deep link, and the force-join note. |

Any other command is ignored with no reply. Opening an admin deep link as a non-admin delivers the files instead of the admin hub. Banned users (`user_quotas.banned_until`) are dropped. The ban flag is cached per isolate for up to 60 seconds; `/unban` clears it on the isolate that handled the command.

Non-admins are also limited to 3 updates in 5 seconds on a single isolate, then a 60-second local mute. That mute is not a D1 ban and does not follow the user to another isolate.

---

## Deploy checklist

1. D1 database `filestore-db` exists or will be created by Actions in `weur` on the first run. Git still says `PLACEHOLDER_D1_ID`. A database you already created in the dashboard is reused and is not moved.
2. `wrangler.toml` has `workers_dev = false` and the custom domain `routes` entry. `[observability]` is still commented out.
3. GitHub secrets from section 3 are set. There is no `BOT_ID` secret.
4. The API token has the template grants (**Workers Scripts → Write** and the rest) plus **Account → D1 → Write**. There is no "D1 Edit" label on that screen.
5. The Security rule was created under the domain's **Security → Security rules** (Custom rules), with one of the two expressions in section 5, and it matches the real webhook path or bot hostname plus `149.154.160.0/20` and `91.108.4.0/22`.
6. `getWebhookInfo` matches the custom domain, `max_connections` is 8, and a live `/start` returns 200.
7. Domains & Routes still shows the custom domain up and `workers.dev` down after the latest Actions run.
