# Greece Ltd Business Management Platform

A standalone business operating platform with a source-owned multilingual GRIS marketing site, a secure management workspace, customer and employee portals, and a normalized SQLite data layer.

## Start

```bash
npm install
npm run dev
```

- Public website: http://localhost:3000
- Business platform: http://localhost:3000/crm
- API base: http://localhost:3000/api/v1

Demo administrator:

```text
admin@greece.co.il
Admin123!
```

Change this password before using real data.

## Architecture

- `src/app.js` — application composition, security middleware, public endpoints, and compatibility layer
- `src/auth.js` — login, refresh sessions, password reset, 2FA, lockout, device sessions, permissions, and audit helpers
- `src/api.js` — versioned, paginated module APIs, reports, global search, dashboard, and exports
- `src/db.js` — SQLite connection, migrations, roles, and seed data
- `migrations/001_initial.sql` through `003_growth_platform.sql` — normalized schemas and performance indexes
- `public/crm.html`, `public/crm.js`, `public/crm.css` — responsive management workspace
- `public/index.html`, `public/site.js`, `public/site.css` — source-owned multilingual marketing frontend
- `storage/greece.db` — local database, created automatically and excluded from source control

## Implemented business system

The public website and CRM now share centrally editable business settings. The initial company number, phone, address, and hours are generated placeholders; update them under **CRM → Business Settings** before launch.

- Customer 360: contacts, deals, projects, invoices, tasks, files, communications, and activity timeline
- Itemized quotations, secure public review, e-signature acceptance, contracts, renewals, and customer portal links
- Service desk, asset registry, field work orders, geolocated check-in/out, customer sign-off, shifts, and time tracking
- Inventory with audited stock movements and reorder alerts, communication templates, consent records, and workflow history
- Lead pipeline, scoring, stale-lead follow-up automation, calendar, reminders, and notification center
- Employee self-service, attendance, leave requests, payroll, approvals, and role-based access
- Finance dashboard, accounts, VAT fields, invoice PDF generation, CSV exports, and a six-sheet Excel workbook
- Secure file upload, version checksums, role-controlled downloads, local provider boundary, and audit history
- WhatsApp, accounting, payments, storage, and monitoring integration screens with safe sandbox/local defaults
- Passkeys/WebAuthn, TOTP 2FA, session revocation, lockout, security overview, and login history
- Business analytics, real-user Core Web Vitals, private database-grounded assistant, command palette, customizable dashboard, and mobile quick actions
- OpenTelemetry-ready tracing, health monitoring, error events, AES-256-GCM backups, restore integrity tests, hardened Docker packaging, and CI tests
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
- Strict public CSP, security/permissions headers, request size limits, form abuse protection, rate limiting, parameterized SQL, input field allowlists
- Access tokens kept in memory; persistent refresh credentials remain HTTP-only, SameSite Strict, and revocable
- Complete create/update/delete and administrative audit logging

Bearer access tokens are sent in headers, so state-changing management requests are not vulnerable to browser form CSRF. The refresh cookie is HTTP-only and SameSite Strict.

## Production environment

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=/absolute/persistent/path/greece.db
JWT_SECRET=a-long-random-secret
JWT_REFRESH_SECRET=a-separate-long-random-secret
BACKUP_ENCRYPTION_KEY=a-third-long-random-secret
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.example
```

Terminate TLS at a reverse proxy or managed hosting platform. Passkeys require the same HTTPS origin/RP ID in production. For high write concurrency or multi-tenant deployment, the schema can be migrated to PostgreSQL without changing the REST contract.

Docker is ready for a single-server deployment:

```bash
docker compose up --build -d
```

Create an on-demand backup with `npm run backup`. It creates the SQLite backup, verifies SHA-256, writes an AES-256-GCM offsite package, and opens the backup read-only to run SQLite integrity and row-count checks. Copy `storage/offsite/` to your separate storage provider. The built-in `/api/health` endpoint is used by the Docker health check.

## Contact and recruiting email

Both contact flows and job applications are persisted to the CRM. SMTP delivery sends an administrator notification to `CONTACT_EMAIL`; when an applicant or lead provides an email address, the system also sends a confirmation message. Copy `.env.example` to `.env` and add a Gmail App Password or another SMTP provider credential. Never use or commit the normal mailbox password.

PDF and Excel generation work locally. WhatsApp, accounting, and payment connections run in sandbox mode until you add real vendor credentials; no external charge or WhatsApp message is sent in sandbox mode.

## Tests

```bash
npm test
npm run test:e2e
npm run test:all
```

The API suite covers authentication, dashboards, Customer 360, approvals, secure files, PDF/XLSX output, backups, quotations/e-signatures, customer portals, analytics, the assistant, and passkey option generation. The browser suite covers contact and recruiting email paths, public routes, legacy hash repair, CRM workflows, accessibility, mobile rendering, and light/dark themes.
