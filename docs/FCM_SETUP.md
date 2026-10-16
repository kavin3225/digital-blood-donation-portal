# Firebase Cloud Messaging (FCM) Web Push Setup Guide
## Browser Emergency Push Notifications

---

### 1. Overview
The portal implements Firebase Cloud Messaging web push for urgent emergency broadcasts:
- Explicit permission request flow explaining why notifications are needed.
- Service worker (`firebase-messaging-sw.js`) handling background alert reception.
- Private per-user device token registration (`/api/notifications/subscribe`).
- Honest delivery tracking (`queued`, `provider_accepted`, `acknowledged`).
- Lock screen privacy: Private patient names and phone numbers are excluded from push banners.

---

### 2. Firebase Console Configuration

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a project named: `bit-blood-portal`.
3. Add a **Web app**:
   - Register App Name: `BIT Blood Portal Web`.
   - Copy the `firebaseConfig` keys into `client/.env`:
     ```env
     VITE_FIREBASE_API_KEY=AIzaSy...
     VITE_FIREBASE_AUTH_DOMAIN=bit-blood-portal.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=bit-blood-portal
     VITE_FIREBASE_STORAGE_BUCKET=bit-blood-portal.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
     ```
4. Generate Web Push Certificates (VAPID):
   - In Firebase Console, go to **Project Settings > Cloud Messaging > Web configuration**.
   - Under **Web Push certificates**, click **Generate key pair**.
   - Copy the Key Pair into `client/.env`:
     ```env
     VITE_FIREBASE_VAPID_KEY=BN...
     ```
5. Server Service Account (Optional for direct push dispatch):
   - Go to **Project Settings > Service accounts > Generate new private key**.
   - Save the JSON path or string in `server/.env` under `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

### 3. User Permission Flow
Google Form registration alone cannot enable web push. In the portal:
1. Students sign in and navigate to the **Notification Center** (`/notifications`).
2. A banner explains: *"Enable Web Push Notifications to receive audible alerts during critical accidents."*
3. Student clicks **Enable Push Notifications**.
4. Browser prompts for permission. When granted, the service worker token is securely registered with the server.
5. Students can click **Send Test Alert** to verify end-to-end receipt immediately.
