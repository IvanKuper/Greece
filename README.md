# Greece Business Management Platform

A standalone business operating platform with the Greece marketing site, a secure management workspace, and a normalized SQLite data layer.

**Live demo:** https://greece-k88x.onrender.com (portfolio copy on a free server: the first load can take about a minute, and demo data resets when the server restarts). The real business site runs from a separate Postgres version at https://greece-07bq.onrender.com.

![Homepage](docs/home.png)

## Start

```bash
npm install
npm run dev
```

- Public website: http://localhost:3000
- Business platform: http://localhost:3000/crm
- API base: http://localhost:3000/api/v1

For a new database, set `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` (8+ characters in development, 12+ in production) in `.env` before the first start. The application never creates a production administrator with a known default password.

## Architecture

- `src/app.js` — application composition, security middleware, public endpoints, and compatibility layer
- `src/auth.js` — login, refresh sessions, password reset, 2FA, lockout, device sessions, permissions, and audit helpers
- `src/api.js` — versioned, paginated module APIs, reports, global search, dashboard, and exports
- `src/db.js` — SQLite connection, migrations, roles, and seed data
- `migrations/001_initial.sql` — normalized schema and performance indexes
- `public/crm.html`, `public/crm.js`, `public/crm.css` — responsive management workspace
- `public/index.html`, `public/assets/` — preserved marketing frontend
- `storage/greece.db` — local database, created automatically and excluded from source control

## Implemented business system

The public website and CRM now share centrally editable business settings. The initial company number, phone, address, and hours are generated placeholders; update them under **CRM → Business Settings** before launch.

- Customer 360: contacts, deals, projects, invoices, tasks, files, communications, and activity timeline
- Lead pipeline, scoring, stale-lead follow-up automation, calendar, reminders, and notification center
- Employee self-service, attendance, leave requests, payroll, approvals, and role-based access
- Finance dashboard, accounts, VAT fields, invoice PDF generation, CSV exports, and a six-sheet Excel workbook
- Secure file upload, version checksums, role-controlled downloads, local provider boundary, and audit history
- WhatsApp, accounting, payments, storage, and monitoring integration screens with safe sandbox/local defaults
- Passkeys/WebAuthn, TOTP 2FA, session revocation, lockout, security overview, and login history
- Health monitoring, error events, checksum-verified SQLite backups, Docker packaging, and CI tests
- Accessible keyboard focus, skip navigation, reduced-motion support, lazy images, compressed responses, and immutable asset caching

## Security

- bcrypt password hashing
- 15-minute access tokens and revocable, rotating-context refresh sessions
- HTTP-only, secure-ready, SameSite refresh cookies
- Account lock after repeated failed logins
- Login/device history and session revocation
- TOTP-compatible two-factor authentication endpoints
- Passkey/WebAuthn registration and sign-in
- One-time password-reset tokens
- Permission checks on every management module
- Role-based file download checks and file-version SHA-256 checksums
- Security headers, request size limits, rate limiting, parameterized SQL, input field allowlists
- Complete create/update/delete and administrative audit logging

Bearer access tokens are sent in headers, so state-changing management requests are not vulnerable to browser form CSRF. The refresh cookie is HTTP-only and SameSite Strict.

## Production environment

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=/absolute/persistent/path/greece.db
JWT_SECRET=a-long-random-secret
JWT_REFRESH_SECRET=a-separate-long-random-secret
PUBLIC_APP_URL=https://your-app.onrender.com
```

For email delivery and password reset support, also configure:

```bash
# Optional Resend email service. When set, Resend is used before SMTP.
RESEND_API_KEY=your-resend-api-key

SMTP_HOST=smtp.example.com
# Use port 587 with STARTTLS for Gmail and hosted environments.
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM="GREECE Website <no-reply@example.com>"
CONTACT_EMAIL=admin@example.com
```

For the AI account-summary button on the customer 360 view, also configure:

```bash
# Optional. Without this set, the "Summarize account" button shows a
# clear error instead of failing silently. Uses claude-haiku-4-5.
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Deploying (Render)

The live demo runs on Render (free plan) from the included `Dockerfile`.

1. New Web Service from this repository, runtime Docker.
2. Environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET` and `JWT_REFRESH_SECRET`: strong random values
   - `PUBLIC_APP_URL`: the service address, for example `https://your-app.onrender.com`
   - `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (12+ characters) for a new database
   - `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL` for contact-form email (the free plan blocks SMTP ports, so use Resend there)
   - `ANTHROPIC_API_KEY` if you want the AI "Summarize account" button
3. The free plan has no persistent disk, so the SQLite file starts empty after every restart. For real data attach a disk and set `DATABASE_PATH` (for example `/storage/greece.db`), or use the Postgres version.

The included `Procfile` (`NODE_ENV=production node server.js`) also works on hosts that use one.

When you want to review or undo changes, use Git. For example:

```bash
git log --oneline
# or revert a commit
git revert <commit-sha>
```

Terminate TLS at a reverse proxy or managed hosting platform. Passkeys require the same HTTPS origin/RP ID in production. For high write concurrency or multi-tenant deployment, the schema can be migrated to PostgreSQL without changing the REST contract.

Docker is ready for a single-server deployment:

```bash
docker compose up --build -d
```

Create an on-demand backup with `npm run backup`. For example, a daily cron job can run this command and copy `storage/backups/` to encrypted off-site storage. The built-in `/api/health` endpoint is used by the Docker health check.

## Contact and recruiting email

Both contact flows and job applications are persisted to the CRM. SMTP delivery sends an administrator notification to `CONTACT_EMAIL`; when an applicant or lead provides an email address, the system also sends a confirmation message. Copy `.env.example` to `.env` and add a Gmail App Password or another SMTP provider credential. Never use or commit the normal mailbox password.

PDF and Excel generation work locally. WhatsApp, accounting, and payment connections run in sandbox mode until you add real vendor credentials; no external charge or WhatsApp message is sent in sandbox mode.

## Tests

```bash
npm test
npm run test:e2e
npm run test:all
```

The API suite covers authentication, dashboards, Customer 360, modules, approvals, secure files, PDF/XLSX output, backups, and passkey option generation. The browser suite covers the complete four-step contact flow, recruiting submission, public routes, mobile rendering, and light/dark themes.
