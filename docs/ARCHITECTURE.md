# Architecture and Data Flow Specification
## BIT Digital Blood Donation & Emergency Availability Management Portal

---

### 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Google Workspace ["Google Workspace (bitsathy.ac.in)"]
        GF["BIT Registration Google Form"] --> GS["Private Linked Google Sheet"]
        GS --> GAS["Installable Apps Script Trigger (onFormSubmit)"]
        GIS["Google Identity Services (OAuth 2.0)"]
    end

    subgraph Secure Backend ["Node.js / Express Backend (Port 5000)"]
        HMAC["HMAC-SHA256 & Replay Verifier"]
        AUTH["Google Token Verifier (hd: bitsathy.ac.in)"]
        RBAC["Role-Based Access Control"]
        SM["Emergency State Machine"]
        FCM["Push Notification Dispatcher"]
        AUDIT["Immutable Audit Logger"]
    end

    subgraph Database ["MongoDB Database (bit_blood_portal)"]
        REG[("StudentRegistrations")]
        REQ[("EmergencyRequests")]
        RESP[("DonorResponses")]
        SYNC[("FormSyncEvents")]
        LOGS[("AuditLogs & Notifications")]
    end

    subgraph Frontend ["React 18 + Vite + TypeScript Client"]
        GARDEN["Donor Experience: Life Garden"]
        DESK["Requester Experience: Response Desk"]
        ORBIT["Both Experience: Campus Orbit"]
        ADMIN["Coordinator & Admin Workspaces"]
    end

    GAS -- "HTTPS Webhook (Signed HMAC-SHA256)" --> HMAC
    HMAC --> REG
    HMAC --> SYNC
    GIS -- "Google ID Token" --> AUTH
    AUTH --> RBAC
    RBAC --> REG
    Frontend <--> Backend
    Backend <--> Database
```

---

### 2. Google Form Submission & Webhook Sync Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (@bitsathy.ac.in)
    participant Form as Google Form
    participant Sheet as Private Google Sheet
    participant AppsScript as Apps Script (Code.gs)
    participant Server as Express Sync Endpoint
    participant DB as MongoDB

    Student->>Form: Completes registration form using college account
    Form->>Sheet: Records verified email, register number, role, blood group
    Sheet->>AppsScript: Fires onFormSubmit event
    AppsScript->>AppsScript: Builds payload & computes HMAC-SHA256 signature
    AppsScript->>Server: POST /api/sync/google-form (X-BIT-Signature, X-BIT-Timestamp)
    Server->>Server: Verifies signature, clock skew (<5m), and replay defense
    Server->>DB: Checks conflicting register number
    alt Conflicting Register Number Detected
        Server->>DB: Saves student as 'conflict_flagged' / 'pending_review'
    else Unique College Identity
        Server->>DB: Upserts student with field ownership preservation
    end
    Server->>DB: Writes FormSyncEvent audit record
    Server-->>AppsScript: HTTP 201 Created / 200 OK
```

---

### 3. Emergency Request & Coordination Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Requester as Verified Requester / Attendant
    participant Client as Web Portal
    participant Server as Express Backend
    actor Coord as College Health Coordinator
    participant Push as FCM Web Push / In-App
    actor Donor as Willing Student Donor

    Requester->>Client: Submits Emergency Request (Hospital, Units, Blood Group)
    Client->>Server: POST /api/requests (JWT Session)
    Server->>Server: Creates request in 'pending_verification' status
    Server-->>Client: Request created (BIT-REQ-2026-XXXX)
    
    Coord->>Server: Inspects queue via Coordinator Workspace
    Coord->>Server: PUT /api/coordinator/requests/:id/verify
    Server->>Server: Transitions status to 'verified'

    Coord->>Server: POST /api/coordinator/requests/:id/broadcast
    Server->>Server: Checks broadcast rate-limit cooldown
    Server->>Server: Transitions status to 'broadcast'
    Server->>Push: Dispatches targeted alerts to matching willing donors
    Push->>Donor: Notifies student donor

    Donor->>Client: Selects "I can help" (Hostel Block & Readiness Note)
    Client->>Server: POST /api/donors/respond
    Server->>Server: Upserts response & sets request to 'coordinating'
    
    Coord->>Server: Unlocks donor phone number (Audit logged)
    Coord->>Donor: Arranges vehicle transport to hospital blood bank
    Coord->>Server: Confirms blood units fulfilled & terminates broadcast
    Server->>Server: Transitions status to 'fulfilled'
```

---

### 4. Database Entity-Relationship Overview

```mermaid
erDiagram
    StudentRegistration ||--o{ EmergencyRequest : creates
    StudentRegistration ||--o{ DonorResponse : submits
    StudentRegistration ||--o{ NotificationSubscription : registers
    EmergencyRequest ||--o{ DonorResponse : receives
    EmergencyRequest ||--o{ NotificationLog : triggers
    StudentRegistration ||--o{ AuditLog : acts_in

    StudentRegistration {
        ObjectId _id PK
        string googleEmail UK
        string googleSubjectId
        string name
        string registerNumber
        string department
        string selectedRole
        string portalRole
        string systemRole
        string bloodGroup
        string mobile
        string residenceType
        string approximateArea
        string currentWillingness
        date availabilityLastConfirmedAt
        string syncStatus
        string status
    }

    EmergencyRequest {
        ObjectId _id PK
        string requestId UK
        string patientReference
        string hospital
        string hospitalLocation
        string bloodGroup
        int unitsRequired
        date requiredBy
        string status
        ObjectId assignedCoordinatorId
        date broadcastAt
        date fulfilledAt
    }

    DonorResponse {
        ObjectId _id PK
        ObjectId requestId FK
        ObjectId donorId FK
        string responseType
        string note
        string coordinatorFollowUp
        date respondedAt
    }
```
