# msb-backend

The API behind My Story Bank. It serves the website ([msb-frontend](../msb-frontend)) and the admin panel ([msb-admin](../msb-admin)): stories and categories, the AI story generator, customer accounts, and admin management.

Built with Express 5, Sequelize 6 on MariaDB or MySQL, and OpenAI for story generation.

## Requirements

- Node.js 24 (`engines`); 22.12 or newer also works
- MariaDB 10.11 or MySQL 8 or newer

## Setup

```sh
npm ci
cp .env.example .env    # then fill it in
npm run dev
```

`.env.example` documents every setting. The server refuses to start if a required one is missing or invalid. The ones to set first:

| Setting | Notes |
| --- | --- |
| `JWT_SECRET`, `ADMIN_JWT_SECRET` | Sign user and admin tokens. At least 32 characters each, and different from each other: `openssl rand -hex 32` |
| `CENTRAL_MYSQL_*` | Database connection |
| `OPENAI_KEY` | Required. `OPENAI_MODEL` is optional and defaults to `gpt-4o` |
| `SMTP_*`, `EMAIL_FROM` | Sending account details and password-reset codes |
| `ACCESSDOMAINS` | Comma-separated origins allowed to call the API, such as the website and the admin panel |
| `STORAGE_DIR` | Where uploads go. It needs `images` and `videos` folders |
| `TRIAL_DAYS` | Length of the free trial, default 3 |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API and restarts it on changes |
| `npm start` / `npm run staging` | Runs it under PM2 with the production or staging config |
| `npm test` | Runs the end-to-end suites against the real app on an in-memory SQLite database, with email and OpenAI stubbed. It needs no database, mail server or `.env` |
| `npm run lint` | ESLint, with the config in `eslint.config.js` |
| `npm run db:utf8mb4` | Reports tables not yet in utf8mb4. Add `-- --apply` to convert them, checking each table's rows and text before and after |
| `npm run recount:counts` | Reports stories whose stored like or comment count is wrong. Add `-- --apply` to correct them; view counts are left alone |
| `npm run sanitize:html` | Reports stored story and home-page HTML that has something unsafe to remove. Add `-- --apply` to clean it |

## Who can do what

- **Signed out:** only the website's landing page. Story lists, search and story pages answer 401.
- **Trial:** every account starts here. Admins create all accounts; there's no self sign-up. For `TRIAL_DAYS` after creation, the account reads every story and can save AI stories.
- **Free:** after the trial the account becomes free automatically. It reads free stories (type `UNPAID`) and can generate AI stories, but not save them. Stories saved during the trial stay readable.
- **Paid:** payment happens outside the platform, so an admin marks the customer as paid (`payment_status: SUBSCRIBED`) at any time. Paid accounts read everything and save AI stories.
- A story the reader can't open still appears in lists, with `is_locked: true` and a short teaser instead of its text. Likes, comments and views on it are refused.
- **Admins** manage stories, categories, home-page content and AI stories. Admins with the `ADMIN` role can also manage admins, roles and customers.

Login and `GET /api/v1/user/profile` return `access`: `plan`, `trial_ends_at`, `can_read_paid_stories` and `can_save_stories`.

## API conventions

- Routes live under `/api/v1`, and `GET /api/healthcheck` reports health.
- Users and admins both send their token in `x-access-token`. Admin tokens are signed with `ADMIN_JWT_SECRET` and can't be used as user tokens.
- A 401 means not signed in or an invalid token; a 403 means signed in but not allowed.
- Errors come back as `{ "success": false, "status": 400, "message": "..." }`.
- Uploads happen after authentication. Images must be JPEG, PNG, GIF or WebP, and videos MP4, WebM or MOV, up to 100 MB each.
- Lists that can grow take `?limit=&page=`, and then answer `{ count, rows }`.
- Rich text is sanitized on save to what the admin panel's editor produces.

## Layout

```
app.js, index.js     Express app, and the server with graceful shutdown
src/config/          Settings, database, logger, uploads
src/routes/v1/       Routes, with the access each one needs
src/middlewares/     Authentication, roles and rate limits
src/controllers/     Request handling
src/services/        Business logic
src/models/          Sequelize models
src/utils/, helpers/ Access rules, HTML sanitizing, shared helpers
scripts/             One-off maintenance: HTML clean-up, count recount, utf8mb4 conversion
test/                End-to-end suites (npm test)
```

## Database notes

- There's no migrations framework. One-off changes ship as scripts in `scripts/`. Each reads the live database, reports first, and changes nothing without `--apply`; none deletes rows.
- In the September 2026 copy every table is `latin1`, so text with emoji fails to save. `npm run db:utf8mb4` fixes that; see below.
- The tables `contactus`, `departments`, `faqs` and `payments` belong to removed features and are no longer used. Nothing drops them.

### Upgrading a live database

Run these on the server, from this folder, with the app's `.env` in place. They work on whatever data is there now, including anything added after a backup or dump.

```sh
# 1. Back up everything. Nothing below deletes data, but keep a copy.
mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 \
  -u <user> -p <database> > msb-backup-$(date +%F).sql

# 2. Stop the app for the conversion (seconds), so no write lands mid-check.
pm2 stop msb-backend

# 3. Convert to utf8mb4. The first run only lists the tables; the second converts them,
#    and checks each table's row count and text before and after. It stops if anything differs.
npm run db:utf8mb4
npm run db:utf8mb4 -- --apply

# 4. Start the new code.
pm2 restart msb-backend

# 5. Correct stored like and comment counts. View counts are left as they are.
npm run recount:counts
npm run recount:counts -- --apply

# 6. Check stored HTML. Use --apply only if this lists rows.
npm run sanitize:html
```
