# Google Form Specification & Configuration Guide
## BIT Digital Blood Donation Student Registration

---

### 1. Form Settings Configuration (Google Forms Admin)
To ensure data integrity and prevent identity spoofing, configure the following settings in Google Forms:

1. **Email Collection**:
   - Navigate to **Settings > Responses**.
   - Set **Collect email addresses** to: `Verified` (Google Workspace single-sign-on verification).
   - *Do NOT rely solely on a manually typed email text question.*
2. **Responder Restriction**:
   - Enable: **Restrict to users in Bannari Amman Institute of Technology and its trusted organizations**.
   - *Ensures responders must possess active `@bitsathy.ac.in` credentials.*
3. **Response Limit**:
   - Enable: **Limit to 1 response**.
4. **Presentation & Privacy**:
   - Disable: **Show link to submit another response**.
   - Disable: **View summary results** (keep all peer medical/contact data private).
   - **Confirmation Message**:
     ```
     Thank you for registering with the BIT Digital Blood Donation Portal.
     Your profile has been synchronized. You can now access your role dashboard:
     http://localhost:5173/login/donor (or your college portal domain).
     ```

---

### 2. Form Sections & Question Hierarchy

#### Section 1: College Identification (All Students)
1. **Verified Email Address**: Automatically collected by Google Workspace SSO.
2. **Full Name** (Short Answer, Required):
   - Example: `Arun K`
3. **Register Number / Roll Number** (Short Answer, Required):
   - Regex validation: `^[0-9]{7}[A-Za-z]{2}[0-9]{3}$` (or college pattern, uppercase).
   - Example: `7376231EC101`
4. **Department** (Dropdown, Required):
   - Options: ECE, CSE, IT, MECH, CIVIL, EEE, AI&DS, BIOTECH, FT, CHEMICAL, etc.
5. **Year of Study** (Multiple Choice, Required):
   - Options: `I Year`, `II Year`, `III Year`, `IV Year`, `Postgraduate / Staff`.
6. **Mobile Contact Number** (Short Answer, Required):
   - Description: *Used strictly by college coordinators during emergency hospital dispatches. Hidden from general public searches.*
7. **Residence Type** (Multiple Choice, Required):
   - Options: `Campus Hostel Resident`, `Day Scholar`.
8. **Approximate Current Area / Hostel Block** (Short Answer, Required):
   - Example: `Hostel Block B`, `Amaravathi Hostel`, `Sathyamangalam Town`, `Alathukombai`.
9. **Portal Role Preference** (Multiple Choice, Required):
   - Options:
     - `Donor` (Go to Section 2: Donor Preferences)
     - `Requester` (Go to Section 3: Requester Only)
     - `Both (Donor & Requester)` (Go to Section 2: Donor Preferences)

---

#### Section 2: Donor Details (Conditional for 'Donor' and 'Both')
10. **Self-Reported Blood Group** (Dropdown, Required):
    - Options: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `Unknown`.
11. **Current Willingness to Donate** (Multiple Choice, Required):
    - Options:
      - `Willing & Ready` (Available for emergency alerts)
      - `Temporarily Unavailable` (Exams, sports injury, medication)
12. **Last Blood Donation Date (if known)** (Date, Optional):
    - Calendar picker for previous donation date.
13. **Non-Donation Volunteer Support** (Checkboxes, Optional):
    - `Vehicle Transport / Patient Attendant`
    - `Campus Coordination Desk Volunteer`
14. **Consent to Emergency Communications** (Checkbox, Required):
    - Text: `I consent to storing my coordination profile and receiving urgent hospital blood requests via the BIT portal.`

---

#### Section 3: Confirmation (Requester Only)
15. **Consent to Data Storage** (Checkbox, Required):
    - Text: `I understand that my emergency blood requests will be verified by college coordinators before being broadcast.`
