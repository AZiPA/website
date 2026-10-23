---
layout: home
title: FileStore Docs Hub
titleTemplate: Production Telegram FileStore Documentation

hero:
  name: FileStore Docs Hub
  text: Free Serverless Telegram FileStore Bots
  tagline: Production-grade, zero-cost architectures for Cloudflare Workers + D1 and Telegram Serverless (@tgcloud/bot).
  actions:
    - theme: brand
      text: Cloudflare Edition
      link: /cloudflare-filestore/architecture
    - theme: alt
      text: Telegram Serverless Edition
      link: /tgcloud-filestore/architecture
    - theme: alt
      text: فارسی
      link: /fa/

features:
  - title: Cloudflare Workers + D1 Edition
    details: Production serverless bot deployed to Cloudflare Workers and D1 SQL database. Zero operational cost, 96% fewer D1 writes with single-row bundles, and subrequest protection.
    link: /cloudflare-filestore/architecture
    linkText: Read Cloudflare Manual →
  - title: Telegram Serverless (@tgcloud/bot) Edition
    details: 100% native Telegram serverless bot with zero runtime npm dependencies. Runs entirely inside BotFather Serverless with built-in sdk/db and sdk/api.
    link: /tgcloud-filestore/architecture
    linkText: Read Serverless Manual →
---

## Multi-Project Documentation Portal

Welcome to the centralized documentation hub for the **Telegram FileStore Bot** ecosystem. Both editions share the exact same core philosophy: **100% Free Forever**, zero VPS hosting fees, and zero buffering of file bytes.

### Choose Your Deployment Architecture

```mermaid
flowchart TD
  User([Operator / Deployer]) --> Choice{Choose Platform}

  Choice -->|Cloudflare Workers| CF[telegram-filestore-bot\nCloudflare Workers + D1]
  Choice -->|Telegram Native| TG[telegram-filestore-tgcloud\nTelegram Serverless @tgcloud/bot]

  CF --> CFDocs["Cloudflare Manual\n(/cloudflare-filestore/)"]
  TG --> TGDocs["Serverless Manual\n(/tgcloud-filestore/)"]
```

- **[Cloudflare Workers Edition](/cloudflare-filestore/architecture):** Engineered for Cloudflare's global edge network and D1 SQLite database. Includes full automated GitHub Actions deployment via Wrangler.
- **[Telegram Serverless Edition](/tgcloud-filestore/architecture):** Engineered for Telegram's official `@tgcloud/bot` environment with zero runtime npm dependencies and built-in database DSL.
