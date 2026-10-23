---
title: وب‌هوک و سخت‌سازی لبه
description: وب‌هوک را با max_connections برابر ۸ ثبت کنید، workers.dev را خاموش نگه دارید، و IP غیرتلگرام را روی زون ببندید.
---

# وب‌هوک و سخت‌سازی لبه

::: danger تلگرام را به workers.dev وصل نکنید
آن نام میزبان عمومی است و داخل زون شما نیست. قانون Security اصلاً نمی‌بیندش. اسکنرها بعد از تصورتان که جابه‌جا شده‌اید همان URL را نگه می‌دارند.
:::

حداقل یک‌بار Worker را دیپلوی کنید تا دامنه جواب بدهد، بعد وب‌هوک را ثبت کنید. تلگرام باید این نشانی را صدا بزند:

```text
https://<YOUR_DOMAIN>/<WEBHOOK_PATH>
```

`<YOUR_DOMAIN>` دامنهٔ اختصاصی بخش ۵ است، نه `*.workers.dev`. `<WEBHOOK_PATH>` همان مقدار محرمانه است، بدون اسلش اضافه.

`max_connections` تعداد آپدیتی است که تلگرام همزمان هل می‌دهد. پیش‌فرض ۴۰ است. این ربات **۸** می‌گذارد: بودجهٔ روزانه ۱۰۰٬۰۰۰ درخواست است و cron از همین حالا ۱۴۴۰ تا را مصرف می‌کند. یک لینک عمیق وایرال با پیش‌فرض ۴۰ می‌تواند سهمیه را در یک بعدازظهر خالی کند. هشت اتصال برای یک ربات عمومی کوچک کافی است و نمی‌گذارد سیل، کل روز را در یک ساعت صف کند.

`allowed_updates` فقط `message` و `callback_query` است. ربات inline query، پست کانال، و نتیجهٔ نظرسنجی را هندل نمی‌کند. نوع اضافه باز هم Worker را بیدار می‌کند.

curl را ترجیح بدهید تا توکن در تاریخچهٔ مرورگر نماند. متغیرها را محلی عوض کنید. دستور را با مقدار واقعی commit نکنید.

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://<YOUR_DOMAIN>/${WEBHOOK_PATH}" \
  --data-urlencode "secret_token=${WEBHOOK_SECRET}" \
  -d "max_connections=8" \
  --data-urlencode 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
```

همان فراخوانی در مرورگر (توکن در تاریخچه می‌ماند؛ روی دستگاه مشترک استفاده نکنید):

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/<WEBHOOK_PATH>&secret_token=<WEBHOOK_SECRET>&max_connections=8&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D&drop_pending_updates=true
```

پاسخ درست شامل `"ok": true` و `"description": "Webhook was set"` است.

### بررسی

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

```text
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

این‌ها را چک کنید:

- `url` برابر `https://<YOUR_DOMAIN>/<WEBHOOK_PATH>` باشد
- `has_custom_certificate` برابر false باشد (گواهی لبهٔ کلودفلر عمومی و معتبر است)
- بعد از یک `/start` آزمایشی، `pending_update_count` صفر باشد یا رو به کاهش
- `max_connections` برابر ۸ باشد
- `allowed_updates` برابر `["message","callback_query"]` باشد
- `last_error_message` خالی باشد. ۴۰۳ اینجا یعنی `WEBHOOK_SECRET` با `secret_token` یکی نیست. ۴۰۴ یعنی مسیر با `WEBHOOK_PATH` یکی نیست.

آزمایش دود از ماشینی که تلگرام نیست (اگر هدر راز غلط باشد انتظار **۴۰۳**، اگر مسیر غلط باشد **۴۰۴**):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://<YOUR_DOMAIN>/<WEBHOOK_PATH>"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://<YOUR_DOMAIN>/<WEBHOOK_PATH>" \
  -H "X-Telegram-Bot-Api-Secret-Token: wrong"
```

وقتی `WEBHOOK_SECRET` تنظیم شده باشد هر دو باید `403` باشند (نبودن هدر و غلط بودن هدر یک بررسی است). مسیر اشتباه باید `404` باشد. بعد به ربات `/start` بفرستید و در `getWebhookInfo` تحویل موفق تازه را ببینید.

### خالی کردن صف (`drop_pending_updates`)

وقتی `pending_update_count` بزرگ است، بعد از دیپلوی خراب، یا وقتی کلودفلر **خطای ۱۰۲۷** را شروع کرده از این استفاده کنید. خود آن retryها درخواست‌اند و اگر ساعت ۰۰:۰۰ UTC هنوز در صف باشند سهمیهٔ روز بعد را می‌خورند. Worker خطای ۱۰۲۷ را نمی‌بیند و خودش نمی‌تواند صف را بریزد.

همان URL را دوباره ثبت کنید و صف را بریزید:

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://<YOUR_DOMAIN>/${WEBHOOK_PATH}" \
  --data-urlencode "secret_token=${WEBHOOK_SECRET}" \
  -d "max_connections=8" \
  --data-urlencode 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
```

برای قطع کامل تحویل تا بازنشانی سهمیه:

```bash
curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" \
  -d "drop_pending_updates=true"
```

بعد از ۰۰:۰۰ UTC دوباره `setWebhook` بزنید. با `getWebhookInfo` مطمئن شوید `pending_update_count` صفر است.

---

## دامنهٔ اختصاصی و سخت‌سازی WAF

### چرا نام `workers.dev` باید حذف شود

Worker تازه روی `<name>.<account-subdomain>.workers.dev` منتشر می‌شود. این نام عمومی است، پشت WAF زون شما نیست، و هر اسکنری که پیدایش کند از سهمیهٔ ۱۰۰٬۰۰۰ درخواست روزانه خرج می‌کند. حتی HTTP 404 خود Worker هم یک درخواست حساب می‌شود. خطای ۱۰۲۷ تازه وقتی می‌آید که سهمیه تمام شده.

دامنهٔ اختصاصی روی زونی که مال خودتان است اجازه می‌دهد ترافیک غیرتلگرام **قبل** از اجرای Worker قطع شود. درخواست بلاک‌شدهٔ WAF اصلاً فراخوانی Worker نیست و از سهمیهٔ روزانه کم نمی‌کند. تیک cron و آپدیت واقعی تلگرام هنوز حساب می‌شوند.

### هر دیپلوی GitHub Actions باید همین انتخاب را نگه دارد

`wrangler.toml` فعلی `workers_dev` را تنظیم **نکرده** و route هم ندارد. پیش‌فرض رانگلر وقتی فایل route نداشته باشد `workers_dev = true` است. `npx wrangler deploy` بعدی از Actions، اگر فقط در داشبورد خاموشش کرده باشید، `*.workers.dev` را دوباره روشن می‌کند.

قاعدهٔ route برعکس است: **routeهای داشبورد در دیپلوی بعد با هرچه در فایل زیر `routes` باشد عوض می‌شوند.** دامنهٔ اختصاصی که فقط در داشبورد باشد ممکن است با دیپلویی که اسمش را نبرده حذف شود. فایلی که `workers_dev = false` دارد و کلید `routes` ندارد، route داشبورد را دست نمی‌زند. فایلی که `routes` دارد منبع حقیقت می‌شود.

فایل را منبع حقیقت کنید تا دیپلوی نتواند `workers.dev` را روشن کند یا نام میزبان را بیندازد. هر دو را با نام واقعی commit کنید:

```toml
# در هر دیپلوی، مسیر عمومی workers.dev را خاموش کن.
workers_dev = false

# در هر دیپلوی دامنهٔ اختصاصی را دوباره وصل کن. فقط نام میزبان؛
# مسیر محرمانه WEBHOOK_PATH است و جزو این route نیست.
routes = [
  { pattern = "bot.example.com", custom_domain = true }
]
```

::: warning جایگاه قرارگیری در فایل TOML
در نحو TOML، هر کلیدی که پس از سرآیند یک جدول قرار گیرد، متعلق به آن جدول محسوب می‌شود. مقادیر `workers_dev = false` و `routes = [...]` **باید** در سطح ریشه (top level) فایل `wrangler.toml` و **قبل از** اولین سرآیند جدول `[[d1_databases]]` یا `[[analytics_engine_datasets]]` (مثلاً درست زیر `compatibility_flags`) قرار بگیرند. در صورت قرار گرفتن در انتهای فایل، TOML آن‌ها را به آرایهٔ جداول قبلی نسبت داده و Wrangler آن‌ها را نادیده گرفته یا با خطا متوقف خواهد شد.
:::

`bot.example.com` را با نام میزبانی عوض کنید که زونش روی **همین** حساب کلودفلر فعال است. placeholder را دیپلوی نکنید.

بعد:

1. مطمئن شوید توکن روی آن زون **Workers Routes → Write** دارد (قالب دارد؛ زون را محدود کنید).
2. به `main` پوش کنید، یا ورک‌فلو را اجرا کنید.
3. رانگلر نام میزبان، رکورد DNS پروکسی‌شده، و گواهی را می‌سازد. اگر API از DNS شکایت کرد، **DNS → Write** را روی همان زون اضافه کنید و دوباره اجرا کنید. گواهی را خودتان مدیریت نمی‌کنید.
4. داشبورد → **Workers & Pages** → `telegram-filestore-bot` → **Settings** → **Domains & Routes**.
   - دامنهٔ اختصاصی: نام میزبان شما، وضعیت active.
   - `workers.dev`: **Disabled**.
5. وب‌هوک را روی `https://bot.example.com/<WEBHOOK_PATH>` ثبت کنید، آن هم بعد از فعال شدن گواهی.

**بعد از هر دیپلوی بعدی همین صفحه را نگاه کنید.** با بودن این قطعه در مخزن، هر اجرای Actions دوباره `workers_dev = false` و همان دامنه را می‌نویسد؛ پس داشبورد باید workers.dev را خاموش و دامنه را حاضر نشان بدهد. اگر کسی `workers_dev = false` را بردارد یا ورودی `routes` را پاک کند، دیپلوی بعدی نام عمومی را برمی‌گرداند یا دامنه را می‌اندازد. اگر نام میزبان دومی را فقط در داشبورد اضافه کنید، دیپلوی بعدی حذفش می‌کند، چون در فایل نیست.

تا وقتی DNS حاضر نشده تلگرام را موقتاً به `workers.dev` وصل نکنید. اسکنرها بعد از تصورتان که جابه‌جا شده‌اید همان URL را نگه می‌دارند.

`wrangler dev` محلی تحت تأثیر نیست. `workers_dev = false` فقط route دیپلوی‌شده را عوض می‌کند.

### قانون امنیتی: فقط بازه‌های IPv4 تلگرام

زون (خود دامنه) را باز کنید، نه نمای کلی Workers. در داشبورد فعلی آیتم **Security → WAF → Custom rules** وجود ندارد. مسیر این است:

**انتخاب دامنه → Security → Security rules → Create rule → Custom rules.**

- نام: `telegram-webhook-only`
- عمل: **Block**
- Deploy / Save.

دو عبارت معتبرند. هر دو از بازه‌های IPv4 وب‌هوک Bot API استفاده می‌کنند: `149.154.160.0/20` و `91.108.4.0/22`. قانون را بالاتر از هر قانون Skip بگذارید که این نام میزبان را مستثنی کند.

**گزینهٔ الف — فقط روی مسیر وب‌هوک، کلاینت غیرتلگرام را ببند.** بقیهٔ مسیرهای همین زون باز می‌مانند، پس سایت عادی روی این دامنه قفل نمی‌شود. مسیر را با `WEBHOOK_PATH` واقعی عوض کنید، همراه اسلش اول:

```text
(http.request.uri.path eq "/REPLACE_WITH_WEBHOOK_PATH" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
```

اثرش: درخواستی که مسیرش دقیقاً مسیر وب‌هوک است و IP مبدأش بیرون این بازه‌هاست، لبه‌ای بلاک می‌شود. Worker صدا زده نمی‌شود. آن درخواست از ۱۰۰٬۰۰۰ تای روزانه کم نمی‌کند. تماس وب‌هوک تلگرام با فهرست IP جور است و عبور می‌کند. Worker هنوز هدر `X-Telegram-Bot-Api-Secret-Token` را چک می‌کند. اسکنری که `/` یا مسیر دیگری را بزند با این گزینه بسته نمی‌شود.

**گزینهٔ ب — هر درخواست به نام میزبان ربات را ببند، مگر IP متعلق به تلگرام باشد.** وقتی این نام میزبان فقط ربات را سرو می‌کند و می‌خواهید مسیرهای تصادفی هم بسته شوند، نه فقط مسیر محرمانه، از این استفاده کنید. نام میزبان را عوض کنید:

```text
(http.host eq "bot.example.com" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
```

عمل همان **Block** است. هر چیزی به آن زیردامنه از بیرون `ip.src in {149.154.160.0/20 91.108.4.0/22}` هرگز به Worker نمی‌رسد. گزینهٔ ب را روی نام میزبانی که از مرورگر هم سایتش را باز می‌کنید نگذارید. برای ترکیب هر دو (فقط میزبان ربات و فقط مسیر وب‌هوک):

```text
(http.host eq "bot.example.com" and http.request.uri.path eq "/REPLACE_WITH_WEBHOOK_PATH" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
```

این قانون برای `*.workers.dev` هیچ کاری نمی‌کند. آن نام میزبان داخل زون شما نیست، پس **Security rules** اصلاً نمی‌بیندش. برای همین این بخش route مربوط به workers.dev را در `wrangler.toml` خاموش می‌کند.

بعد از ذخیره، curl از لپ‌تاپ خودتان به مسیر واقعی باید صفحهٔ بلاک کلودفلر را بدهد (یا ۴۰۳ قانون لبه)، نه ۴۰۳ داخل Worker. `getWebhookInfo` باید همچنان تحویل موفق نشان بدهد، چون IP تلگرام در استثنا هست.

اگر بعداً تغییر شبکهٔ تلگرام `last_error_message` را با تایم‌اوت یا بلاک کلودفلر پر کرد، پیش از باز کردن قانون به `0.0.0.0/0` بازه‌های رسمی وب‌هوک تلگرام را دوباره چک کنید.

---
