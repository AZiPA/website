---
title: Cloudflare and D1 setup
description: How GitHub Actions creates or reuses filestore-db in Western Europe and which API token row the dashboard shows.
---

# Cloudflare and D1 setup

::: tip The UUID never lands in Git
`PLACEHOLDER_D1_ID` stays in the repository. The workflow writes the real id only on the runner, masks it, and refuses to continue if it is not a UUID.
:::

Do these once, in the same Cloudflare account that will own the Worker. The GitHub workflow does not commit the database UUID.

### 2.1 D1 database `filestore-db`

The deploy job creates this database on the first run if it does not already exist. You can also create it yourself in the dashboard; either path works. The job never recreates a database that is already there.

1. Optional: Dashboard → **Storage & databases** → **D1 SQL** → **Create**, named exactly `filestore-db`. Leave location as you prefer if you create it by hand. CI will reuse that UUID and will **not** move it.
2. If you skip the dashboard, GitHub Actions calls `POST /accounts/{account_id}/d1/database` with `{"name":"filestore-db","primary_location_hint":region}` (defaults to `weur` — Western Europe). That hint applies only to databases this job creates.
3. The binding in `wrangler.toml` stays `database_id = "PLACEHOLDER_D1_ID"` in Git. CI rewrites the id only on the runner.
4. Do not paste `schema.sql` by hand. The job runs `wrangler d1 execute filestore-db --remote --file=./schema.sql -y`.

What the schema creates: `bundles`, `admin_sessions`, `bundle_votes`, `deletion_queue`, `admins` (`role` in `admin` / `superadmin` / `owner`), `vips`, `user_quotas` (bans and strikes, not a second download counter), `user_downloads`, `system_config`, `force_channels`, plus the indexes and the daily-limit triggers. Default config rows: maintenance off, daily limit 10, per-link limit 3, auto-delete 0, language `en`, global protect off. There is no default `log_channel_id` row, so Telegram logging stays off until a destination is configured.

### 2.2 What GitHub Actions does with that database

``.github/workflows/deploy.yml`` runs on every push to `main` and on **Run workflow**. The job uses Node 24 and `npm install --legacy-peer-deps` (not `npm ci`: `package-lock.json` is gitignored), then:

1. Reads `database_name` from `wrangler.toml`, unless you typed a custom name into the workflow form. Custom names are lowercased to kebab-case. Empty input keeps `filestore-db`.
2. Lists D1 databases with `GET /accounts/{account_id}/d1/database?name=...` and keeps the row whose `name` matches exactly.
3. If that list is empty, creates the database with `primary_location_hint` set to the resolved region hint (defaults to `"weur"`, or the value from `custom_db_region` / `vars.D1_LOCATION`). If create races with an existing row, it lists again and reuses the UUID. A failed list is a failed job. It does not guess and it does not call `wrangler d1 create`.
4. Masks that UUID in the Actions log (`::add-mask::`) and refuses to continue if the id is not a UUID.
5. `sed` writes `database_name` and `database_id` into the **checkout on the runner**. There is no commit and no push. `PLACEHOLDER_D1_ID` stays in Git.
6. Applies `schema.sql`, then the idempotent `admins.role` alter, then upserts `OWNER_ID` as `role = 'owner'`.
7. `npx wrangler deploy`, then secret injection. `STORAGE_CHANNEL_ID`, `LOG_CHANNEL_ID`, and `BOT_FIRST_NAME` are sent only when the GitHub secret is non-empty.

`npx wrangler d1 create --location=weur` is intentionally not used. Wrangler mixes banners into `--json`, prompts for a location on a TTY-less runner, and its `--location` flag is not the same contract as the API's `primary_location_hint`. `< /dev/null` only makes the prompt hit EOF.

`workflow_dispatch` inputs `custom_db_name`, `custom_db_region`, and `custom_worker_name` are optional. Leave them blank to keep defaults (`filestore-db`, `weur`, and `telegram-filestore-bot`). A custom database name is created in the specified region when it does not already exist.

#### D1 region selection & Telegram Data Center (DC) mapping

Cloudflare D1 supports six location hints: `weur` (Western Europe), `eeur` (Eastern Europe), `enam` (Eastern North America), `wnam` (Western North America), `apac` (Asia-Pacific), and `oc` (Oceania).

**Why `weur` (Western Europe) is the default:**
- Telegram's central Bot API gateway (`api.telegram.org`), webhook dispatchers (`149.154.160.0/20`, `91.108.4.0/22`), and European Data Centers (**DC2 & DC4**) are hosted in **Amsterdam, Netherlands (Western Europe)**.
- Because incoming Telegram webhooks hit Cloudflare's Western European edge colos, the Worker isolate and outgoing Bot API subrequests run in Western Europe. Placing D1 in `weur` keeps the Worker, D1 database, and Telegram Bot API co-located with minimal round-trip latency.

**Telegram DC reference mapping:**
If your bot creator account, primary user base, or storage channel resides in another Telegram Data Center, you can set `custom_db_region` (or set a repository variable `D1_LOCATION`) when creating a new database:
- **DC2 / DC4 (Europe — Amsterdam):** `weur` (Default — recommended for most bots) or `eeur`
- **DC1 / DC3 (Americas — Miami):** `enam` (or `wnam`)
- **DC5 (Asia-Pacific — Singapore):** `apac` (or `oc` for Oceania)

::: info Initial creation only
Cloudflare assigns `primary_location_hint` **only when initially creating a database**. An existing database is reused as-is and cannot be relocated between regions by changing workflow inputs.
:::

### 2.3 Analytics Engine dataset `filestore_analytics`

You do not create this dataset by hand, and you must not rename it.

`wrangler.toml` already contains:

```toml
[[analytics_engine_datasets]]
binding = "FILESTORE_ANALYTICS"
dataset = "filestore_analytics"
```

Workers Analytics Engine creates the dataset the first time the Worker calls `writeDataPoint` on that binding. Deploying the binding does not require a separate Analytics permission. The binding name `FILESTORE_ANALYTICS` and the dataset name `filestore_analytics` are fixed.

After the first real metric write, the dataset shows up in the dashboard under **Workers & Pages** and **Analytics** → **Workers Analytics Engine**. If you want to query it with the SQL API (`POST /accounts/<id>/analytics_engine/sql`), that read token needs **Account Analytics Read**. The deploy token does not need that permission for the Worker to write points.

Do not uncomment `[observability]`. That block is Workers Logs / traces, not this dataset.

### 2.4 `CLOUDFLARE_API_TOKEN` from the "Edit Cloudflare Workers" template

Dashboard → **My Profile** → **API Tokens** → **Create Token** → template **Edit Cloudflare Workers** → **Use template**.

The template (Cloudflare's template table, last updated 2026-04-20) already grants:

| Template permission | Scope | Needed by this repo? |
|---|---|---|
| Workers Scripts → Write | Account | Yes. `wrangler deploy`, `wrangler secret put`, `wrangler secret bulk`. The row already says **Write**. Leave it. |
| Workers Routes → Write | Zone | Yes, once a custom domain or route is deployed. Leave it, and limit the zone to the bot's zone. |
| Account Settings → Read | Account | Yes. Wrangler reads the account. |
| User Details → Read | User | Yes. Keep it. |
| User Memberships → Read | User | Yes. Keep it even though `CLOUDFLARE_ACCOUNT_ID` is set. Wrangler still resolves membership. |
| Workers KV Storage → Write | Account | No. This bot has no KV binding. Harmless if left on. |
| Workers R2 Storage → Write | Account | No. No R2 binding. Harmless if left on. |
| Workers Tail → Read | Account | No. The workflow does not tail. Harmless if left on. |

**Add D1 under Account.** It is not in the template. On the token screen, under **Account Resources**, click **+ Add more**. The permission dropdown labels levels **Read** and **Write** only, the same way the template row is `Workers Scripts` → `Write`. There is no **D1 Edit** choice in that dropdown. Do not go looking for one.

| What you click | Why |
|---|---|
| Account → **D1** → **Write** | Required. REST list/create in the deploy job, and `wrangler d1 execute` for `schema.sql`, the `ALTER`, and the owner seed. |
| Account → **D1** → **Read** | Optional. Add it if you also want this token to run read-only D1 queries. **Write** is the grant this deploy needs. |
| Zone → **DNS** → **Write** (bot zone only) | Add if a deploy that declares a custom domain cannot create the proxied DNS record. Custom Domains normally create that record when **Workers Routes → Write** is already on the zone. If the API returns a DNS permission error, add **Write** here rather than switching to a Global API Key. |
| Account → **Account Analytics** → **Read** | Optional. Only for SQL queries against `filestore_analytics`. Not required to deploy or to write data points. |

**Resource scope.** One account, not "all accounts". Zone resources: only the zone that will serve the custom domain, not every zone in the account. Do not grant API Tokens Write, and do not use the Global API Key.

**First deploy of a Worker that does not exist yet.** As of the Workers roles model (2026-09-15), `wrangler deploy` of a **new** script needs product-level **Workers Admin**. Deploying an **existing** script, and `wrangler secret put` / `secret bulk`, need **Workers Scripts → Write**, which the template already includes. Binding D1 on deploy needs that same Workers Scripts grant. **D1 → Write** is required because this workflow queries and migrates D1 directly, not because the binding exists.

Practical sequence if the first run says the token cannot create a script:

1. Dashboard → **Workers & Pages** → **Create** → name it exactly `telegram-filestore-bot` (empty script is enough), **or** add product-level Workers Admin to the token for that first run.
2. Re-run the workflow. Later deploys and secret injection stay on **Workers Scripts → Write**.
3. You can drop Workers Admin after the script exists if you do not want CI to be able to delete Workers.

**Analytics Engine and this token.** Writes go through the Worker binding at runtime and do not use `CLOUDFLARE_API_TOKEN`. No extra permission is required for the dataset to be created on first write. A token that is missing **D1 → Write** fails on the D1 REST list/create or on `wrangler d1 execute`, not at Analytics Engine. The same token is what creates `filestore-db` in `weur` when it does not already exist.

Copy the token once. Store it as the GitHub secret `CLOUDFLARE_API_TOKEN`. It is not a Worker binding and it must not be written into `wrangler.toml` or `src/`.

### 2.5 `CLOUDFLARE_ACCOUNT_ID`

Dashboard → **Workers & Pages** → right-hand account panel, or any dashboard URL:

```text
https://dash.cloudflare.com/<ACCOUNT_ID>/workers/overview
```

`<ACCOUNT_ID>` is a 32-character hex id. Store it as `CLOUDFLARE_ACCOUNT_ID`. The workflow passes it to Wrangler as `CLOUDFLARE_ACCOUNT_ID`. This is not a secret in the cryptographic sense, but it is still a GitHub Actions secret in this repo so it is not committed.

---

::: tip Documentation does not deploy the Worker
`.github/workflows/deploy.yml` ignores `docs/**`, `README*.md`, and `.github/workflows/docs.yml`. A push that only edits this site does not run the Worker pipeline. **Run workflow** still deploys when you start it by hand.
:::
