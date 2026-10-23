---
title: Secrets & Security
description: Zero runtime secrets model, TGCLOUD_TOKEN CI/CD secret, and repository security boundaries.
---

# Secrets & Security

Security architecture and credentials guide for Telegram Serverless FileStore Bot.

---

## Zero Runtime Secrets Architecture

Unlike traditional bot deployments that require storing numerous sensitive credentials, this bot implements a **Zero Runtime Secrets** model:

1. **Native Bot API Authentication (`sdk/api`):**
   - The runtime micro-isolate is provisioned directly by the Telegram Serverless infrastructure.
   - The bot token is never exposed, logged, or managed in user code.
   - All API calls utilize virtual `'sdk/api'`, eliminating the risk of token leakage in stack traces or repository commits.
2. **Zero Database Credentials (`sdk/db`):**
   - The persistence layer is an embedded SQLite instance accessed via virtual `'sdk/db'`.
   - No database URLs, passwords, or connection strings exist.
3. **No Local Environment Files:**
   - No `.env`, `wrangler.toml`, or configuration files containing credentials exist in the codebase.

---

## CI/CD Deployment Secret: `TGCLOUD_TOKEN`

The only secret used across the entire project lifecycle is **`TGCLOUD_TOKEN`**, which is strictly for automated CI/CD deployments:

| Secret Name | Scope | Description |
|---|---|---|
| `TGCLOUD_TOKEN` | GitHub Actions | Telegram Serverless CLI access token used to authenticate `@tgcloud/cli` during deployment. |

### Registering `TGCLOUD_TOKEN` in GitHub

1. Generate your deployment access token through Telegram Serverless CLI or BotFather.
2. In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret**.
4. Set the name to `TGCLOUD_TOKEN` and paste your CLI token.
5. Save the secret.

---

## GitHub Actions Security & Fork Safety

The deployment workflow in `.github/workflows/deploy.yml` enforces strict security boundaries:

- **Minimal Secret Exposure:** `TGCLOUD_TOKEN` is exposed only to the specific CLI steps executing `tgcloud push`, `migrate`, and `webhook sync`.
- **No Dependency on Local Scripts:** CI runs pure CLI commands without invoking local utility scripts.
- **Pull Request Isolation:** Workflows triggered by `pull_request` receive no secrets. The dangerous `pull_request_target` trigger is strictly prohibited.
- **Zero-Config Forks:** Community forks remain fully functional without any setup; operators need only define their own `TGCLOUD_TOKEN` to deploy to their bot instance.

---

## Repository Invariants

- Never commit `.tgcloud/` directory (enforced via `.gitignore`).
- Never print, echo, or log `TGCLOUD_TOKEN` in CI logs or terminal output.
- Passcode hashes in the database use `v2` rotation-safe hashing (PBKDF2/SHA-256 with bundle-specific salt), ensuring raw PINs are never stored.
- Bounded memory eviction guards (`strikeMap` in `middlewares/rate_limiter.js`) enforce a 2,000-entry ceiling with automatic LRU and throttle pruning, eliminating in-memory denial-of-service and memory exhaustion vectors.
- In-memory 60-second TTL micro-cache for `getAdmins()` and `getConfig()` ensures role-based access checks execute safely with zero redundant database queries.
