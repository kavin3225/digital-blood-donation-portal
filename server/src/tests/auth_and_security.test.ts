import request from 'supertest';
import app from '../server';
import { connectDB, closeDB } from '../config/db';
import { StudentRegistration } from '../models/StudentRegistration';
import { EmergencyRequest } from '../models/EmergencyRequest';
import { FormSyncEvent } from '../models/FormSyncEvent';
import crypto from 'crypto';
import { ENV } from '../config/env';
import nodemailer from 'nodemailer';

describe('Digital Blood Donation Portal - Security & Workflow Test Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    // Clean test collection
    await StudentRegistration.deleteMany({ googleEmail: /test/ });
    await EmergencyRequest.deleteMany({ requesterEmail: /test/ });
    await FormSyncEvent.deleteMany({ eventId: /test/ });
  });

  afterAll(async () => {
    await StudentRegistration.deleteMany({ googleEmail: /test/ });
    await EmergencyRequest.deleteMany({ requesterEmail: /test/ });
    await FormSyncEvent.deleteMany({ eventId: /test/ });
    await closeDB();
  });

  describe('1. Genuine College Authentication & Domain Restrictions', () => {
    it('should reject authentication attempt with personal Gmail domain', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          credential: 'mock-test-token:randomuser@gmail.com:sub-111:Random User',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Personal Gmail or other organization accounts are prohibited');
    });

    it('should reject authentication attempt with non-BIT domain', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          credential: 'mock-test-token:student@othercollege.edu:sub-222:Other Student',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Personal Gmail or other organization accounts are prohibited');
    });

    it('should admit a verified new BIT Google user and keep the profile incomplete', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          credential: 'mock-test-token:newunregistered.cs24@bitsathy.ac.in:sub-333:New Student',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.isProfileComplete).toBe(false);
      const protectedAction = await request(app).post('/api/requests').set('Authorization', 'Bearer ' + res.body.token).send({});
      expect(protectedAction.status).toBe(403);
      expect(protectedAction.body.code).toBe('PROFILE_INCOMPLETE');
    });

    it('should deny access if student account is marked blocked', async () => {
      await StudentRegistration.create({
        googleEmail: 'test.blocked@bitsathy.ac.in',
        name: 'Blocked User',
        registerNumber: '7376231EC999',
        department: 'ECE',
        year: 'III',
        selectedRole: 'Donor',
        portalRole: 'Donor',
        bloodGroup: 'B+',
        mobile: '9999999999',
        status: 'blocked',
        syncStatus: 'blocked',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({
          credential: 'mock-test-token:test.blocked@bitsathy.ac.in:sub-blocked:Blocked User',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_BLOCKED');
    });

    it('should allow login for valid registered BIT student and set session cookie', async () => {
      await StudentRegistration.create({
        googleEmail: 'test.donor@bitsathy.ac.in',
        name: 'Test Donor Student',
        registerNumber: '7376231EC888',
        department: 'ECE',
        year: 'III',
        selectedRole: 'Donor',
        portalRole: 'Donor',
        bloodGroup: 'O+',
        mobile: '9842188888',
        status: 'active',
        syncStatus: 'synced',
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({
          credential: 'mock-test-token:test.donor@bitsathy.ac.in:sub-valid:Test Donor Student',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('test.donor@bitsathy.ac.in');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('bit_session_token');
    });

    it('should require verified email before student password sign-in', async () => {
      const password = '246810';
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
      await StudentRegistration.create({
        googleEmail: 'test.passwordlogin@bitsathy.ac.in',
        name: 'Password Login User',
        registerNumber: 'TEST-PASS-01',
        department: 'CSE',
        year: 'I',
        selectedRole: 'Both',
        portalRole: 'Both',
        bloodGroup: 'Unknown',
        mobile: '9000000000',
        district: 'Erode',
        approximateArea: 'Campus',
        currentWillingness: 'Willing',
        systemRole: 'student',
        status: 'active',
        syncStatus: 'synced',
        passwordHash,
        emailVerifiedAt: new Date(),
      });

      const success = await request(app).post('/api/auth/login-email').send({
        email: 'test.passwordlogin@bitsathy.ac.in', password,
      });
      expect(success.status).toBe(200);
      expect(success.headers['set-cookie'][0]).toContain('bit_session_token');

      const unverifiedSalt = crypto.randomBytes(16).toString('hex');
      await StudentRegistration.create({
        googleEmail: 'test.unverified@bitsathy.ac.in',
        name: 'Unverified User',
        registerNumber: 'TEST-UNVERIFIED',
        department: 'CSE',
        year: 'I',
        selectedRole: 'Both',
        portalRole: 'Both',
        bloodGroup: 'Unknown',
        mobile: '9000000001',
        systemRole: 'student',
        status: 'active',
        passwordHash: `${unverifiedSalt}:${crypto.scryptSync(password, unverifiedSalt, 64).toString('hex')}`,
      });
      const blocked = await request(app).post('/api/auth/login-email').send({
        email: 'test.unverified@bitsathy.ac.in', password,
      });
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(blocked.headers['set-cookie']).toBeUndefined();
    });

    it('should allow password sign-in for an admin only when the email is server-allowlisted', async () => {
      const email = 'test.adminlogin@bitsathy.ac.in';
      const password = 'private-admin-password-2026';
      const salt = crypto.randomBytes(16).toString('hex');
      ENV.INITIAL_ADMIN_EMAILS.push(email);
      await StudentRegistration.create({
        googleEmail: email,
        name: 'Allowlisted Admin',
        registerNumber: 'TEST-ADMIN-01',
        department: 'Administration',
        year: 'N/A',
        selectedRole: 'Both',
        portalRole: 'Both',
        bloodGroup: 'Unknown',
        mobile: '9000000099',
        district: 'Erode',
        approximateArea: 'Campus',
        currentWillingness: 'Not Willing',
        systemRole: 'admin',
        status: 'active',
        syncStatus: 'synced',
        passwordHash: `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`,
      });
      try {
        const badPassword = await request(app).post('/api/auth/login-email').send({ email, password: 'incorrect-password' });
        expect(badPassword.status).toBe(401);
        const res = await request(app).post('/api/auth/login-email').send({ email, password });
        expect(res.status).toBe(200);
        expect(res.body.user.systemRole).toBe('admin');
        const adminRecords = await request(app).get('/api/admin/users').set('Cookie', res.headers['set-cookie']);
        expect(adminRecords.status).toBe(200);
      } finally {
        ENV.INITIAL_ADMIN_EMAILS.splice(ENV.INITIAL_ADMIN_EMAILS.indexOf(email), 1);
      }
    });

    it('should register only a Student, send a verification link, and activate the account after verification', async () => {
      const password = '246810';
      const originalSmtp = { host: ENV.SMTP_HOST, user: ENV.SMTP_USER, pass: ENV.SMTP_PASS };
      ENV.SMTP_HOST = 'smtp.test.invalid'; ENV.SMTP_USER = 'test-user'; ENV.SMTP_PASS = 'test-pass';
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
      const transport = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as any);
      try {
      const res = await request(app).post('/api/auth/register-email').send({
        name: 'Fast Registration User',
        email: 'test.fastregister@bitsathy.ac.in',
        password,
        userType: 'Student',
        registerNumber: 'TEST-FAST-01',
        department: 'CSE',
        year: 'I',
        bloodGroup: 'O+',
        mobile: '9000000002',
        district: 'Erode',
        approximateArea: 'Campus',
        role: 'Donor',
        currentWillingness: 'Willing',
        systemRole: 'admin',
      });
      expect(res.status).toBe(201);
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(res.body.user).toBeUndefined();
      const created = await StudentRegistration.findOne({ googleEmail: 'test.fastregister@bitsathy.ac.in' }).select('+passwordHash +emailVerifiedAt +emailVerificationTokenHash');
      expect(created?.passwordHash).not.toBe(password);
      expect(created?.emailVerifiedAt).toBeUndefined();
      expect(created?.systemRole).toBe('student');
      expect(created?.userType).toBe('Student');
      const emailText = sendMail.mock.calls[0][0].text as string;
      const token = emailText.match(/token=([a-f0-9]+)/)?.[1];
      expect(token).toBeDefined();
      const verify = await request(app).post('/api/auth/verify-email').send({ email: 'test.fastregister@bitsathy.ac.in', token });
      expect(verify.status).toBe(200);
      const session = await request(app).post('/api/auth/login-email').send({ email: 'test.fastregister@bitsathy.ac.in', password });
      expect(session.status).toBe(200);
      expect(session.body.user.systemRole).toBe('student');
      const attemptedPrivilegeEscalation = await request(app).put('/api/auth/profile').set('Cookie', session.headers['set-cookie']).send({ systemRole: 'admin' });
      expect(attemptedPrivilegeEscalation.status).toBe(200);
      const stillStudent = await StudentRegistration.findOne({ googleEmail: 'test.fastregister@bitsathy.ac.in' });
      expect(stillStudent?.systemRole).toBe('student');
      const deniedAdminRecords = await request(app).get('/api/admin/users').set('Cookie', session.headers['set-cookie']);
      expect(deniedAdminRecords.status).toBe(403);
      } finally {
        transport.mockRestore();
        ENV.SMTP_HOST = originalSmtp.host; ENV.SMTP_USER = originalSmtp.user; ENV.SMTP_PASS = originalSmtp.pass;
      }
    });

    it('should reject passwords that are not exactly six digits', async () => {
      const res = await request(app).post('/api/auth/register-email').send({
        name: 'Invalid PIN User',
        email: 'test.invalidpin@bitsathy.ac.in',
        password: '12345x',
        userType: 'Student',
        registerNumber: 'TEST-PIN-01',
        department: 'CSE',
        year: 'I',
        bloodGroup: 'O+',
        mobile: '9000000003',
        district: 'Erode',
        approximateArea: 'Campus',
        role: 'Donor',
        currentWillingness: 'Willing',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_REGISTRATION');
    });

    it('should reject email registration outside the exact college domain', async () => {
      const res = await request(app).post('/api/auth/register-email').send({ email: 'student@bitsathy.ac.in.evil' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('COLLEGE_EMAIL_REQUIRED');
    });
  });

  describe('2. Google Form HMAC Sync & Webhook Protection', () => {
    const validPayload = {
      eventId: 'test-event-001',
      email: 'test.synced@bitsathy.ac.in',
      name: 'Synced Student',
      registerNumber: '7376231IT555',
      department: 'IT',
      year: 'II',
      role: 'Donor',
      bloodGroup: 'A+',
      mobile: '+91 9988776655',
      residenceType: 'Hostel',
      approximateArea: 'Hostel Block A',
      currentWillingness: 'Willing',
    };

    it('should reject sync request missing HMAC headers', async () => {
      const res = await request(app)
        .post('/api/sync/google-form')
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('MISSING_SYNC_AUTH_HEADERS');
    });

    it('should reject sync request with expired timestamp (replay defense)', async () => {
      const expiredTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const bodyStr = JSON.stringify(validPayload);
      const signature = crypto.createHmac('sha256', ENV.FORM_SYNC_SECRET).update(bodyStr).digest('hex');

      const res = await request(app)
        .post('/api/sync/google-form')
        .set('x-bit-signature', signature)
        .set('x-bit-timestamp', expiredTimestamp.toString())
        .set('x-bit-event-id', 'test-event-expired')
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('EXPIRED_OR_FUTURE_TIMESTAMP');
    });

    it('should process valid signed Google Form webhook and create student record', async () => {
      const timestamp = Date.now();
      const bodyStr = JSON.stringify(validPayload);
      const signature = crypto.createHmac('sha256', ENV.FORM_SYNC_SECRET).update(bodyStr).digest('hex');

      const res = await request(app)
        .post('/api/sync/google-form')
        .set('x-bit-signature', signature)
        .set('x-bit-timestamp', timestamp.toString())
        .set('x-bit-event-id', validPayload.eventId)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const student = await StudentRegistration.findOne({ googleEmail: validPayload.email });
      expect(student).not.toBeNull();
      expect(student?.registerNumber).toBe(validPayload.registerNumber);
    });

    it('should flag conflicting register numbers without overwriting other student', async () => {
      const conflictPayload = {
        eventId: 'test-event-conflict',
        email: 'test.anotherstudent@bitsathy.ac.in',
        name: 'Another Student',
        registerNumber: '7376231IT555', // Duplicate register number!
        department: 'Mech',
        year: 'I',
        role: 'Requester',
        bloodGroup: 'B+',
        mobile: '+91 9988770000',
      };

      const timestamp = Date.now();
      const bodyStr = JSON.stringify(conflictPayload);
      const signature = crypto.createHmac('sha256', ENV.FORM_SYNC_SECRET).update(bodyStr).digest('hex');

      const res = await request(app)
        .post('/api/sync/google-form')
        .set('x-bit-signature', signature)
        .set('x-bit-timestamp', timestamp.toString())
        .set('x-bit-event-id', conflictPayload.eventId)
        .send(conflictPayload);

      expect(res.status).toBe(201);
      expect(res.body.syncStatus).toBe('conflict_flagged');

      const flaggedStudent = await StudentRegistration.findOne({ googleEmail: conflictPayload.email });
      expect(flaggedStudent?.status).toBe('pending_review');
      expect(flaggedStudent?.suspiciousReason).toContain('Conflicting register number');
    });

    it('should preserve newer portal edits when an older Form submission is reprocessed', async () => {
      const student = await StudentRegistration.findOne({ googleEmail: validPayload.email });
      expect(student).not.toBeNull();

      // Student updates their availability in the portal
      student!.portalRole = 'Both';
      student!.currentWillingness = 'Temporarily Unavailable';
      student!.portalEditedAt = new Date();
      await student!.save();

      // Reprocess old form submission
      const timestamp = Date.now();
      const reprocessPayload = { ...validPayload, eventId: 'test-event-reprocess', role: 'Donor', currentWillingness: 'Willing' };
      const bodyStr = JSON.stringify(reprocessPayload);
      const signature = crypto.createHmac('sha256', ENV.FORM_SYNC_SECRET).update(bodyStr).digest('hex');

      await request(app)
        .post('/api/sync/google-form')
        .set('x-bit-signature', signature)
        .set('x-bit-timestamp', timestamp.toString())
        .set('x-bit-event-id', reprocessPayload.eventId)
        .send(reprocessPayload);

      const refreshed = await StudentRegistration.findOne({ googleEmail: validPayload.email });
      expect(refreshed?.portalRole).toBe('Both'); // Preserved portal edit!
      expect(refreshed?.currentWillingness).toBe('Temporarily Unavailable'); // Preserved portal edit!
    });
  });

  describe('3. Role Permissions & Emergency Lifecycle', () => {
    let donorToken: string;
    let requesterToken: string;
    let coordinatorToken: string;

    beforeAll(async () => {
      // 1. Setup Donor Student
      const donor = await StudentRegistration.create({
        googleEmail: 'test.donor2@bitsathy.ac.in',
        name: 'Donor User',
        registerNumber: '7376231EC111',
        department: 'ECE',
        year: 'III',
        selectedRole: 'Donor',
        portalRole: 'Donor',
        systemRole: 'student',
        bloodGroup: 'O+',
        mobile: '9842100001',
        status: 'active',
        syncStatus: 'synced',
      });

      // 2. Setup Requester Student
      const requester = await StudentRegistration.create({
        googleEmail: 'test.requester@bitsathy.ac.in',
        name: 'Requester User',
        registerNumber: '7376231CS222',
        department: 'CSE',
        year: 'II',
        selectedRole: 'Requester',
        portalRole: 'Requester',
        systemRole: 'student',
        bloodGroup: 'A+',
        mobile: '9842100002',
        status: 'active',
        syncStatus: 'synced',
      });

      // 3. Setup Coordinator
      const coord = await StudentRegistration.create({
        googleEmail: 'test.coordinator@bitsathy.ac.in',
        name: 'Coordinator Staff',
        registerNumber: 'STAFF-001',
        department: 'NSS',
        year: 'Staff',
        selectedRole: 'Both',
        portalRole: 'Both',
        systemRole: 'coordinator',
        coordinatorProvisionedAt: new Date(),
        bloodGroup: 'B+',
        mobile: '9842100003',
        status: 'active',
        syncStatus: 'synced',
      });

      const resDonor = await request(app).post('/api/auth/google').send({
        credential: `mock-test-token:${donor.googleEmail}:sub-donor2:Donor User`,
      });
      donorToken = resDonor.body.token;

      const resReq = await request(app).post('/api/auth/google').send({
        credential: `mock-test-token:${requester.googleEmail}:sub-req:Requester User`,
      });
      requesterToken = resReq.body.token;

      const coordinatorPassword = 'secure-test-coordinator-2026';
      const coordinatorSalt = crypto.randomBytes(16).toString('hex');
      coord.passwordHash = `${coordinatorSalt}:${crypto.scryptSync(coordinatorPassword, coordinatorSalt, 64).toString('hex')}`;
      await coord.save();
      const resCoord = await request(app).post('/api/auth/login-email').send({
        email: coord.googleEmail, password: coordinatorPassword,
      });
      expect(resCoord.status).toBe(200);
      coordinatorToken = resCoord.headers['set-cookie'][0];
    });

    it('should forbid a pure Donor from creating an emergency request', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          patientName: 'Test Patient',
          district: 'Erode',
          area: 'Sathyamangalam',
          hospital: 'GH Hospital',
          hospitalLocation: 'Sathy',
          bloodGroup: 'A+',
          unitsRequired: 1,
          requiredBy: new Date(Date.now() + 86400000),
          contactPersonName: 'Contact',
          contactPersonPhone: '9842199999',
          briefContext: 'Accident trauma',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_PORTAL_ROLE');
    });

    it('should allow a Requester to create an emergency request in pending_verification status', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          patientName: 'Test Student Patient',
          district: 'Erode',
          area: 'Sathyamangalam',
          hospital: 'Government Hospital Sathyamangalam',
          hospitalLocation: 'Sathyamangalam',
          bloodGroup: 'A+',
          unitsRequired: 2,
          requiredBy: new Date(Date.now() + 86400000),
          contactPersonName: 'Student Friend',
          contactPersonPhone: '9842199999',
          briefContext: 'Urgent surgery blood requirement',
        });

      expect(res.status).toBe(201);
      expect(res.body.request.status).toBe('pending_verification');
      expect(res.body.request.requestId).toMatch(/^BIT-REQ-/);
    });

    it('should prevent student from approving or broadcasting requests', async () => {
      const res = await request(app)
        .put('/api/coordinator/requests/dummyId/verify')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ coordinatorNotes: 'Hacking approval' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('should allow college coordinator to verify and broadcast request', async () => {
      // 1. Create a request to test full lifecycle
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          patientName: 'College Student Trauma ICU',
          district: 'Erode',
          area: 'Sathyamangalam',
          hospital: 'KMCH Erode',
          hospitalLocation: 'Erode',
          bloodGroup: 'O+',
          unitsRequired: 1,
          requiredBy: new Date(Date.now() + 86400000),
          contactPersonName: 'Faculty Incharge',
          contactPersonPhone: '9842188888',
          briefContext: 'Trauma ward admission',
        });

      const requestId = createRes.body.request._id;

      // 2. Coordinator verifies request
      const verifyRes = await request(app)
        .put(`/api/coordinator/requests/${requestId}/verify`)
        .set('Cookie', coordinatorToken)
        .send({ coordinatorNotes: 'Doctor prescription and casualty admission verified.' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.request.status).toBe('verified');

      // 3. Coordinator broadcasts request
      const broadcastRes = await request(app)
        .post(`/api/coordinator/requests/${requestId}/broadcast`)
        .set('Cookie', coordinatorToken)
        .send();

      expect(broadcastRes.status).toBe(200);
      expect(broadcastRes.body.request.status).toBe('broadcast');

      const adminRecords = await request(app).get('/api/admin/users').set('Cookie', coordinatorToken);
      expect(adminRecords.status).toBe(403);

      // 4. Rate-limiting check: repeating broadcast immediately is rejected
      const repeatBroadcastRes = await request(app)
        .post(`/api/coordinator/requests/${requestId}/broadcast`)
        .set('Cookie', coordinatorToken)
        .send();

      expect(repeatBroadcastRes.status).toBe(429);
    });
  });

  describe('4. Privacy Safe Donor Search', () => {
    let studentToken: string;

    beforeAll(async () => {
      const donor = await StudentRegistration.findOne({ googleEmail: 'test.donor2@bitsathy.ac.in' });
      const res = await request(app).post('/api/auth/google').send({
        credential: `mock-test-token:${donor!.googleEmail}:sub-donor2:Donor User`,
      });
      studentToken = res.body.token;
    });

    it('should redact student private phone numbers from general search results', async () => {
      const res = await request(app)
        .get('/api/donors/search?bloodGroup=O+')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.donors.length).toBeGreaterThan(0);
      for (const donor of res.body.donors) {
        expect(donor.mobile).toBeUndefined();
        expect(donor.disclaimer).toContain('Self-reported blood group');
        expect(donor.contactPolicy).toContain('Private phone numbers protected');
      }
    });
  });
});
