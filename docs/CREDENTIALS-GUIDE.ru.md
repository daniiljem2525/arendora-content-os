# Инструкция: как получить API-ключи для всех платформ

Получаете ключи → вставляете в **Настройки** приложения (Settings → «Учётные данные интеграций») → статус карточки меняется на **«настроено (live)»** → включаете «Автопубликация». Всё.

Данные из формы шифруются и хранятся в базе, показываются только статусы, не значения.

---

## 1. X (Twitter) — самое простое, 10 минут

1. Зайдите на **developer.x.com** под своим аккаунтом X.
2. Войдите в портал разработчика (примите условия), выберите **Free** тариф.
3. Создайте **Project + App** (имя любое, например `arendora-content-os`).
4. В настройках App → **User authentication settings → Set up**:
   - App permissions: **Read and write** (важно! по умолчанию Read-only);
   - Type of App: Web App / Automated App.
   - Сохраните.
5. Вернитесь на вкладку **Keys and tokens** и сгенерируйте:
   - **API Key** (Consumer Key)
   - **API Key Secret** (Consumer Secret)
   - **Access Token** (нажмите Generate — он создаётся для вашего аккаунта)
   - **Access Token Secret**
6. Вставьте все 4 значения в Настройки → X (Twitter) API.

Бесплатный тариф: ~500–1500 постов в месяц (пишущие запросы), этого хватает на старт. Ключи не имеют срока действия, пока вы их не перегенерируете.

> Если после настройки публикация возвращает ошибку `403 Client is not allowed...` — вы не переключили App permissions на **Read and write** (пункт 4). После смены разрешений перегенерируйте Access Token.

---

## 2. Threads — через Meta for Developers, ~30 минут

Требование: аккаунт Threads в **профессиональном режиме** (в приложении Threads: Настройки → Switch to professional mode).

1. Зайдите на **developers.facebook.com/apps** → **Create App**.
2. Выберите сценарий **Threads API** (или Business, затем добавьте продукт Threads).
3. Слева в меню приложения откройте **Threads → API setup with Instagram login** (или Threads settings).
4. Добавьте тестировщика/пользователя и **подключите свой аккаунт Threads** через кнопку авторизации в настройках приложения.
5. Получите токен: на странице API setup нажмите **Generate Access Token** (согласитесь с разрешениями `threads_basic`, `threads_content_publish`). Появится короткоживущий токен — сразу обменяйте на долгоживущий:
   ```
   GET https://graph.threads.net/access_token
     ?grant_type=th_exchange_token
     &client_secret=<APP_SECRET из настроек приложения>
     &access_token=<короткий токен>
   ```
   Ответ содержит `access_token` на ~60 дней.
6. Узнайте свой ID: откройте в браузере
   ```
   https://graph.threads.net/v1.0/me?fields=id&access_token=<долгий токен>
   ```
7. Вставьте **Access token** и **User ID** в Настройки → Threads API.

Токен живёт ~60 дней — продлевается повторным обменом (приложение напомнит в отчётах, если публикация начнёт падать).

> Пока приложение Meta в режиме Development, публиковать может только ваш тестовый аккаунт — для старта этого достаточно. Публичный режим (App Review) нужен только для чужих аккаунтов.

---

## 3. Instagram (Reels и карусели) — ~30 минут

Требования: Instagram-аккаунт типа **Business или Creator**, привязанный к **Facebook-странице** (в Instagram: Настройки → Business tools → Connect a Facebook Page).

1. **developers.facebook.com/apps** → **Create App** → тип **Business**.
2. Добавьте продукт **Instagram Graph API**.
3. В **Graph API Explorer** (developers.facebook.com/tools/explorer):
   - выберите своё приложение;
   - добавьте разрешения: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`, `pages_read_engagement`;
   - нажмите **Generate Access Token**, авторизуйтесь.
4. Получите ID бизнес-аккаунта — откройте в браузере:
   ```
   https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=<токен>
   ```
   В ответе будет `instagram_business_account.id`.
5. Продлите токен до 60 дней:
   ```
   GET https://graph.facebook.com/v21.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id=<App ID>
     &client_secret=<App Secret>
     &fb_exchange_token=<короткий токен>
   ```
6. Вставьте **Access token** (долгоживущий) и **Account ID** в Настройки → Instagram / Meta API.

Важно: наша публикация Reels требует **публичный URL видео** (требование Meta). Пока видео не хостится где-то по ссылке, Reel-публикация вернёт ошибку; карусели/посты — аналогично. Это следующий шаг интеграции (подключение файлового хранилища), тексты и подписи для вставки вручную доступны всегда.

---

## 4. TikTok — самый долгий путь (одобрение занимает дни)

1. **developers.tiktok.com** → Login → **Manage apps → Connect an app**.
2. Создайте приложение, добавьте продукт **Content Posting API**, разрешение `video.publish`.
3. Заполните описание и пройдите **аудит TikTok** (занимает от нескольких дней). До одобрения можно работать в **Sandbox** (у приложения будет sandbox-токен — публикация видна только вам).
4. После одобрения получите **Access token** (OAuth-авторизация вашего аккаунта) и вставьте в Настройки → TikTok API.
5. Ограничение: TikTok Content Posting API принимает видео по **публичному URL** (`PULL_FROM_URL`) — как и с Instagram, нужно файловое хранилище. Рекомендую начать с X и Threads, TikTok подключать после одобрения приложения.

---

## 5. Telegram — 5 минут, сделайте первым для проверки системы

1. В Telegram откройте **@BotFather** → команда `/newbot` → задайте имя → получите **Bot token** (`123456:ABC-...`).
2. Напишите вашему новому боту любое сообщение в чат.
3. Узнайте **Chat ID**: откройте в браузере
   ```
   https://api.telegram.org/bot<ТОКЕН>/getUpdates
   ```
   В ответе найдите `"chat":{"id":123456789}`.
4. Вставьте **Bot token** и **Chat ID** в Настройки → Telegram.

Проверка: нажмите «Run» у workflow `weekly_report` на странице AI Agents — сообщение придёт в чат.

---

## 6. LLM (необязательно — встроенный движок работает без него)

Подойдёт любой OpenAI-совместимый провайдер: OpenAI, OpenRouter, Groq,Together и др.

1. Зарегистрируйтесь у провайдера → раздел API Keys → создайте ключ.
2. В Настройки → LLM вставьте:
   - **API-ключ**;
   - **Base URL** (например `https://api.openai.com/v1` или `https://openrouter.ai/api/v1`);
   - **Модель** (например `gpt-4o-mini`).
3. Бейдж карточки станет «настроено (live)», и все агенты начнут генерировать через вашу модель.

---

## 7. Веб-поиск (необязательно, для Research Agent)

Самый простой — **Tavily** (tavily.com, бесплатный тариф ~1000 запросов/мес): зарегистрируйтесь → API Keys → скопируйте ключ → Настройки → Веб-поиск → Tavily API-ключ.

Альтернативы: Brave (brave.com/search/api) или Serper (serper.dev) — любое одно поле.

---

## 8. Google Search Console и GA4 (продвинутый уровень, можно отложить)

Для этих двух нужен OAuth-токен Google. Коротко:

1. **console.cloud.google.com** → создайте проект → включите **Search Console API** и **Google Analytics Data API**.
2. **OAuth consent screen** → External → добавьте свой email как тестового пользователя.
3. **Credentials → OAuth client ID** → тип Web application.
4. Откройте **developers.google.com/oauthplayground** (шестерёнка → Use your own credentials → введите Client ID/Secret), авторизуйтесь со scope:
   - `https://www.googleapis.com/auth/webmasters.readonly` (для GSC);
   - `https://www.googleapis.com/auth/analytics.readonly` (для GA4).
5. Скопируйте **access token** и вставьте в Настройки → Google Search Console (плюс Property URL, например `sc-domain:arendora.ru`) / GA4 (Property ID + service account, если используете его вместо playground).

Нюанс: access token Google живёт ~1 час. Для постоянной работыGA4 лучше service account (поля Client email + Private key) — он не истекает. Если хотите, добавлю поддержку refresh token, чтобы и GSC работал постоянно.

---

## После ввода ключей — порядок запуска

1. Настройки: у карточек появляется бейдж **«настроено (live)»**.
2. Идеи → сгенерируйте идеи → «Weekly strategy».
3. Согласуйте контент в «Approval Queue».
4. «Content Calendar» → «Schedule» → дата/время.
5. Автопубликация включена → в назначенное время пост уйдёт сам.
6. Раз в день запускается сбор метрик (или «Collect metrics» вручную), Learning Agent наращивает рекомендации.

Если публикация упала — смотрите «Publications»: там сохранена настоящая ошибка платформы, и уведомление придёт в Telegram, если он настроен.
