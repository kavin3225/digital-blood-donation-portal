# Student and Coordinator User Manual
## BIT Digital Blood Donation & Emergency Availability Management Portal

---

### 1. Student Onboarding & Registration Flow
1. **Google Form Registration**:
   - Access the college Google Form using your official `@bitsathy.ac.in` account.
   - Enter your Register Number (e.g. `7376231EC101`), Department, Year, Blood Group, Mobile Contact, and Current Willingness.
   - Upon submitting, the installable Apps Script webhook synchronizes your record into the portal's MongoDB database.
2. **Accessing the Portal**:
   - Navigate to the portal URL (`http://localhost:5173` or production domain).
   - Choose your role entry point:
     - `/login/donor` — Life Garden
     - `/login/requester` — Response Desk
     - `/login/both` — Campus Orbit
   - Click **Sign in with Google** using the exact same `@bitsathy.ac.in` Google account.
   - If not yet registered on Google Form, a helpful modal will present the direct Form link.

---

### 2. Donor Guide — "Life Garden"
- **Availability Freshness Action**:
  - Located at the top of your dashboard.
  - Click **Confirm Available Today** to verify that your readiness status is up to date.
  - Toggle between **Willing & Ready** and **Temporarily Busy** (e.g. during internal exams or fever).
- **Responding to Emergency Broadcasts**:
  - Verified hospital alerts matching your blood group (or compatible O-) appear in your feed.
  - Click **Respond to Emergency** and select:
    - `I Can Help` — You are willing to proceed to the hospital blood bank if matched.
    - `Logistical Help` — You can assist with vehicle transport or coordination.
    - `Not Available` — You cannot donate at this time.
- **My Response History**:
  - Track coordinator status updates (`Contacted`, `Matched at Hospital`, `Donated`).

---

### 3. Requester Guide — "Response Desk"
- **Creating an Emergency Blood Request**:
  - Click **Create Emergency Request** in your dashboard.
  - Fill in the validated form:
    - Minimal patient reference (e.g. `Student - Mech Dept - ICU Bed 3`).
    - Hospital name & approximate location (e.g. `GH Sathyamangalam`).
    - Blood group & units needed.
    - Required-by date and time.
    - Contact person name & phone number.
    - Brief casualty context.
  - Click **Submit for Verification**.
- **Tracking Lifecycle Timeline**:
  - Your request is placed in `pending_verification`.
  - A College Health Coordinator reviews details with the hospital.
  - Once verified, the coordinator broadcasts the need to eligible students.
  - You can view the real-time count of responding donors and coordinator notes.

---

### 4. Coordinator Workspace Guide
- **Access**:
  - Restricted to faculty/staff with `systemRole: 'coordinator'` or `admin`.
  - Located at `/coordinator`.
- **Verifying Requests**:
  - Inspect casualty details in the queue.
  - Call the attending hospital/casualty medical officer to verify legitimate need.
  - Click **Verify & Approve** and record verification notes.
- **Targeted Emergency Broadcast**:
  - Click **Broadcast to Matching Donors**.
  - Targeted push and in-app alerts are dispatched to consenting student donors.
- **Reviewing Donors & Unlocking Contact**:
  - Click **Manage Donors & Responses** on active broadcasts.
  - Click **View Phone** to reveal the volunteer's phone number (this action is recorded in the compliance audit log).
  - Update follow-up status (`Contacted`, `Matched at Hospital`, `Donated`).
- **Fulfillment**:
  - Once blood units are collected at the blood bank, click **Confirm Fulfilled** to conclude the emergency and terminate broadcasts.

---

### 5. Administrator Governance Guide
- **Access**:
  - Restricted to users with `systemRole: 'admin'`.
  - Located at `/admin`.
- **Flagged Registrations Review**:
  - Inspect accounts where students submitted conflicting register numbers.
  - Click **Approve Active** or **Block Account** after verifying student physical ID.
- **Form Sync Monitor**:
  - View real-time webhook events from Google Apps Script.
  - Click **Retry Import** to reprocess any failed events.
- **Role Assignments**:
  - Promote verified college staff to Coordinator privileges using their `@bitsathy.ac.in` email.
- **Audit Logs**:
  - Inspect full chronological compliance logs of all logins, requests, broadcasts, and contact views.
