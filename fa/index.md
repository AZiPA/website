---
layout: home
title: مرکز مستندات ربات‌های فایل‌استور
titleTemplate: راهنمای ربات‌های سرورلس فایل‌استور تلگرام

hero:
  name: مرکز مستندات فایل‌استور
  text: ربات‌های رایگان و سرورلس مدیریت فایل در تلگرام
  tagline: معماری‌های آماده استفاده با هزینه عملیاتی صفر بر بستر Cloudflare Workers و Telegram Serverless (@tgcloud/bot).
  actions:
    - theme: brand
      text: نسخه کلودفلر
      link: /fa/cloudflare-filestore/architecture
    - theme: alt
      text: نسخه سرورلس تلگرام
      link: /fa/tgcloud-filestore/architecture
    - theme: alt
      text: English
      link: /

features:
  - title: نسخه Cloudflare Workers + D1
    details: ربات حرفه‌ای مستقر بر کلودفلر ورکرز و پایگاه داده اس‌کیو‌ال D1 با هزینه صفر، کاهش ۹۶ درصدی نوشتن با مدل تک‌ردیفه و کنترل دقیق ساب‌ریکوئست‌ها.
    link: /fa/cloudflare-filestore/architecture
    linkText: مطالعه راهنمای کلودفلر ←
  - title: نسخه Telegram Serverless (@tgcloud/bot)
    details: اجرای ۱۰۰٪ بومی داخل بستر سرورلس تلگرام بدون هیچ پکیج npm خارجی و استفاده مستقیم از ماژول‌های رسمی sdk/db و sdk/api.
    link: /fa/tgcloud-filestore/architecture
    linkText: مطالعه راهنمای سرورلس تلگرام ←
---

## پرتال جامع مستندات فایل‌استور

به پایگاه مستندات یکپارچهٔ اکوسیستم **ربات‌های فایل‌استور تلگرام** خوش آمدید. هر دو نسخه از یک فلسفهٔ واحد پیروی می‌کنند: **۱۰۰٪ رایگان برای همیشه**، بدون نیاز به سرور اختصاصی و بدون عبور بایت‌های فایل از سرور.

### انتخاب بستر استقرار

```mermaid
flowchart TD
  User([اپراتور / توسعه‌دهنده]) --> Choice{انتخاب بستر}

  Choice -->|Cloudflare Workers| CF[telegram-filestore-bot\nCloudflare Workers + D1]
  Choice -->|Telegram Native| TG[telegram-filestore-tgcloud\nTelegram Serverless @tgcloud/bot]

  CF --> CFDocs["راهنمای کلودفلر\n(/fa/cloudflare-filestore/)"]
  TG --> TGDocs["راهنمای سرورلس\n(/fa/tgcloud-filestore/)"]
```

- **[راهنمای نسخه Cloudflare Workers](/fa/cloudflare-filestore/architecture):** طراحی‌شده برای لبه کلودفلر و پایگاه داده D1، همراه با پایپ‌لاین خودکار استقرار در GitHub Actions.
- **[راهنمای نسخه Telegram Serverless](/fa/tgcloud-filestore/architecture):** طراحی‌شده برای پلتفرم رسمی `@tgcloud/bot` تلگرام بدون هیچ وابستگی زمان اجرا و استفاده از دیتابیس درون‌برنامه‌ای.
