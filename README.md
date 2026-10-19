# NDMU ICT-MIS Service Desk

The NDMU ICT-MIS Service Desk is a full-stack ticketing application for
submitting, triaging, resolving, and tracking technology support requests.

## Project structure

```text
api/             Express routes, controllers, and services
auth/            JWT authentication and authorization middleware
client/          React, Vite, and Tailwind user interface
db/              MySQL access and normalization utilities
scripts/         Database seeding and scheduled ticket maintenance
uploads/         Ticket attachments (not committed)
database.sql     Schema-only MySQL database export
```

## Requirements

- Node.js 18 or later
- MySQL 8 or later

## Local setup

1. Copy `.env.example` to `.env`.
2. Set the database connection and distinct JWT secrets in your local `.env`.
3. Install dependencies:

   ```bash
   npm install
   npm install --prefix client
   ```

4. Start the API and client:

   ```bash
   npm start
   npm run client
   ```

## Testing

Run the server-side automated suite before committing changes:

```bash
npm test
```

For Node's built-in coverage report, run:

```bash
npm run test:coverage
```

The suite protects authentication token separation, role middleware, ticket and
dashboard access boundaries, and upload validation. Add a regression test with
every authorization or business-rule fix.

The API runs at `http://localhost:5000` and the Vite client normally runs at
`http://localhost:5173`.

On the first run, open `/setup` to create the one initial administrator. The
setup endpoint is permanently unavailable after an account exists.

## Account and secret safety

- The first administrator is created only through `/setup`; no administrator
  credentials are bundled with the application.
- Keep `.env`, SMTP credentials, JWT secrets, database passwords, and OAuth
  secrets out of source control. The repository includes only `.env.example`
  placeholders.
- Requestor accounts require an `@ndmu.edu.ph` institutional email address.
  Guest ticket submission remains available without an account.

## Bulk user imports

User imports save valid accounts and skip rows with validation errors, existing
emails, or duplicate emails. Passwords and the password column are optional;
provided passwords must contain at least eight characters. The result shows
imported and skipped counts and automatically downloads an Excel error report
when rows are skipped. The report contains only skipped users, original workbook
row numbers, and every validation error; it can be corrected and imported again.
Passwords are left blank in the error report. A Download error report button is
also available if the automatic download is blocked.

## Google sign-in

The login page uses Google's official Google Identity Services button. Set
`GOOGLE_CLIENT_ID` in the server's private `.env` to a Web application client ID,
then restart Node/PM2. No client secret is needed for this sign-in flow.

In Google Cloud Console, add the public origin to **Authorized JavaScript
origins**. For `http://localhost/it-ticketing-system/`, use `http://localhost`
(without the path); for Vite development, also add `http://localhost:5173`.
Production origins must use HTTPS. Set `CLIENT_URL` to the full application URL,
including `/it-ticketing-system` when hosted under that path, so refresh cookies
use the correct path. `GOOGLE_ALLOWED_DOMAIN` defaults to `ndmu.edu.ph`.

The backend verifies Google's signature, audience, expiry, institutional email,
Workspace domain, and a browser-bound nonce before issuing an application
session. Roles come from the stored account. The login page shows an unavailable
message when no Google client ID is configured, and password/guest access stays
available.

See Google's [button documentation](https://developers.google.com/identity/gsi/web/guides/display-button)
and [client setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## Google Workspace ticket email notifications

Ticket notifications are disabled by default. To enable delivery through the
ICT-MIS Google Workspace mailbox, add these values to the server's local
`.env` file:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=mis@ndmu.edu.ph
SMTP_PASS=YOUR_GOOGLE_APP_PASSWORD
SMTP_FROM=mis@ndmu.edu.ph
```

Use a Google App Password generated for the mailbox after enabling 2-Step
Verification. Never use or document the mailbox's normal password. A Google
Workspace administrator may need to allow App Passwords or provide an approved
SMTP relay. Restart the API after changing `.env`.

The system emails requestors and assigned staff for ticket creation,
assignment, public replies, status changes, and resolution. Internal notes are
never sent by email.

## Key capabilities

- Guest and authenticated ticket submission
- JWT authentication with role-based server authorization
- Dynamic service catalog and ticket-specific fields
- Work queues, triage, assignments, resolution, SLA tracking, and history
- Requestor, technician, team, department, knowledge base, announcement, and
  system-settings administration
- XLSX exports and bulk import tools for supported administration modules
