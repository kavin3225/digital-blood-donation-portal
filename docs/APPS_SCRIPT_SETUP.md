# Google Apps Script Setup & Installation Guide
## Automated Form Submission Webhook Synchronization

---

### 1. Overview
The BIT Digital Blood Donation Portal uses an installable Google Apps Script trigger linked to the Google Form's private response spreadsheet. Whenever a student submits or updates their registration, Apps Script constructs an HMAC-SHA256 signed payload and sends it to the backend endpoint `/api/sync/google-form`.

---

### 2. Step-by-Step Installation

#### Step 1: Open Apps Script Editor
1. In Google Forms, open the **Responses** tab and click **Link to Sheets** (or open the linked spreadsheet).
2. Inside Google Sheets, click the menu: **Extensions > Apps Script**.

#### Step 2: Paste Webhook Script
1. Erase any default template code in the editor (`Code.gs`).
2. Copy the full contents of [`google-apps-script/Code.gs`](../google-apps-script/Code.gs) into the editor.
3. Click the disk icon (**Save project**).

#### Step 3: Configure Project Script Properties
1. In the left sidebar of the Apps Script editor, click the gear icon (**Project Settings**).
2. Scroll to the bottom to **Script Properties** and click **Edit script properties**.
3. Add two properties:
   - `BACKEND_SYNC_URL`: The HTTPS URL of your backend sync endpoint:
     - *Production*: `https://bloodportal.bitsathy.ac.in/api/sync/google-form`
     - *Localhost Development*: `https://<your-ngrok-id>.ngrok-free.app/api/sync/google-form` (see section 3 below).
   - `FORM_SYNC_SECRET`: The shared 64-character secret matching `FORM_SYNC_SECRET` in your server `.env`.
4. Click **Save script properties**.

#### Step 4: Install the onFormSubmit Trigger
1. In the left sidebar, click the alarm clock icon (**Triggers**).
2. Click **+ Add Trigger** (bottom right).
3. Configure the trigger parameters:
   - **Choose which function to run**: `onFormSubmit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From spreadsheet`
   - **Select event type**: `On form submit`
   - **Failure notification settings**: `Notify me daily` (or immediately)
4. Click **Save**.
5. Google will display an OAuth authorization popup:
   - Sign in with your college admin account.
   - Click **Advanced > Go to BIT Blood Sync (unsafe)** to grant spreadsheet access.

---

### 3. Localhost Development via Reverse Tunnel
> [!IMPORTANT]
> Google Apps Script executes on Google's cloud servers. It cannot directly connect to `http://localhost:5000` or local IP addresses (`127.0.0.1`).

To test the live Apps Script integration locally:
1. Start your local backend on port 5000 (`npm run dev:server`).
2. Open a terminal and run **ngrok** or **Cloudflare Tunnel**:
   ```bash
   ngrok http 5000
   ```
3. Copy the generated public HTTPS URL (e.g. `https://a1b2-203-192-20-1.ngrok-free.app`).
4. Set `BACKEND_SYNC_URL` in Script Properties to:
   ```
   https://a1b2-203-192-20-1.ngrok-free.app/api/sync/google-form
   ```
5. Submit a test Google Form entry. Inspect the `Executions` log in Apps Script to verify the `HTTP 201 Created` response.

---

### 4. Verification & Troubleshooting
- **Invalid Signature Error (401)**: Verify that the `FORM_SYNC_SECRET` in Script Properties exactly matches the secret in your server `.env`.
- **Clock Skew Error (401)**: The backend permits up to 5 minutes difference between Google's cloud server timestamp and your local clock. Ensure your local machine system time is synchronized.
- **Failed Sync Tab**: If the backend is momentarily offline, failed submissions are saved in the `Sync_Retries` tab in the spreadsheet. Administrators can also retry failed syncs from the Admin Portal (`/admin`).
