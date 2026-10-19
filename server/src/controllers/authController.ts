import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyGoogleIdToken } from '../services/googleAuthService';
import { sendAdminLoginEmail, sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import { StudentRegistration, checkProfileCompletion, IStudentRegistration } from '../models/StudentRegistration';
import { signSessionToken, AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { ENV } from '../config/env';

const COLLEGE_EMAIL_DOMAIN = 'bitsathy.ac.in';
const isCollegeEmail = (email: string) => {
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1] === COLLEGE_EMAIL_DOMAIN;
};
const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => {
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

/**
 * Sets secure HttpOnly cookie for the session token
 */
const setSessionCookie = (res: Response, token: string): void => {
  res.cookie('bit_session_token', token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
};

/**
 * Formats a clean public user payload
 */
export const formatUserPayload = (student: IStudentRegistration) => {
  const isComplete = checkProfileCompletion(student);
  return {
    id: student._id.toString(),
    _id: student._id.toString(),
    email: student.googleEmail,
    googleEmail: student.googleEmail,
    collegeEmail: student.collegeEmail || student.googleEmail,
    name: student.name,
    userType: student.userType || 'Student',
    registerNumber: student.registerNumber,
    department: student.department,
    year: student.year,
    selectedRole: student.selectedRole,
    portalRole: student.portalRole || student.selectedRole,
    systemRole: student.systemRole,
    bloodGroup: student.bloodGroup,
    mobile: student.mobile,
    district: student.district || 'Erode',
    residenceType: student.residenceType || 'Hostel',
    approximateArea: student.approximateArea,
    currentWillingness: student.currentWillingness,
    isProfileComplete: isComplete,
    consentEmergencyCommunications: student.consentEmergencyCommunications,
    shareContactWithRequesters: student.shareContactWithRequesters,
    lastDonationDate: student.lastDonationDate,
    availabilityLastConfirmedAt: student.availabilityLastConfirmedAt,
    nonDonationHelp: student.nonDonationHelp,
    notificationPreferences: student.notificationPreferences,
    status: student.status,
  };
};

/**
 * Google Workspace Sign-In & New Registration
 * Cryptographically verifies Google ID Token. Identity must be verified on backend; typing email alone is rejected.
 */
export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { credential, registrationIntent } = req.body;
    if (!credential) {
      res.status(400).json({
        success: false,
        message: 'Google credential ID token is required. Access cannot be granted without verified Google authentication.',
      });
      return;
    }

    // 1. Verify Google ID token and enforce Workspace hosted domain bitsathy.ac.in
    const verifiedUser = await verifyGoogleIdToken(credential);
    const email = verifiedUser.email.toLowerCase().trim();
    const isAllowlistedAdmin = ENV.INITIAL_ADMIN_EMAILS.includes(email);

    // 2. Query student registration in MongoDB
    let student = await StudentRegistration.findOne({ googleEmail: email });
    if (isAllowlistedAdmin && (student?.systemRole !== 'admin' || student.status !== 'active')) {
      res.status(403).json({ success: false, code: 'ADMIN_NOT_PROVISIONED', message: 'This allowlisted administrator account is not actively provisioned.' });
      return;
    }
    if (student?.systemRole === 'admin' && !isAllowlistedAdmin) {
      res.status(403).json({ success: false, code: 'ADMIN_NOT_ALLOWLISTED', message: 'This administrator account is not present in the server allowlist.' });
      return;
    }
    const isNewUser = !student;

    if (!student) {
      // Auto-provision a verified BIT student profile directly in MongoDB.
      const nameParts = verifiedUser.name || email.split('@')[0];

      student = new StudentRegistration({
        googleEmail: email,
        collegeEmail: email,
        googleSubjectId: verifiedUser.googleSubjectId || '',
        name: verifiedUser.name || nameParts,
        userType: 'Student',
        registerNumber: '',
        department: '',
        year: '',
        selectedRole: 'Both',
        portalRole: 'Both',
        bloodGroup: 'Unknown',
        mobile: '',
        district: 'Erode',
        approximateArea: '',
        residenceType: 'Hostel',
        currentWillingness: 'Willing',
        systemRole: 'student',
        status: 'active',
        syncStatus: 'synced',
        isProfileComplete: false,
        availabilityLastConfirmedAt: new Date(),
        emailVerifiedAt: new Date(),
      });

      await student.save();
    }

    // 3. Check synchronization & review status
    if (student.status === 'blocked') {
      res.status(403).json({
        success: false,
        code: 'ACCOUNT_BLOCKED',
        status: 'BLOCKED',
        email,
        message: 'Your account has been deactivated or suspended by college administrators.',
      });
      return;
    }

    if (student.status === 'pending_review' || student.syncStatus === 'pending_review') {
      res.status(403).json({
        success: false,
        code: 'PENDING_ADMIN_REVIEW',
        status: 'PENDING_REVIEW',
        email,
        message: 'Your registration is currently under administrative review. Please contact the college coordinator.',
      });
      return;
    }

    // 4. Update Google subject ID if not already saved
    if (!student.googleSubjectId && verifiedUser.googleSubjectId) {
      student.googleSubjectId = verifiedUser.googleSubjectId;
    }
    student.emailVerifiedAt = student.emailVerifiedAt || new Date();

    if ((student.systemRole === 'coordinator' && !student.coordinatorProvisionedAt && !ENV.INITIAL_COORDINATOR_EMAILS.includes(student.googleEmail)) || (student.systemRole !== 'student' && student.systemRole !== 'coordinator' && student.systemRole !== 'admin')) {
      res.status(403).json({ success: false, code: 'PRIVILEGED_LOGIN_NOT_ALLOWED', message: 'This privileged account is not authorized for Google sign-in.' });
      return;
    }
    if (student.systemRole === 'admin' && !isAllowlistedAdmin) {
      res.status(403).json({ success: false, code: 'ADMIN_NOT_ALLOWLISTED', message: 'This administrator account is not present in the server allowlist.' });
      return;
    }
    // Recheck profile completion
    if (student.systemRole === 'student') student.isProfileComplete = checkProfileCompletion(student);
    await student.save();

    // 6. Generate Session Token & set HttpOnly Cookie
    const token = signSessionToken(student);
    setSessionCookie(res, token);

    // 7. Audit log login
    await logAudit({
      actorId: student._id,
      actorEmail: student.googleEmail,
      actorRole: student.systemRole,
      action: student.systemRole === 'admin' ? 'LOGIN_GOOGLE_ADMIN' : isNewUser ? 'REGISTER_GOOGLE' : 'LOGIN_GOOGLE',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: {
        registrationIntent: Boolean(registrationIntent),
        isProfileComplete: student.isProfileComplete,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      token,
      isNewUser,
      isProfileComplete: student.isProfileComplete,
      message: isNewUser
        ? 'Welcome to the BIT Blood Donation Portal! Please complete your profile.'
        : `Signed in successfully as ${student.name}`,
      user: formatUserPayload(student),
    });
  } catch (error: any) {
    next(error);
  }
};

export const registerWithPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').toLowerCase().trim();
    const password = String(req.body?.password || '');
    const userType = 'Student';
    const registerNumber = String(req.body?.registerNumber || '').trim().toUpperCase();
    const department = String(req.body?.department || '').trim();
    const year = String(req.body?.year || '').trim();
    const bloodGroup = req.body?.bloodGroup;
    const mobile = String(req.body?.mobile || '').replace(/\D/g, '');
    const district = String(req.body?.district || '').trim();
    const approximateArea = String(req.body?.approximateArea || '').trim();
    const role = req.body?.role;
    const currentWillingness = req.body?.currentWillingness;
    const consentEmergencyCommunications = Boolean(req.body?.consentEmergencyCommunications);
    const shareContactWithRequesters = Boolean(req.body?.shareContactWithRequesters);
    if (!isCollegeEmail(email)) {
      res.status(400).json({ success: false, code: 'COLLEGE_EMAIL_REQUIRED', message: `Use an email ending exactly in @${COLLEGE_EMAIL_DOMAIN}.` });
      return;
    }
    if (name.length < 2 || name.length > 100 || !/^\d{6}$/.test(password) || registerNumber.length < 2 || department.length < 2 || (userType === 'Student' && !year) || !['Donor', 'Requester', 'Both'].includes(role) || !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].includes(bloodGroup) || mobile.length < 10 || mobile.length > 15 || district.length < 2 || approximateArea.length < 2 || !['Willing', 'Temporarily Unavailable', 'Not Willing'].includes(currentWillingness)) {
      res.status(400).json({ success: false, code: 'INVALID_REGISTRATION', message: 'Complete all required profile fields and use a password containing exactly 6 digits.' });
      return;
    }
    if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASS) {
      res.status(503).json({ success: false, code: 'EMAIL_VERIFICATION_UNAVAILABLE', message: 'Email verification is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM on the server before registering.' });
      return;
    }
    const existing = await StudentRegistration.findOne({ googleEmail: email });
    if (existing) {
      res.status(409).json({ success: false, code: 'ACCOUNT_EXISTS', message: 'An account already exists for this college email. Sign in or use password reset.' });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const student = await StudentRegistration.create({
      googleEmail: email,
      collegeEmail: email,
      name,
      userType,
      registerNumber,
      department,
      year,
      selectedRole: role,
      portalRole: role,
      systemRole: 'student',
      bloodGroup,
      mobile,
      district,
      approximateArea,
      currentWillingness,
      consentEmergencyCommunications,
      shareContactWithRequesters,
      isProfileComplete: true,
      status: 'active',
      syncStatus: 'synced',
      passwordHash: hashPassword(password),
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (error) {
      await StudentRegistration.deleteOne({ _id: student._id, emailVerifiedAt: { $exists: false } });
      throw error;
    }
    await logAudit({
      actorId: student._id,
      actorEmail: student.googleEmail,
      actorRole: student.systemRole,
      action: 'REGISTER_PASSWORD_PENDING_VERIFICATION',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { portalRole: student.portalRole, profileComplete: student.isProfileComplete },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, message: 'Registration received. Check your college inbox for the verification link before signing in.' });
  } catch (error) { next(error); }
};

export const verifyEmailAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const token = String(req.body?.token || '');
    if (!isCollegeEmail(email) || !token) {
      res.status(400).json({ success: false, message: 'A valid college email and verification token are required.' });
      return;
    }
    const student = await StudentRegistration.findOne({
      googleEmail: email,
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
    if (!student) {
      res.status(400).json({ success: false, message: 'This verification link is invalid or expired. Request a new registration link.' });
      return;
    }
    student.emailVerifiedAt = new Date();
    student.emailVerificationTokenHash = undefined;
    student.emailVerificationExpiresAt = undefined;
    await student.save();
    res.status(200).json({ success: true, message: 'College email verified. You can now sign in and complete your profile.' });
  } catch (error) { next(error); }
};

export const loginWithPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const password = String(req.body?.password || '');
    if (!isCollegeEmail(email) || !password) {
      res.status(400).json({ success: false, message: `Use your exact @${COLLEGE_EMAIL_DOMAIN} email and password.` });
      return;
    }
    const student = await StudentRegistration.findOne({ googleEmail: email }).select('+passwordHash +emailVerifiedAt');
    if (!student?.passwordHash || !verifyPassword(password, student.passwordHash)) {
      res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
      return;
    }
    if (student.systemRole === 'student' && !student.emailVerifiedAt) {
      res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your college email using the link sent to your inbox before signing in.' });
      return;
    }
    if (student.systemRole === 'admin') {
      if (!ENV.INITIAL_ADMIN_EMAILS.includes(email) && !student.adminProvisionedAt) {
        res.status(403).json({ success: false, code: 'ADMIN_NOT_ALLOWLISTED', message: 'This administrator is not present in the server allowlist.' });
        return;
      }
    } else if (student.systemRole === 'coordinator') {
      if (!student.coordinatorProvisionedAt && !ENV.INITIAL_COORDINATOR_EMAILS.includes(email)) {
        res.status(403).json({ success: false, code: 'COORDINATOR_NOT_PROVISIONED', message: 'This coordinator account was not provisioned by the server.' });
        return;
      }
    } else if (student.systemRole !== 'student') {
      res.status(403).json({ success: false, code: 'USE_PROVISIONED_ACCOUNT', message: 'This privileged account is not authorized for password sign-in.' });
      return;
    }
    if (student.status !== 'active') {
      res.status(403).json({ success: false, code: 'ACCOUNT_UNAVAILABLE', message: 'This account is not active. Contact a portal coordinator.' });
      return;
    }
    const token = signSessionToken(student);
    setSessionCookie(res, token);
    res.status(200).json({ success: true, user: formatUserPayload(student), message: 'Signed in successfully.' });
  } catch (error) { next(error); }
};

export const requestAdminLoginLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!isCollegeEmail(email) || !ENV.INITIAL_ADMIN_EMAILS.includes(email)) {
      res.status(200).json({ success: true, message: 'If this address is an active provisioned administrator, a sign-in link will be emailed.' });
      return;
    }

    const student = await StudentRegistration.findOne({ googleEmail: email, systemRole: 'admin', status: 'active' })
      .select('+adminLoginTokenHash +adminLoginTokenExpiresAt');
    if (!student) {
      res.status(200).json({ success: true, message: 'If this address is an active provisioned administrator, a sign-in link will be emailed.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    student.adminLoginTokenHash = hashToken(token);
    student.adminLoginTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await student.save();
    try {
      await sendAdminLoginEmail(email, token);
    } catch (error) {
      student.adminLoginTokenHash = undefined;
      student.adminLoginTokenExpiresAt = undefined;
      await student.save();
      throw error;
    }
    res.status(200).json({ success: true, message: 'A secure, single-use administrator sign-in link was emailed. It expires in 15 minutes.' });
  } catch (error) { next(error); }
};

export const verifyAdminLoginLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const token = String(req.body?.token || '');
    if (!isCollegeEmail(email) || !token || !ENV.INITIAL_ADMIN_EMAILS.includes(email)) {
      res.status(400).json({ success: false, message: 'This administrator sign-in link is invalid or expired.' });
      return;
    }
    const student = await StudentRegistration.findOne({
      googleEmail: email,
      systemRole: 'admin',
      status: 'active',
      adminLoginTokenHash: hashToken(token),
      adminLoginTokenExpiresAt: { $gt: new Date() },
    }).select('+adminLoginTokenHash +adminLoginTokenExpiresAt');
    if (!student) {
      res.status(400).json({ success: false, message: 'This administrator sign-in link is invalid or expired.' });
      return;
    }
    student.adminLoginTokenHash = undefined;
    student.adminLoginTokenExpiresAt = undefined;
    await student.save();
    const sessionToken = signSessionToken(student);
    setSessionCookie(res, sessionToken);
    await logAudit({ actorId: student._id, actorEmail: student.googleEmail, actorRole: student.systemRole, action: 'ADMIN_LOGIN_EMAIL_LINK', targetEntity: 'StudentRegistration', targetId: student._id.toString(), ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.status(200).json({ success: true, user: formatUserPayload(student), message: 'Administrator signed in.' });
  } catch (error) { next(error); }
};

export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const generic = 'If an active account exists for that college email, a password reset link has been sent.';
    if (!isCollegeEmail(email)) {
      res.status(200).json({ success: true, message: generic });
      return;
    }
    const student = await StudentRegistration.findOne({ googleEmail: email }).select('+passwordHash +emailVerifiedAt');
    const provisioned = student?.systemRole === 'admin'
      ? Boolean(student.adminProvisionedAt || ENV.INITIAL_ADMIN_EMAILS.includes(email))
      : student?.systemRole === 'coordinator'
        ? Boolean(student.coordinatorProvisionedAt || ENV.INITIAL_COORDINATOR_EMAILS.includes(email))
        : Boolean(student?.systemRole === 'student' && student.emailVerifiedAt);
    if (student?.passwordHash && student.status === 'active' && provisioned) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      student.passwordResetTokenHash = hashToken(rawToken);
      student.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await student.save();
      await sendPasswordResetEmail(email, rawToken);
    }
    res.status(200).json({ success: true, message: generic });
  } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (!isCollegeEmail(email) || !token || !/^\d{6}$/.test(password)) {
      res.status(400).json({ success: false, message: 'Provide a valid reset link and a password containing exactly 6 digits.' });
      return;
    }
    const student = await StudentRegistration.findOne({
      googleEmail: email,
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +emailVerifiedAt');
    const provisioned = student?.systemRole === 'admin'
      ? Boolean(student.adminProvisionedAt || ENV.INITIAL_ADMIN_EMAILS.includes(email))
      : student?.systemRole === 'coordinator'
        ? Boolean(student.coordinatorProvisionedAt || ENV.INITIAL_COORDINATOR_EMAILS.includes(email))
        : Boolean(student?.systemRole === 'student' && student.emailVerifiedAt);
    if (!student || student.status !== 'active' || !provisioned) {
      res.status(400).json({ success: false, message: 'This password reset link is invalid or expired.' });
      return;
    }
    student.passwordHash = hashPassword(password);
    student.passwordResetTokenHash = undefined;
    student.passwordResetExpiresAt = undefined;
    await student.save();
    res.status(200).json({ success: true, message: 'Password updated. Sign in with your new password.' });
  } catch (error) { next(error); }
};

/**
 * Required Profile Completion / Update
 * Saves and validates all required fields:
 * Full name, Student/Staff, Register No/Staff ID, Department, Year, Blood Group, Mobile, District, Area, Role, Willingness, Consent
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const {
      name,
      userType,
      registerNumber,
      department,
      year,
      bloodGroup,
      mobile,
      district,
      approximateArea,
      residenceType,
      portalRole,
      currentWillingness,
      consentEmergencyCommunications,
      shareContactWithRequesters,
      notificationPreferences,
    } = req.body;

    const student = await StudentRegistration.findById(req.user._id);
    if (!student) {
      res.status(404).json({ success: false, message: 'User record not found.' });
      return;
    }

    // Update fields
    if (typeof name === 'string' && name.trim()) student.name = name.trim();
    if (userType && userType !== 'Student') {
      res.status(400).json({ success: false, code: 'STUDENT_ACCOUNT_REQUIRED', message: 'Only student profiles can use this portal.' });
      return;
    }
    student.userType = 'Student';
    if (typeof registerNumber === 'string' && registerNumber.trim()) {
      student.registerNumber = registerNumber.trim().toUpperCase();
    }
    if (typeof department === 'string' && department.trim()) student.department = department.trim();
    if (typeof year === 'string' && year.trim()) {
      student.year = year.trim();
    }

    if (bloodGroup && ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].includes(bloodGroup)) {
      student.bloodGroup = bloodGroup;
    }

    if (typeof mobile === 'string' && mobile.trim()) {
      student.mobile = mobile.trim();
    }

    if (typeof district === 'string' && district.trim()) {
      student.district = district.trim();
    }

    if (typeof approximateArea === 'string' && approximateArea.trim()) {
      student.approximateArea = approximateArea.trim();
    }

    if (residenceType && ['Hostel', 'Day Scholar'].includes(residenceType)) {
      student.residenceType = residenceType;
    }

    if (portalRole && ['Donor', 'Requester', 'Both'].includes(portalRole)) {
      student.portalRole = portalRole;
      student.selectedRole = portalRole;
    }

    if (currentWillingness && ['Willing', 'Temporarily Unavailable', 'Not Willing'].includes(currentWillingness)) {
      student.currentWillingness = currentWillingness;
    }

    if (consentEmergencyCommunications !== undefined) {
      student.consentEmergencyCommunications = Boolean(consentEmergencyCommunications);
    }
    if (shareContactWithRequesters !== undefined) student.shareContactWithRequesters = Boolean(shareContactWithRequesters);

    if (notificationPreferences) {
      student.notificationPreferences = {
        emergencyAlerts: Boolean(notificationPreferences.emergencyAlerts ?? student.notificationPreferences?.emergencyAlerts),
        donorAlerts: Boolean(notificationPreferences.donorAlerts ?? student.notificationPreferences?.donorAlerts),
        generalAlerts: Boolean(notificationPreferences.generalAlerts ?? student.notificationPreferences?.generalAlerts),
      };
    }

    // Evaluate profile completion status
    const isNowComplete = checkProfileCompletion(student);
    student.isProfileComplete = isNowComplete;
    student.portalEditedAt = new Date();
    await student.save();

    await logAudit({
      actorId: student._id,
      actorEmail: student.googleEmail,
      actorRole: student.systemRole,
      action: 'UPDATE_PROFILE',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: {
        isProfileComplete: isNowComplete,
        userType: student.userType,
        bloodGroup: student.bloodGroup,
        district: student.district,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      message: isNowComplete
        ? 'Profile completed successfully! Blood requests and donor response features are now active.'
        : 'Profile details saved. Please fill in any missing fields to unlock full donor and request capabilities.',
      user: formatUserPayload(student),
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const isComplete = checkProfileCompletion(req.user);
    if (req.user.isProfileComplete !== isComplete) {
      req.user.isProfileComplete = isComplete;
      await req.user.save();
    }

    res.status(200).json({
      success: true,
      user: formatUserPayload(req.user),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePortalRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { role } = req.body;
    if (!['Donor', 'Requester', 'Both'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role specified' });
      return;
    }

    const student = await StudentRegistration.findById(req.user._id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    student.portalRole = role;
    student.portalEditedAt = new Date();
    await student.save();

    await logAudit({
      actorId: student._id,
      actorEmail: student.googleEmail,
      actorRole: student.systemRole,
      action: 'UPDATE_PORTAL_ROLE',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { previousRole: req.user.portalRole, newRole: role },
    });

    res.status(200).json({
      success: true,
      message: `Role preference updated to ${role}.`,
      portalRole: student.portalRole,
      user: formatUserPayload(student),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response): void => {
  res.clearCookie('bit_session_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: ENV.NODE_ENV === 'production',
  });
  res.status(200).json({ success: true, message: 'Signed out successfully.' });
};

