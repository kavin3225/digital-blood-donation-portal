# Deployment & Production Verification Checklist
## BIT Digital Blood Donation & Emergency Availability Management Portal

---

### Pre-Deployment Security Audit

- [x] **Strict College Domain Enforcement**:
  - `verifyGoogleIdToken` verifies `hd === 'bitsathy.ac.in'` and `email.endsWith('@bitsathy.ac.in')`.
  - Personal `@gmail.com` accounts rejected with HTTP 403 Forbidden.
- [x] **Registration Barrier**:
  - Unregistered Google accounts blocked from student APIs and guided to the official Google Form.
- [x] **Google Apps Script Webhook Security**:
  - HMAC-SHA256 signature verification in constant time.
  - Replay defense with 5-minute clock skew window.
  - Conflicting register number detection flags suspicious accounts for administrative review.
- [x] **Field Ownership Protection**:
  - Reprocessing older Google Form submissions preserves newer portal profile edits and administrative blocks.
- [x] **Session Security**:
  - HttpOnly cookies with `sameSite: 'lax'` and `secure: true` in production.
  - JWT tokens signed with 64-character random secret.
- [x] **Privacy & Anonymity**:
  - Student phone numbers redacted in general directory searches.
  - Viewing contact numbers requires Coordinator privileges and writes an audit log.
  - Campus distribution metrics combine small cohorts (<3 students) into "Other Zones".
- [x] **Emergency Lifecycle & Rate Limiting**:
  - Only approved requests can broadcast.
  - 15-minute cooldown between repeated emergency broadcasts.
- [x] **Distinct Visual Design Tokens**:
  - Donor: Life Garden (warm ivory, terracotta, sage).
  - Requester: Response Desk (pearl grey, midnight blue, amber).
  - Both: Campus Orbit (pale lilac, plum, teal).
  - Reduced-motion accessibility respected via CSS `@media (prefers-reduced-motion)`.

---

### Production Deployment Steps

1. **MongoDB Atlas / Local Service**:
   - Create production database `bit_blood_portal`.
   - Verify network access and connection string in `server/.env`.
2. **Environment Variables**:
   - Set `NODE_ENV=production`.
   - Generate strong secrets for `JWT_SECRET` and `FORM_SYNC_SECRET`.
   - Configure SMTP credentials if password reset email is enabled.
3. **Build Frontend**:
   ```bash
   cd client
   npm run build
   ```
   - Verify `client/dist` is generated.
4. **Build Backend**:
   ```bash
   cd server
   npm run build
   ```
   - Verify `server/dist` is generated.
5. **Start Production Service**:
   ```bash
   cd server
   npm start
   ```
6. **Reverse Proxy & SSL**:
   - Configure Nginx or Caddy with HTTPS certificates for `bloodportal.bitsathy.ac.in`.
7. **Google Apps Script Production URL**:
   - Update `BACKEND_SYNC_URL` in Google Apps Script properties to `https://bloodportal.bitsathy.ac.in/api/sync/google-form`.
