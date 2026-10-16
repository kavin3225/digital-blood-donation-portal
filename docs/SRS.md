# Software Requirements Specification (SRS)
## Digital Blood Donation and Emergency Blood Availability Management Portal
### Bannari Amman Institute of Technology (BIT) — bitsathy.ac.in

---

### 1. Introduction
#### 1.1 Purpose
The purpose of this document is to define the functional, behavioral, and non-functional requirements for the **Digital Blood Donation and Emergency Blood Availability Management Portal** developed for the Bannari Amman Institute of Technology (BIT) campus community.

#### 1.2 Scope
The portal addresses urgent blood requirements arising from student road accidents, hospital emergencies, and surgeries in the Sathyamangalam and Erode regions. It enables:
1. Verification of donor registration using official Google Forms linked with college Google Workspace accounts (`bitsathy.ac.in`).
2. Authentication exclusively through Google Identity Services for `@bitsathy.ac.in` accounts, rejecting personal Gmail or external identities.
3. Three distinctive visual and architectural experiences:
   - **Donor** ("Life Garden"): Warm ivory, terracotta, and sage. Focus on availability freshness and matching requests.
   - **Requester** ("Response Desk"): Pearl grey, midnight blue, and amber. Emergency dispatch workspace with real-time status timeline.
   - **Both** ("Campus Orbit"): Pale lilac, plum, and teal. Integrated workspace with tactile Donating/Requesting mode switch.
4. Emergency blood request lifecycle verification by designated College Health Coordinators before broadcast.
5. Privacy-safe volunteer response tracking and coordinator handover workflows.
6. Honest delivery status tracking across in-app and browser web push notifications.

#### 1.3 Definitions and Acronyms
- **BIT**: Bannari Amman Institute of Technology, Sathyamangalam.
- **GIS**: Google Identity Services (OAuth 2.0 Identity Platform).
- **HMAC**: Hash-Based Message Authentication Code (SHA-256).
- **FCM**: Firebase Cloud Messaging (Web Push Notifications).
- **Coordinator**: College faculty/staff member assigned to verify hospital casualty details.

---

### 2. Overall Description
#### 2.1 Core Scenario & Life-Safety Flow
1. A college student meets with an accident or undergoes surgery at a hospital (e.g. Government Hospital Sathyamangalam, KMCH Coimbatore).
2. A verified student attendant or faculty member initiates an Emergency Blood Request.
3. The request enters `pending_verification` status.
4. A college coordinator verifies the casualty with the attending hospital medical officer.
5. Upon approval, the coordinator triggers a targeted emergency broadcast to active willing student donors of matching blood groups.
6. Student donors receive push and in-app alerts and submit responses ("I can help", "Not available", "Logistical help").
7. Coordinators review responding volunteers, unlock authorized phone numbers with immutable audit trails, arrange transport, and confirm fulfillment at the blood bank.

#### 2.2 System Interfaces
- **Client Frontend**: React 18, TypeScript, Tailwind CSS, Vite.
- **Backend API**: Node.js, Express, TypeScript, Mongoose, JWT session cookies (HttpOnly, SameSite).
- **Database**: MongoDB (7.x / 8.x) with unique compound indexes.
- **Form Registration Pipeline**: Private Google Sheet + installable Apps Script `onFormSubmit` webhook with HMAC-SHA256 signature.

---

### 3. Specific Functional Requirements

#### 3.1 Google Form Registration & Ingestion
- **FR-1.1**: The system shall not require a pre-uploaded CSV or roster. Registrations originate exclusively from the official Google Form submitted with verified college accounts.
- **FR-1.2**: Webhooks from Google Apps Script must be signed using HMAC-SHA256 with timestamp verification and replay defense (5-minute window).
- **FR-1.3**: Conflicting register numbers submitted by different Google emails must be flagged as `conflict_flagged` and placed in `pending_review` without overwriting prior student identities.
- **FR-1.4**: Field ownership rule: Reprocessing older Form submissions must not overwrite newer portal edits made by authenticated students.

#### 3.2 Authentication & Authorization
- **FR-2.1**: The backend must verify Google ID tokens using the official Google Auth Library (`google-auth-library`), verifying signature, expiry, audience, and the exact hosted-domain claim `hd: "bitsathy.ac.in"`.
- **FR-2.2**: Personal `@gmail.com` accounts and non-BIT domains must be rejected with HTTP 403 Forbidden.
- **FR-2.3**: Unregistered college Google accounts must be denied access to student APIs and directed to complete the Google Form first.
- **FR-2.4**: Sessions must use secure HttpOnly cookies (`bit_session_token`) with SameSite protection.
- **FR-2.5**: Official college email OTP fallback must be available if Google Workspace SSO is inaccessible.
- **FR-2.6**: Coordinators and Administrators are assigned strictly through backend admin controls; students cannot self-select administrative privileges.

#### 3.3 Visual & User Experience
- **FR-3.1**: The portal must render three visually distinct role experiences:
  - **Donor**: Warm ivory, terracotta, and sage palette; organic curved SVG botanical artwork; vertical layout with availability freshness as primary action.
  - **Requester**: Pearl grey, midnight blue, and amber palette; technical grid and radar sweep artwork; structured editorial layout with emergency status timeline.
  - **Both**: Pale lilac, plum, and teal palette; orbital trajectories SVG artwork; tactile mode switcher between Donating and Requesting.
- **FR-3.2**: Animations must respect the user's `prefers-reduced-motion` operating system setting.
- **FR-3.3**: Forms and action buttons must remain stationary and accessible.

#### 3.4 Emergency Request Lifecycle
- **FR-4.1**: Requests must transition through strictly enforced states:
  `pending_verification` -> `verified` -> `broadcast` -> `coordinating` -> `fulfilled` (or `rejected` / `cancelled` / `expired`).
- **FR-4.2**: Only approved requests can be broadcast to students.
- **FR-4.3**: Repeat broadcasts must be rate-limited (minimum 15-minute cooldown) to prevent alert flooding.
- **FR-4.4**: Coordinators may record handovers with audit notes when transferring responsibility.
- **FR-4.5**: Fulfillment must be explicitly confirmed by a coordinator upon successful blood bank collection.

#### 3.5 Privacy-Safe Search & Contact Protection
- **FR-5.1**: Student phone numbers must never be exposed in public or student-accessible search views.
- **FR-5.2**: General donor listings must display "Self-reported blood group", "Willing donor", and "Availability last confirmed".
- **FR-5.3**: Campus aggregate metrics must group small cohorts (<3 students) into combined totals to prevent deanonymization.
- **FR-5.4**: Coordinator views of donor phone numbers must generate an immutable audit log entry.

---

### 4. Non-Functional Requirements
- **NFR-1 Security**: Passwords and tokens never stored in plain text. HMAC signatures verified in constant-time. Helmet security headers enabled.
- **NFR-2 Performance**: Client bundles under 400 KB gzipped. Server API response time < 150 ms under local database conditions.
- **NFR-3 Reliability**: Idempotent webhook processing. Failed sync events logged for admin retry.
- **NFR-4 Usability**: 100% responsive across mobile, tablet, and desktop viewports. High-contrast typography and keyboard focus rings.
