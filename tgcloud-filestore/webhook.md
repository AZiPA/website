---
title: Webhook Management
description: Native Telegram Serverless webhook routing, synchronization via @tgcloud/cli, and update invariants.
---

# Webhook Management

Comprehensive guide to native webhook routing, update event dispatching, and synchronization in Telegram Serverless.

---

## Native Platform Webhook Routing

In traditional bot hosting environments (such as Cloudflare Workers or VPS servers), developers must configure public DNS records, reverse proxies, SSL certificates, secret tokens, and manually call `setWebhook`.

In **Telegram Serverless (`@tgcloud/bot`)**, webhook management is fully managed by the Telegram infrastructure:
- **Direct Event Ingestion:** Telegram routes incoming updates directly into the bot's serverless micro-isolate.
- **Flat Handler Mapping:** Update types are automatically routed according to files in `handlers/`:
  - `handlers/message.js`: Receives `message` updates (text commands, media uploads).
  - `handlers/callback_query.js`: Receives `callback_query` updates (inline button presses).
- **Zero Public Surface:** There are no open HTTP ports, no public web URLs, and no external webhook endpoints that can be probed by third parties.

---

## Webhook Synchronization (`tgcloud webhook sync`)

The webhook's `allowed_updates` configuration is tied directly to the flat handler scripts present in `handlers/`:

1. When a handler is added or modified, the webhook configuration must be updated on the Telegram platform.
2. In the automated CI/CD pipeline (`.github/workflows/deploy.yml`), this is handled by:
   ```bash
   tgcloud webhook sync
   ```
3. During local development, developers can run:
   ```bash
   npx @tgcloud/cli webhook sync
   ```

::: danger Webhook Invariant: Never Drop Pending Updates
Never append `--drop-pending` to `tgcloud webhook sync` in automated CI/CD workflows or agent runs. Doing so discards pending user transactions, file uploads, and callback queries without operator approval.
:::

---

## Platform Webhook Invariants

1. **Never Call Webhook API Methods in Code:**
   - The bot code must never call `api.setWebhook()`, `api.deleteWebhook()`, or `api.getUpdates()`.
   - The platform controls the webhook connection automatically. Calling these methods interferes with platform dispatching and causes runtime failures.
2. **Immediate Callback Query Acknowledgement:**
   - Every callback query event must call `api.answerCallbackQuery()` immediately, even before running complex database queries or sending follow-up messages. Late answers will cause Telegram to show a loading spinner timeout to the user.
3. **Idempotency & Retries:**
   - Telegram may occasionally redeliver an update if a network interruption occurs during transmission.
   - Core operations (download quota accounting, one-time bundle burns, batch commits) are designed to be idempotent and guarded by atomic database operations.
4. **Outgoing Request Throttling:**
   - The bot maintains at most **6** simultaneous outgoing requests at any given moment.
   - If Telegram returns a `429 Too Many Requests` (`BotApiError`), the bot reads `.parameters.retry_after` and gracefully pauses outgoing loops rather than causing further rate-limiting.
5. **Passive Force-Join Checks:**
   - Channel membership verification is performed purely through passive `getChatMember` calls (in waves of at most 6). The bot never modifies or generates invite links during verification, generating zero API mutations and eliminating HTTP 429 rate-limiting risks.
6. **Parallel Isolate Protection (Atomic CAS):**
   - Opportunistic maintenance triggered during incoming updates (`runOpportunisticMaintenance`) uses an Atomic Compare-And-Swap on `last_maint_at` in `system_config`. Only one isolate executes cleanup passes at a time, preventing duplicate background jobs across parallel isolates.
7. **60-Second In-Memory Micro-Cache:**
   - High-frequency configurations (`getConfig()`) and administrator roles (`getAdmins()`) are cached in memory for 60 seconds, eliminating redundant database lookups on every incoming webhook update.
