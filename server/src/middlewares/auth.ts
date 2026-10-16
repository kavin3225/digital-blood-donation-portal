import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { StudentRegistration, IStudentRegistration, SystemRoleType, RoleType, checkProfileCompletion } from '../models/StudentRegistration';

export interface AuthenticatedRequest extends Request {
  user?: IStudentRegistration;
}

export interface JwtSessionPayload {
  userId: string;
  email: string;
  systemRole: SystemRoleType;
  portalRole: RoleType;
}

export const signSessionToken = (user: IStudentRegistration): string => {
  const payload: JwtSessionPayload = {
    userId: user._id.toString(),
    email: user.googleEmail,
    systemRole: user.systemRole,
    portalRole: user.portalRole || user.selectedRole,
  };
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.bit_session_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication session required. Please sign in with your college account.',
      });
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtSessionPayload;
    const user = await StudentRegistration.findById(decoded.userId).select('+emailVerifiedAt +passwordHash');

    if (!user) {
      res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Account not found in registered records.',
      });
      return;
    }

    const exactCollegeEmail = /^[^@\s]+@bitsathy\.ac\.in$/i.test(user.googleEmail || '');
    const authenticatedAccount = user.systemRole === 'student'
      ? Boolean(user.emailVerifiedAt)
      : user.systemRole === 'coordinator'
        ? Boolean(user.coordinatorProvisionedAt || ENV.INITIAL_COORDINATOR_EMAILS.includes(user.googleEmail))
        : Boolean(user.adminProvisionedAt || ENV.INITIAL_ADMIN_EMAILS.includes(user.googleEmail));
    if (!exactCollegeEmail || !authenticatedAccount) {
      res.status(403).json({
        success: false,
        code: 'COLLEGE_IDENTITY_UNVERIFIED',
        message: 'An active @bitsathy.ac.in account is required to access the portal.',
      });
      return;
    }

    // Account status enforcement
    if (user.status === 'blocked') {
      res.status(403).json({
        success: false,
        code: 'ACCOUNT_BLOCKED',
        message: 'Your account has been deactivated or suspended by college administrators.',
      });
      return;
    }

    if (user.status === 'pending_review' || user.syncStatus === 'pending_review') {
      res.status(403).json({
        success: false,
        code: 'PENDING_REVIEW',
        message: 'Your profile registration is currently pending college administrative review.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      code: 'INVALID_SESSION',
      message: 'Session is invalid or expired. Please sign in again.',
    });
  }
};

/**
 * Ensures user has required system role (e.g. coordinator or admin)
 */
export const requireSystemRole = (...roles: SystemRoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Admins have access to coordinator actions as well
    const effectiveRoles = [...roles];
    if (effectiveRoles.includes('coordinator') && !effectiveRoles.includes('admin')) {
      effectiveRoles.push('admin');
    }

    if (!effectiveRoles.includes(req.user.systemRole)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: `Forbidden. Action restricted to college ${roles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
};

/**
 * Ensures user has required portal capability (e.g. Donor or Requester or Both)
 */
export const requirePortalRole = (...roles: RoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Admin & Coordinator have cross-cutting access to test and coordinate
    if (req.user.systemRole === 'admin' || req.user.systemRole === 'coordinator') {
      return next();
    }

    const currentRole = req.user.portalRole || req.user.selectedRole;
    // 'Both' can access both Donor and Requester actions
    if (currentRole === 'Both') {
      return next();
    }

    if (!roles.includes(currentRole)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PORTAL_ROLE',
        message: `This action requires ${roles.join(' or ')} permissions. Your active role is ${currentRole}. You can update your role preference in your profile.`,
      });
      return;
    }

    next();
  };
};

/**
 * Ensures user has completed all mandatory profile fields:
 * Name, UserType, RegisterNo/StaffId, Department, Year (for students),
 * Blood Group, Mobile, District, Area, Role preference, and Alert Consent.
 * Strictly blocks blood requests and donation responses until complete.
 */
export const requireCompleteProfile = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const isComplete = checkProfileCompletion(req.user);
  if (!isComplete) {
    res.status(403).json({
      success: false,
      code: 'PROFILE_INCOMPLETE',
      message:
        'Please complete your mandatory profile details (Full name, Student/Staff ID, Department, Blood Group, Mobile, District, Area, etc.) before requesting or donating blood.',
    });
    return;
  }

  next();
};
