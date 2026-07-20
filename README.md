# Greece Ltd Business Management Platform

A standalone business operating platform with the original GRIS marketing site, a secure management workspace, and a normalized SQLite data layer.

## Start

```bash
npm install
npm run dev
```

- Public website: http://localhost:3000
- Business platform: http://localhost:3000/crm
- API base: http://localhost:3000/api/v1

For a new database, set `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` (12+ characters) in `.env` before the first start. The application never creates a production administrator with a known default password.

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
```

## Deploying to Railway

Railway can host both the frontend and backend from this single Node.js app.

1. Create a new Railway project and connect this GitHub repository.
2. Set the environment variables in Railway:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_PATH` to the absolute path inside Railway persistent storage, for example `/storage/greece.db`
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random values
   - `PUBLIC_APP_URL` to your Railway app URL, for example `https://your-app.up.railway.app`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, and `CONTACT_EMAIL` if you want email notifications and password reset support
   - `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` before the first startup if the database is new
3. Attach Railway persistent storage and mount it at a path such as `/storage`, then point `DATABASE_PATH` to `/storage/greece.db`. This ensures the SQLite database survives restarts.
4. Railway will use the included `Procfile` to run `NODE_ENV=production node server.js`. The app also supports `npm run dev` locally.

Railway has generated a service domain for this deployment: `https://greece-website-production.up.railway.app`

If you prefer Docker deployment, Railway can build this repository from the included `Dockerfile`.

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
