# Digital Blood Donation and Emergency Blood Availability Management Portal

A role based emergency blood request and donor coordination portal for Bannari Amman Institute of Technology. The application uses React/Vite, Express, and MongoDB.

## Run locally

Prerequisites: Node.js 18+ and MongoDB running locally or an Atlas connection string.

```powershell
npm run install:all
Copy-Item .env.example server/.env
# Edit server/.env and set secure values and any integrations you will use.
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API health endpoint is [http://localhost:5000/api/health](http://localhost:5000/api/health). Alternatively run `npm run dev:server` and `npm run dev:client` in separate terminals.

## Authentication setup

- Student sign-in uses Google Workspace only. Google verifies the account and the server accepts only the exact `@bitsathy.ac.in` domain.
- Set the same Google OAuth Web Client ID as `GOOGLE_CLIENT_ID` in `server/.env` and `VITE_GOOGLE_CLIENT_ID` in `client/.env`. Add the local app origin (`http://localhost:5173`) and your deployed portal origin to the OAuth client's authorized JavaScript origins.
- Public student registration is not available on the Google-only sign-in screen. New BIT Google accounts are created on their first successful sign-in and can then complete their student profile.
- Admin and coordinator access has no public registration. Add each exact `@bitsathy.ac.in` address to `INITIAL_ADMIN_EMAILS` or `INITIAL_COORDINATOR_EMAILS` in `server/.env`. From `server`, run `npm run provision:admin -- --email <allowlisted-admin-email>` and then `npm run set:admin-password -- --email <allowlisted-admin-email>`; for a coordinator, run `npm run provision:coordinator -- --email <allowlisted-coordinator-email>`. These privileged roles continue to use their provisioned email and password. Protect the environment file and use a long random `JWT_SECRET`.

## Browser push setup

Web push is optional and uses standard VAPID keys, not Firebase. Generate a pair with:

```powershell
npx web-push generate-vapid-keys
```

Set `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_SUBJECT` in `server/.env`. Set the matching public key as `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` for the client and restart both processes. Users must opt in and grant browser permission. Push delivery depends on browser/service worker support and configured keys; in-app alerts are persisted in MongoDB independently.

## Build and checks

```powershell
npm run build:server
npm run build:client
npm run test:server
```

## Data and privacy

MongoDB stores profiles, emergency requests, donor responses, audit events, and notifications. Donor phone numbers are not shown in general alerts or the donor directory. Requesters receive a donor's number only when that donor explicitly consented to direct contact. Alert messages contain the request code, blood group, urgency, and broad area; patient identity stays within authorized request workflows. All users must confirm blood compatibility and donation eligibility with medical professionals.

Google Form import and synchronization remain separate from Google sign-in; imported profiles do not gain a Google identity until the student signs in with their college account.
