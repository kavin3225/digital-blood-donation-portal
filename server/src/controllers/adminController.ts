import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { StudentRegistration, checkProfileCompletion } from '../models/StudentRegistration';
import { EmergencyRequest } from '../models/EmergencyRequest';
import { DonorResponse } from '../models/DonorResponse';
import { FormSyncEvent } from '../models/FormSyncEvent';
import { AuditLog } from '../models/AuditLog';
import { logAudit } from '../services/auditService';
import { NotificationLog } from '../models/NotificationLog';
import { sendWebPushToUser } from '../services/webPushService';

const safeSearch = (value: string) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

/**
 * 1. Directory of ALL signed-in student and staff accounts (including incomplete profiles)
 * Displays: Name, college email, student/staff type, department, blood group, district, area, role, profile completion and account status.
 */
export const getAllUsersAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      search,
      userType,
      department,
      bloodGroup,
      district,
      status,
      profileComplete,
      role,
      page = 1,
      limit = 100,
    } = req.query;

    // Admin identities are intentionally not part of the student/staff directory.
    const filter: any = { systemRole: { $ne: 'admin' } };

    if (search && typeof search === 'string') {
      const regex = safeSearch(search.trim());
      filter.$or = [
        { name: regex },
        { googleEmail: regex },
        { collegeEmail: regex },
        { registerNumber: regex },
        { department: regex },
        { mobile: regex },
        { approximateArea: regex },
      ];
    }

    if (userType && ['Student', 'Staff'].includes(userType as string)) {
      filter.userType = userType;
    }

    if (department && department !== 'All') {
      filter.department = department;
    }

    if (bloodGroup && bloodGroup !== 'All') {
      filter.bloodGroup = (bloodGroup as string).replace(/ /g, '+');
    }

    if (district && district !== 'All') {
      filter.district = district;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (role && role !== 'All') {
      filter.portalRole = role;
    }

    if (profileComplete === 'complete') {
      filter.isProfileComplete = true;
    } else if (profileComplete === 'incomplete') {
      filter.isProfileComplete = false;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total, stats] = await Promise.all([
      StudentRegistration.find(filter)
        .select('-passwordHash -emailVerificationTokenHash -emailVerificationExpiresAt -passwordResetTokenHash -passwordResetExpiresAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      StudentRegistration.countDocuments(filter),
      StudentRegistration.aggregate([
        { $match: { systemRole: { $ne: 'admin' } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completeProfiles: { $sum: { $cond: ['$isProfileComplete', 1, 0] } },
            incompleteProfiles: { $sum: { $cond: ['$isProfileComplete', 0, 1] } },
            students: { $sum: { $cond: [{ $eq: ['$userType', 'Student'] }, 1, 0] } },
            staff: { $sum: { $cond: [{ $eq: ['$userType', 'Staff'] }, 1, 0] } },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    // Ensure isProfileComplete is dynamically up to date
    const formatted = users.map((u) => {
      const complete = checkProfileCompletion(u);
      return {
        _id: u._id,
        id: u._id,
        name: u.name,
        googleEmail: u.googleEmail,
        collegeEmail: u.collegeEmail || u.googleEmail,
        userType: u.userType || 'Student',
        registerNumber: u.registerNumber,
        department: u.department,
        year: u.year,
        bloodGroup: u.bloodGroup,
        mobile: u.mobile,
        district: u.district || 'Erode',
        approximateArea: u.approximateArea,
        portalRole: u.portalRole || u.selectedRole,
        systemRole: u.systemRole,
        isProfileComplete: complete,
        status: u.status,
        currentWillingness: u.currentWillingness,
        availabilityLastConfirmedAt: u.availabilityLastConfirmedAt,
        consentEmergencyCommunications: u.consentEmergencyCommunications,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      stats: stats[0] || {
        total,
        completeProfiles: 0,
        incompleteProfiles: 0,
        students: 0,
        staff: 0,
        active: 0,
        blocked: 0,
      },
      users: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/** Grant or revoke coordinator access for an existing, active college account. */
export const setUserSystemRoleAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { studentId } = req.params;
    const { systemRole } = req.body;
    if (!['student', 'coordinator'].includes(systemRole)) {
      res.status(400).json({ success: false, message: 'Choose student or coordinator.' });
      return;
    }

    const student = await StudentRegistration.findById(studentId).select('+emailVerifiedAt');
    if (!student || student.systemRole === 'admin') {
      res.status(404).json({ success: false, message: 'Student/staff account not found.' });
      return;
    }
    if (!/^[^@\s]+@bitsathy\.ac\.in$/i.test(student.googleEmail) || !student.emailVerifiedAt) {
      res.status(400).json({ success: false, message: 'Coordinator access requires a verified @bitsathy.ac.in account.' });
      return;
    }
    if (student.status !== 'active') {
      res.status(400).json({ success: false, message: 'Only active accounts can be assigned coordinator access.' });
      return;
    }

    const previousRole = student.systemRole;
    student.systemRole = systemRole;
    if (systemRole === 'coordinator') {
      student.coordinatorProvisionedAt = new Date();
      student.coordinatorProvisionedBy = req.user._id;
    } else {
      student.coordinatorProvisionedAt = undefined;
      student.coordinatorProvisionedBy = undefined;
    }
    await student.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: systemRole === 'coordinator' ? 'ADMIN_GRANTED_COORDINATOR_ROLE' : 'ADMIN_REVOKED_COORDINATOR_ROLE',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { targetEmail: student.googleEmail, previousRole, newRole: systemRole },
    });

    res.status(200).json({ success: true, message: `${student.googleEmail} is now ${systemRole}.`, systemRole });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Update user profile / account status / system role by administrator
 */
export const updateUserAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { studentId } = req.params;
    const updates = req.body;

    const student = await StudentRegistration.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student/staff account not found' });
      return;
    }

    if (student._id.equals(req.user._id) && updates.status === 'blocked') {
      res.status(400).json({ success: false, message: 'You cannot suspend your own administrator account.' });
      return;
    }

    if (updates.name) student.name = updates.name.trim();
    if (updates.userType && ['Student', 'Staff'].includes(updates.userType)) student.userType = updates.userType;
    if (updates.registerNumber) student.registerNumber = updates.registerNumber.trim().toUpperCase();
    if (updates.department) student.department = updates.department.trim();
    if (updates.year) student.year = updates.year.trim();
    if (updates.bloodGroup) student.bloodGroup = updates.bloodGroup;
    if (updates.mobile) student.mobile = updates.mobile.trim();
    if (updates.district) student.district = updates.district.trim();
    if (updates.approximateArea) student.approximateArea = updates.approximateArea.trim();
    if (updates.portalRole) {
      student.portalRole = updates.portalRole;
      student.selectedRole = updates.portalRole;
    }
    if (updates.status && ['active', 'blocked', 'pending_review'].includes(updates.status)) {
      student.status = updates.status;
    }
    if (updates.currentWillingness) student.currentWillingness = updates.currentWillingness;

    student.isProfileComplete = checkProfileCompletion(student);
    student.portalEditedAt = new Date();
    await student.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'ADMIN_UPDATED_USER',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { targetEmail: student.googleEmail, changedFields: Object.keys(updates).filter((field) => ['name', 'userType', 'registerNumber', 'department', 'year', 'bloodGroup', 'mobile', 'district', 'approximateArea', 'portalRole', 'status', 'currentWillingness'].includes(field)) },
    });

    res.status(200).json({
      success: true,
      message: `Updated account details for ${student.name} (${student.googleEmail}).`,
      student: { id: student._id, name: student.name, email: student.googleEmail, systemRole: student.systemRole, status: student.status },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. All Emergency Requests Management for Administrator
 */
export const getAllRequestsAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, bloodGroup, search } = req.query;
    const filter: any = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (bloodGroup && bloodGroup !== 'All') {
      filter.bloodGroup = (bloodGroup as string).replace(/ /g, '+');
    }

    if (search && typeof search === 'string') {
      const regex = safeSearch(search.trim());
      filter.$or = [
        { requestId: regex },
        { patientEmail: regex },
        { patientName: regex },
        { requesterEmail: regex },
        { requesterName: regex },
        { district: regex },
        { area: regex },
        { contactPersonName: regex },
      ];
    }

    const requests = await EmergencyRequest.find(filter).sort({ createdAt: -1 });

    // Attach response counts
    const requestIds = requests.map((r) => r._id);
    const responses = await DonorResponse.aggregate([
      { $match: { requestId: { $in: requestIds } } },
      { $group: { _id: '$requestId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(responses.map((item) => [item._id.toString(), item.count]));

    const enriched = requests.map((r) => ({
      ...r.toObject(),
      donorResponseCount: countMap.get(r._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      count: enriched.length,
      requests: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllDonorResponsesAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { responseType, search } = req.query;
    const filter: any = {};
    if (responseType && responseType !== 'All') filter.responseType = responseType;
    if (typeof search === 'string' && search.trim()) {
      const regex = safeSearch(search.trim());
      const matchingUsers = await StudentRegistration.find({ $or: [{ name: regex }, { googleEmail: regex }] }).distinct('_id');
      const matchingRequests = await EmergencyRequest.find({ $or: [{ requestId: regex }, { area: regex }, { district: regex }] }).distinct('_id');
      filter.$or = [{ donorId: { $in: matchingUsers } }, { requestId: { $in: matchingRequests } }];
    }
    const responses = await DonorResponse.find(filter)
      .populate('requestId', 'requestId status bloodGroup unitsRequired district area requiredBy')
      .populate('donorId', 'name googleEmail portalRole bloodGroup')
      .sort({ respondedAt: -1 }).limit(500);
    res.status(200).json({ success: true, count: responses.length, responses });
  } catch (error) { next(error); }
};

export const getAllNotificationsAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.type && req.query.type !== 'All') filter.type = req.query.type;
    const notifications = await NotificationLog.find(filter).sort({ createdAt: -1 }).limit(500);
    res.status(200).json({ success: true, count: notifications.length, notifications });
  } catch (error) { next(error); }
};

export const moderateRequestAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const request = await EmergencyRequest.findById(req.params.requestId);
    if (!request) { res.status(404).json({ success: false, message: 'Request not found.' }); return; }
    const nextStatus = req.body?.status;
    const allowed = ['broadcast', 'coordinating', 'fulfilled', 'cancelled', 'rejected'];
    if (!allowed.includes(nextStatus)) { res.status(400).json({ success: false, message: 'Choose a valid moderation status.' }); return; }
    request.status = nextStatus;
    if (nextStatus === 'broadcast') { request.verifiedAt = request.verifiedAt || new Date(); request.broadcastAt = new Date(); }
    if (['fulfilled', 'cancelled', 'rejected'].includes(nextStatus)) request.closedAt = new Date();
    if (typeof req.body?.note === 'string') request.coordinatorNotes = req.body.note.slice(0, 500);
    await request.save();
    await logAudit({ actorId: req.user?._id, actorEmail: req.user?.googleEmail || '', actorRole: 'admin', action: 'ADMIN_MODERATED_REQUEST', targetEntity: 'EmergencyRequest', targetId: request._id.toString(), details: { requestId: request.requestId, status: nextStatus } });
    res.status(200).json({ success: true, request });
  } catch (error) { next(error); }
};

export const permanentlyDeleteAdminRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestIds = req.body?.requestIds;
    if (!Array.isArray(requestIds) || requestIds.length === 0 || requestIds.length > 10000 || requestIds.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) {
      res.status(400).json({ success: false, message: 'Select between 1 and 10,000 valid requests.' }); return;
    }
    const uniqueIds = [...new Set(requestIds)];
    const requests = await EmergencyRequest.find({ _id: { $in: uniqueIds } }).select('_id requestId requesterEmail status');
    if (!requests.length) {
      res.status(200).json({ success: true, deletedCount: 0, message: 'No matching requests were found.' }); return;
    }
    const ids = requests.map((request) => request._id);
    await logAudit({
      actorId: req.user?._id,
      actorEmail: req.user?.googleEmail || '',
      actorRole: 'admin',
      action: 'ADMIN_BULK_REQUESTS_DELETED',
      targetEntity: 'EmergencyRequest',
      details: { requestIds: requests.map((request) => request.requestId), count: requests.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await Promise.all([
      DonorResponse.deleteMany({ requestId: { $in: ids } }),
      NotificationLog.deleteMany({ requestId: { $in: ids } }),
    ]);
    const deleted = await EmergencyRequest.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ success: true, deletedCount: deleted.deletedCount || 0, message: 'Selected requests and their donor responses were permanently deleted.' });
  } catch (error) { next(error); }
};

export const sendPortalAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    if (title.length < 3 || title.length > 100 || body.length < 5 || body.length > 500) {
      res.status(400).json({ success: false, message: 'Provide a title (3–100 characters) and message (5–500 characters).' }); return;
    }
    const recipients = await StudentRegistration.find({ status: 'active', googleSubjectId: { $exists: true, $ne: '' }, consentEmergencyCommunications: true, 'notificationPreferences.generalAlerts': true }).select('_id googleEmail');
    if (recipients.length) {
      await NotificationLog.insertMany(recipients.map((recipient) => ({ recipientId: recipient._id, recipientEmail: recipient.googleEmail, type: 'coordinator_assignment', title, body, channel: 'in_app', deliveryStatus: 'provider_accepted', read: false, metadata: { announcement: true } })), { ordered: false });
      for (let index = 0; index < recipients.length; index += 50) {
        await Promise.allSettled(recipients.slice(index, index + 50).map((recipient) => sendWebPushToUser({ recipientId: recipient._id, recipientEmail: recipient.googleEmail, type: 'coordinator_assignment', title, body, data: { announcement: 'true' } })));
      }
    }
    await logAudit({ actorId: req.user?._id, actorEmail: req.user?.googleEmail || '', actorRole: 'admin', action: 'PORTAL_ANNOUNCEMENT_SENT', targetEntity: 'NotificationLog', details: { title, recipients: recipients.length } });
    res.status(201).json({ success: true, recipients: recipients.length, message: `Saved an in-app announcement for ${recipients.length} active, opted-in account(s).` });
  } catch (error) { next(error); }
};

export const getSuspiciousRegistrations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const list = await StudentRegistration.find({
      $or: [{ status: 'pending_review' }, { syncStatus: 'conflict_flagged' }],
    }).sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: list.length, registrations: list });
  } catch (error) {
    next(error);
  }
};

export const resolveSuspiciousRegistration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { studentId } = req.params;
    const { decision, reason } = req.body; // 'approve' | 'block'

    const student = await StudentRegistration.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    if (decision === 'approve') {
      student.status = 'active';
      student.syncStatus = 'synced';
      student.suspiciousReason = `Resolved and approved by admin (${reason || 'Identity confirmed'})`;
    } else {
      student.status = 'blocked';
      student.syncStatus = 'blocked';
      student.suspiciousReason = `Blocked by admin: ${reason || 'Unverified identity'}`;
    }

    await student.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'ADMIN_RESOLVED_REGISTRATION',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { decision, reason, studentEmail: student.googleEmail },
    });

    res.status(200).json({
      success: true,
      message: `Registration marked as ${student.status}.`,
      student,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAccountStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { studentId } = req.params;
    const { status, reason } = req.body; // 'active' | 'blocked'

    if (!['active', 'blocked'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const student = await StudentRegistration.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    if (student._id.equals(req.user._id) && status === 'blocked') {
      res.status(400).json({ success: false, message: 'You cannot suspend your own administrator account.' });
      return;
    }

    student.status = status;
    if (reason) {
      student.suspiciousReason = reason;
    }
    await student.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: status === 'blocked' ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_ACTIVATED',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { targetEmail: student.googleEmail, newStatus: status, reason },
    });

    res.status(200).json({
      success: true,
      message: `Account status set to ${status}.`,
      student,
    });
  } catch (error) {
    next(error);
  }
};

export const getSyncEvents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const events = await FormSyncEvent.find().sort({ receivedAt: -1 }).limit(100);
    res.status(200).json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { action, limit, userId } = req.query;
    const filter: any = {};
    if (action) {
      filter.action = action;
    }
    if (typeof userId === 'string' && /^[a-f\d]{24}$/i.test(userId)) {
      filter.$or = [{ targetId: userId }, { actorId: userId }];
    }

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit) || 100);

    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};
