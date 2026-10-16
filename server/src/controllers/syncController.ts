import { Request, Response, NextFunction } from 'express';
import { StudentRegistration, RoleType, BloodGroupType, WillingnessType } from '../models/StudentRegistration';
import { FormSyncEvent } from '../models/FormSyncEvent';
import { logAudit } from '../services/auditService';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth';

export interface FormSubmissionPayload {
  eventId: string;
  submissionTimestamp?: string | number;
  email: string;
  name: string;
  registerNumber: string;
  department: string;
  year: string;
  role?: RoleType;
  bloodGroup?: BloodGroupType;
  mobile: string;
  residenceType?: 'Hostel' | 'Day Scholar';
  approximateArea?: string;
  currentWillingness?: WillingnessType;
  lastDonationDate?: string;
  consentStored?: boolean;
  consentEmergencyCommunications?: boolean;
}

export const syncGoogleFormSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const eventId = (req.headers['x-bit-event-id'] as string) || req.body?.eventId;
  const signature = req.headers['x-bit-signature'] as string;
  const rawTimestamp = req.headers['x-bit-timestamp'] as string;

  try {
    const payload: FormSubmissionPayload = req.body;

    if (!payload.email || !payload.name || !payload.registerNumber) {
      res.status(400).json({
        success: false,
        code: 'MISSING_MANDATORY_FIELDS',
        message: 'Missing required registration fields (email, name, registerNumber).',
      });
      return;
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    const normalizedRegNo = payload.registerNumber.toUpperCase().trim();

    // 1. Verify exact Workspace domain
    if (!normalizedEmail.endsWith(`@${ENV.ALLOWED_COLLEGE_DOMAIN}`)) {
      await FormSyncEvent.create({
        eventId,
        submissionTimestamp: new Date(Number(rawTimestamp) || Date.now()),
        payload,
        signature,
        status: 'failed',
        errorMessage: `Email domain must be @${ENV.ALLOWED_COLLEGE_DOMAIN}. Rejected ${normalizedEmail}.`,
      });

      res.status(400).json({
        success: false,
        code: 'INVALID_COLLEGE_DOMAIN',
        message: `Only verified @${ENV.ALLOWED_COLLEGE_DOMAIN} accounts can register.`,
      });
      return;
    }

    // 2. Conflicting identity check (different email with same register number)
    const existingWithSameRegNo = await StudentRegistration.findOne({
      registerNumber: normalizedRegNo,
      googleEmail: { $ne: normalizedEmail },
    });

    let syncStatus: 'synced' | 'conflict_flagged' = 'synced';
    let accountStatus: 'active' | 'pending_review' = 'active';
    let suspiciousReason = '';

    if (existingWithSameRegNo) {
      syncStatus = 'conflict_flagged';
      accountStatus = 'pending_review';
      suspiciousReason = `Conflicting register number: ${normalizedRegNo} was previously claimed by ${existingWithSameRegNo.googleEmail}. Flagged for coordinator/admin review.`;
      console.warn(`[FormSync] Identity conflict detected for ${normalizedEmail} (Reg: ${normalizedRegNo})`);
    }

    // 3. Find existing student by normalized email
    const existingStudent = await StudentRegistration.findOne({ googleEmail: normalizedEmail });

    if (existingStudent) {
      // Respect field ownership:
      // Administrative decisions (blocking/system role) must never be overwritten by sync
      if (existingStudent.status === 'blocked') {
        await FormSyncEvent.create({
          eventId,
          submissionTimestamp: new Date(Number(rawTimestamp) || Date.now()),
          payload,
          signature,
          status: 'success',
          errorMessage: 'Form sync processed, but student account remains blocked by administrative policy.',
        });

        res.status(200).json({
          success: true,
          message: 'Form submission received; account remains blocked per administrative policy.',
          studentId: existingStudent._id,
        });
        return;
      }

      // If student has edited their profile in portal, preserve newer portal edits
      const preservePortalEdits = existingStudent.portalEditedAt != null;

      existingStudent.name = payload.name.trim();
      existingStudent.registerNumber = normalizedRegNo;
      existingStudent.department = payload.department?.trim() || existingStudent.department;
      existingStudent.year = payload.year?.trim() || existingStudent.year;
      existingStudent.mobile = payload.mobile?.trim() || existingStudent.mobile;
      existingStudent.residenceType = payload.residenceType || existingStudent.residenceType;
      existingStudent.approximateArea = payload.approximateArea?.trim() || existingStudent.approximateArea;

      if (!preservePortalEdits) {
        existingStudent.selectedRole = payload.role || existingStudent.selectedRole;
        existingStudent.portalRole = payload.role || existingStudent.portalRole;
        existingStudent.currentWillingness = payload.currentWillingness || existingStudent.currentWillingness;
        existingStudent.bloodGroup = payload.bloodGroup || existingStudent.bloodGroup;
      }

      if (payload.lastDonationDate) {
        existingStudent.lastDonationDate = new Date(payload.lastDonationDate);
      }

      if (suspiciousReason) {
        existingStudent.syncStatus = syncStatus;
        existingStudent.status = accountStatus;
        existingStudent.suspiciousReason = suspiciousReason;
      }

      existingStudent.lastSyncedAt = new Date();
      await existingStudent.save();

      await FormSyncEvent.create({
        eventId,
        submissionTimestamp: new Date(Number(rawTimestamp) || Date.now()),
        payload,
        signature,
        status: syncStatus === 'conflict_flagged' ? 'conflict_flagged' : 'success',
        errorMessage: suspiciousReason,
      });

      await logAudit({
        actorEmail: normalizedEmail,
        actorRole: 'google_form_webhook',
        action: 'FORM_REGISTRATION_UPDATED',
        targetEntity: 'StudentRegistration',
        targetId: existingStudent._id.toString(),
        details: { eventId, syncStatus },
      });

      res.status(200).json({
        success: true,
        message: 'Student registration updated successfully.',
        studentId: existingStudent._id,
        syncStatus,
      });
      return;
    }

    // 4. Create new Student Registration
    const newStudent = new StudentRegistration({
      googleEmail: normalizedEmail,
      name: payload.name.trim(),
      registerNumber: normalizedRegNo,
      department: payload.department?.trim() || 'General',
      year: payload.year?.trim() || 'I',
      selectedRole: payload.role || 'Donor',
      portalRole: payload.role || 'Donor',
      // Imported donor records are never privileged accounts. Admin/coordinator
      // identities are provisioned only by the server-side setup commands.
      systemRole: 'student',
      bloodGroup: payload.bloodGroup || 'Unknown',
      mobile: payload.mobile.trim(),
      residenceType: payload.residenceType || 'Hostel',
      approximateArea: payload.approximateArea?.trim() || 'Hostel',
      currentWillingness: payload.currentWillingness || 'Willing',
      lastDonationDate: payload.lastDonationDate ? new Date(payload.lastDonationDate) : undefined,
      consentStored: payload.consentStored !== false,
      consentEmergencyCommunications: payload.consentEmergencyCommunications !== false,
      syncStatus,
      status: accountStatus,
      suspiciousReason,
      availabilityLastConfirmedAt: new Date(),
      lastSyncedAt: new Date(),
    });

    await newStudent.save();

    await FormSyncEvent.create({
      eventId,
      submissionTimestamp: new Date(Number(rawTimestamp) || Date.now()),
      payload,
      signature,
      status: syncStatus === 'conflict_flagged' ? 'conflict_flagged' : 'success',
      errorMessage: suspiciousReason,
    });

    await logAudit({
      actorEmail: normalizedEmail,
      actorRole: 'google_form_webhook',
      action: 'FORM_REGISTRATION_CREATED',
      targetEntity: 'StudentRegistration',
      targetId: newStudent._id.toString(),
      details: { eventId, syncStatus },
    });

    res.status(201).json({
      success: true,
      message: 'New student registration processed successfully from Google Form sync.',
      studentId: newStudent._id,
      syncStatus,
    });
  } catch (error: any) {
    console.error('[FormSync] Sync processing error:', error);
    await FormSyncEvent.create({
      eventId: eventId || `err-${Date.now()}`,
      submissionTimestamp: new Date(),
      payload: req.body,
      signature: signature || 'none',
      status: 'failed',
      errorMessage: error.message,
    });
    next(error);
  }
};

/**
 * Admin action: Retry a failed sync event
 */
export const retryFailedSyncEvent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await FormSyncEvent.findOne({ eventId });

    if (!event) {
      res.status(404).json({ success: false, message: 'Sync event not found' });
      return;
    }

    event.retryCount += 1;
    event.lastRetriedAt = new Date();
    event.resolvedBy = req.user?._id;

    // Retry processing the payload
    const payload = event.payload as FormSubmissionPayload;
    const normalizedEmail = payload.email?.toLowerCase().trim();

    if (normalizedEmail) {
      let student = await StudentRegistration.findOne({ googleEmail: normalizedEmail });
      if (!student) {
        student = new StudentRegistration({
          googleEmail: normalizedEmail,
          name: payload.name,
          registerNumber: payload.registerNumber?.toUpperCase().trim(),
          department: payload.department || 'General',
          year: payload.year || 'I',
          selectedRole: payload.role || 'Donor',
          portalRole: payload.role || 'Donor',
          bloodGroup: payload.bloodGroup || 'Unknown',
          mobile: payload.mobile || '',
          residenceType: payload.residenceType || 'Hostel',
          approximateArea: payload.approximateArea || 'Hostel',
          currentWillingness: payload.currentWillingness || 'Willing',
          status: 'active',
          syncStatus: 'synced',
        });
      } else {
        student.status = 'active';
        student.syncStatus = 'synced';
        student.suspiciousReason = '';
      }
      await student.save();
      event.status = 'success';
      event.errorMessage = '';
    }

    await event.save();

    await logAudit({
      actorId: req.user?._id,
      actorEmail: req.user!.googleEmail,
      actorRole: req.user!.systemRole,
      action: 'SYNC_EVENT_RETRIED',
      targetEntity: 'FormSyncEvent',
      targetId: event._id.toString(),
      details: { eventId, newStatus: event.status },
    });

    res.status(200).json({
      success: true,
      message: `Sync event ${eventId} reprocessed successfully.`,
      event,
    });
  } catch (error) {
    next(error);
  }
};
