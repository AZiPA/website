---
title: Webhook and edge hardening
description: Register the webhook at max_connections 8, then keep workers.dev off and block non-Telegram IPs at the zone.
---

# Webhook and edge hardening

::: danger Do not point Telegram at workers.dev
That hostname is public and it is not in your zone. A Security rule never sees it. Scanners keep the URL after you think you have moved.
:::

Deploy the Worker at least once so the domain answers, then register the webhook. Telegram must call:

```text
https://<YOUR_DOMAIN>/<WEBHOOK_PATH>
```

`<YOUR_DOMAIN>` is the custom domain from section 5, not `*.workers.dev`. `<WEBHOOK_PATH>` is the secret value with no extra slash.

`max_connections` is how many updates Telegram will push at once. The default is 40. This bot sets **8**: the daily budget is 100,000 requests, and the cron already uses 1,440 of them. A viral deep link with the default of 40 can drain the quota in an afternoon. Eight in flight is enough for a small public bot and keeps a flood from scheduling the whole day in one hour.

`allowed_updates` is only `message` and `callback_query`. The bot does not handle inline queries, channel posts, or poll results. Extra types would still invoke the Worker.

Prefer curl so the token does not land in browser history. Replace the variables locally. Do not commit the command with real values.

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://<YOUR_DOMAIN>/${WEBHOOK_PATH}" \
  --data-urlencode "secret_token=${WEBHOOK_SECRET}" \
  -d "max_connections=8" \
  --data-urlencode 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
```

The same call in a browser (token will be stored in history; avoid this on a shared machine):

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/<WEBHOOK_PATH>&secret_token=<WEBHOOK_SECRET>&max_connections=8&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D&drop_pending_updates=true
```

A correct response contains `"ok": true` and `"description": "Webhook was set"`.

### Verify

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

```text
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Check:

- `url` is `https://<YOUR_DOMAIN>/<WEBHOOK_PATH>`
- `has_custom_certificate` is false (Cloudflare's edge certificate is public and valid)
- `pending_update_count` is 0, or falling, after a test `/start`
- `max_connections` is 8
- `allowed_updates` is `["message","callback_query"]`
- `last_error_message` is empty. A 403 here means `WEBHOOK_SECRET` ≠ `secret_token`. A 404 means the path does not match `WEBHOOK_PATH`.

Smoke test from any machine that is **not** Telegram (expect **403** if the secret header is wrong, **404** if the path is wrong):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://<YOUR_DOMAIN>/<WEBHOOK_PATH>"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://<YOUR_DOMAIN>/<WEBHOOK_PATH>" \
  -H "X-Telegram-Bot-Api-Secret-Token: wrong"
```

Both should be `403` when `WEBHOOK_SECRET` is set (missing header and wrong header are the same check). A wrong path should be `404`. Then send `/start` to the bot and confirm `getWebhookInfo` shows a recent successful delivery.

### Clear a backlog (`drop_pending_updates`)

Use this when `pending_update_count` is large, after a bad deploy, or when Cloudflare has started returning **error 1027**. Those retries are themselves requests and will consume the next day's quota if they are still queued at 00:00 UTC. The Worker cannot see 1027 and cannot drop the queue itself.

Re-register the same URL and drop what is pending:

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://<YOUR_DOMAIN>/${WEBHOOK_PATH}" \
  --data-urlencode "secret_token=${WEBHOOK_SECRET}" \
  -d "max_connections=8" \
  --data-urlencode 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
```

To stop delivery entirely until the quota resets:

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" \
  -d "drop_pending_updates=true"
```

Call `setWebhook` again after 00:00 UTC. Confirm with `getWebhookInfo` that `pending_update_count` is 0.

---

## Custom domain and WAF hardening

### Why the `workers.dev` hostname has to go

A new Worker is published at `<name>.<account-subdomain>.workers.dev`. That hostname is public, it is not behind your zone's WAF, and every scanner that finds it spends the 100,000 request/day quota. HTTP 404 from the Worker still counts as a request. Error 1027 only appears after the quota is already gone.

A custom domain on a zone you control is what lets you drop non-Telegram traffic **before** the Worker runs. Blocked WAF requests are not Worker invocations. They do not consume the daily request quota. Cron ticks and real Telegram updates still do.

### Make every GitHub Actions deploy keep that choice

The committed `wrangler.toml` does **not** set `workers_dev` and does **not** declare a route. Wrangler's default is `workers_dev = true` when the file has no routes. The next `npx wrangler deploy` from Actions will turn `*.workers.dev` back on if you only disabled it in the dashboard.

Cloudflare's rule for routes is the opposite problem: **routes in the dashboard are replaced on the next deploy by whatever `routes` the file contains.** A custom domain that exists only in the dashboard can be removed by a deploy that does not mention it. A file that sets `workers_dev = false` and has **no** `routes` key leaves dashboard routes alone. A file that sets `routes` becomes the source of truth.

Use the file as the source of truth so a deploy cannot re-enable `workers.dev` and cannot drop the hostname. Add both, with your real hostname, and commit them:

```toml
# Disable the public workers.dev route on every deploy.
workers_dev = false

# Re-attach the custom domain on every deploy. Hostname only; the secret
# path is WEBHOOK_PATH, not part of this route.
routes = [
  { pattern = "bot.example.com", custom_domain = true }
]
```

::: warning TOML key placement
In TOML syntax, any key placed after a table header belongs to that table. `workers_dev = false` and `routes = [...]` **must** be placed at the top level of `wrangler.toml` **above** the first `[[d1_databases]]` or `[[analytics_engine_datasets]]` table header (e.g., right under `compatibility_flags`). If placed at the bottom of the file, TOML associates them with the preceding array of tables and Wrangler will ignore or reject them.
:::

Replace `bot.example.com` with a hostname on a zone that is on **this** Cloudflare account (the zone must already be active). Do not put `PLACEHOLDER` here and deploy.

Then:

1. Confirm the API token includes **Workers Routes → Write** on that zone (the template has it; narrow the zone).
2. Push to `main`, or run the workflow.
3. Wrangler creates the custom hostname, the proxied DNS record, and the certificate. If the API complains about DNS, add **DNS → Write** on that zone and re-run. You do not manage the certificate yourself.
4. Dashboard → **Workers & Pages** → `telegram-filestore-bot` → **Settings** → **Domains & Routes**.
   - Custom domain: your hostname, status active.
   - `workers.dev`: **Disabled**.
5. Register the webhook against `https://bot.example.com/<WEBHOOK_PATH>` only after the certificate is active.

**After every later deploy, check the same screen.** With the snippet committed, each Actions run writes `workers_dev = false` and the same custom domain again, so the dashboard should still show workers.dev off and the custom domain present. If someone removes `workers_dev = false` or deletes the `routes` entry, the following deploy puts the public hostname back or drops the domain. If you add a second hostname only in the dashboard, the next deploy removes it, because the file does not list it.

Do not point Telegram at `workers.dev` "just until DNS works". Scanners will keep that URL after you think you have moved.

Local `wrangler dev` is unaffected. `workers_dev = false` only changes the deployed route.

### Security rule: Telegram's IPv4 ranges only

Open the zone (the domain), not the Workers overview. The current dashboard has no **Security → WAF → Custom rules** item. The path is:

**Select the domain → Security → Security rules → Create rule → Custom rules.**

- Name: `telegram-webhook-only`
- Action: **Block**
- Deploy / Save.

Two expressions are valid. Both use the Bot API webhook IPv4 ranges `149.154.160.0/20` and `91.108.4.0/22`. Put the rule above any Skip rule that would exempt the hostname.

**Option A — block non-Telegram clients only on the webhook path.** Other paths on the same zone stay open, so a normal site on this domain is not locked. Replace the path with your real `WEBHOOK_PATH`, including the leading slash:

```text
(http.request.uri.path eq "/REPLACE_WITH_WEBHOOK_PATH" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
```

What it does: a request whose path is exactly the webhook path, and whose source IP is outside those ranges, is blocked at the edge. The Worker is not invoked. That request does not spend the 100,000/day quota. Telegram's webhook calls match the IP list and are allowed through. The Worker still checks `X-Telegram-Bot-Api-Secret-Token`. Scanners that hit `/` or some other path are not blocked by this option.

**Option B — block every request to the bot hostname unless the IP is Telegram.** Use this when the hostname serves only the bot and you want random paths blocked too, not just the secret path. Replace the host:

```text
(http.host eq "bot.example.com" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
```

Same action: **Block**. Anything to that subdomain from outside `ip.src in {149.154.160.0/20 91.108.4.0/22}` never reaches the Worker. Do not use option B on a hostname that also serves a website you open from a browser. To combine both (bot host and webhook path only):

```text
(http.host eq "bot.example.com" and http.request.uri.path eq "/REPLACE_WITH_WEBHOOK_PATH" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
```

This rule does nothing for `*.workers.dev`. That hostname is not in your zone, so **Security rules** never sees it. That is why this section disables the workers.dev route in `wrangler.toml`.

After you save the rule, the curl smoke test from your laptop to the real path should return Cloudflare's block page (or HTTP 403 from the edge rule), not the Worker's 403. `getWebhookInfo` should still show successful deliveries, because Telegram's IPs match the allow exception.

If a future Telegram network change starts failing `last_error_message` with a connection timeout or a Cloudflare block, re-check Telegram's published webhook ranges before widening this rule to `0.0.0.0/0`.

---
