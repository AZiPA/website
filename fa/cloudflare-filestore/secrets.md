---
title: رازهای GitHub Actions
description: رازهای لازم و اختیاری. راز BOT_ID وجود ندارد.
---

# رازهای GitHub Actions

::: danger راز `BOT_ID` نسازید
شناسهٔ عددی هنگام اجرا از `BOT_TOKEN` با عبارت `/^(\d+):/` درمی‌آید. توکن را split نکنید و لاگ نکنید.
:::

مخزن → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

`BOT_ID` راز **نیست** و نباید ساخته شود. شناسهٔ عددی هنگام اجرا از `BOT_TOKEN` درمی‌آید.

### لازم

| راز | کار |
|---|---|
| `CLOUDFLARE_API_TOKEN` | دیپلوی رانگلر، D1، و تزریق راز. بخش ۲.۴. |
| `CLOUDFLARE_ACCOUNT_ID` | حسابی که Worker و D1 در آن هستند. |
| `BOT_TOKEN` | از BotFather. داخل Worker تزریق می‌شود. لاگ نشود. پیشوند شناسه محلی خوانده می‌شود؛ بقیهٔ توکن جدا ذخیره نمی‌شود. |
| `BOT_USERNAME` | بدون `@`. همراه شناسهٔ مشتق‌شده، `getMe` را در استارت سرد حذف می‌کند. ورک‌فلو با خالی بودنش fail نمی‌شود؛ با این حال بگذاریدش. |
| `OWNER_ID` | شناسهٔ عددی تلگرام مالک. هر دیپلوی در `admins` با `role = 'owner'` seed می‌شود. زمان اجرا هم همین شناسه را مالک می‌داند، حتی اگر ردیف نباشد. |
| `WEBHOOK_PATH` | بخش مسیر محرمانه، بدون اسلش اول. Worker فقط `POST /<WEBHOOK_PATH>` را می‌پذیرد. مسیر قابل‌حدس (`webhook`، `bot`) یعنی تنها چیزی که Worker را پنهان کرده قانون WAF است. رشتهٔ بلند و تصادفی بگذارید. |
| `WEBHOOK_SECRET` | به‌عنوان `secret_token` به تلگرام ارسال و با هدر `X-Telegram-Bot-Api-Secret-Token` تطبیق داده می‌شود. الزام قطعی (fail-closed): ورک‌فلو CI‏ (`.github/workflows/deploy.yml`) در صورت نبود راز یا کمتر از ۱۶ نویسه بودن متوقف می‌شود؛ Worker‏ (`src/index.ts`) در صورت تنظیم نشدن یا ناهماهنگی هدر، کد HTTP 403 برمی‌گرداند. |

فهرستی که جاب پیش از تأمین D1 روی خالی بودنش قطع می‌شود: `WEBHOOK_PATH`، `BOT_TOKEN`، `OWNER_ID`، `CLOUDFLARE_API_TOKEN`، `CLOUDFLARE_ACCOUNT_ID`، و `WEBHOOK_SECRET` (در صورت نبود یا کمتر از ۱۶ نویسه بودن fail-closed می‌شود؛ Worker در صورت تنظیم نبودن یا عدم تطابق HTTP 403 می‌دهد). `BOT_USERNAME` برای مقداردهی اولیهٔ ایستای ربات همچنان لازم است.

### اختیاری

| راز | کار |
|---|---|
| `STORAGE_CHANNEL_ID` | شناسهٔ عددی کانالی که ربات در آن ادمین است (معمولاً `-100...`). هنگام آپلود هر فایل را با `copyMessage` آنجا کپی می‌کند و `storage_message_id` را نگه می‌دارد. تحویل بعداً `copyMessages` انبوه از همان کانال است. اگر راز نباشد، تحویل هر قلم را با `file_id` و یکی‌یکی می‌فرستد. در هیچ‌کدام از دو حالت بایت فایل از Worker رد نمی‌شود. |
| `LOG_CHANNEL_ID` | کانال پیش‌فرض اختیاری لاگ تلگرام (`-100…`). فقط زمانی استفاده می‌شود که `system_config.log_channel_id` خالی باشد. نبود راز + ردیف خالی D1 = لاگ تلگرام خاموش (بدون فراخوانی Bot API برای لاگ، بدون نوشتن لاگ، هیچ پیامی به `OWNER_ID` فرستاده نمی‌شود). دستور `/setlogchannel off` مقدار `off` را ذخیره کرده و بر این راز اولویت دارد. دستور `/setlogchannel owner` لاگ‌ها را به چت خصوصی مالک هدایت می‌کند. بازنشانی کارخانه تنها مسیری است که در صورت حل نشدن مقصد لاگ، به `OWNER_ID` بازمی‌گردد. |
| `BOT_FIRST_NAME` | نام نمایشی اختیاری که داخل `botInfo` ایستا می‌نشیند. اگر نباشد، نام استارت سرد `File Store Bot` از `DEFAULT_BOT_INFO` است. لازم نیست. ورک‌فلو فقط وقتی غیرخالی باشد تزریقش می‌کند. |

راز اختیاری خالی وارد `wrangler secret bulk` نمی‌شود و به‌صورت مقدار تهی push نمی‌شود.

رازهای زمان اجرای Worker فقط این‌ها هستند: `BOT_TOKEN`، `BOT_USERNAME`، `BOT_FIRST_NAME`، `WEBHOOK_PATH`، `WEBHOOK_SECRET`، `OWNER_ID`، `STORAGE_CHANNEL_ID`، `LOG_CHANNEL_ID`. `CLOUDFLARE_API_TOKEN` و `CLOUDFLARE_ACCOUNT_ID` روی گیت‌هاب می‌مانند.

---
