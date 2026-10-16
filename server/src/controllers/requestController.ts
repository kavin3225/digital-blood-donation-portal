import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmergencyRequest, RequestStatusType } from '../models/EmergencyRequest';
import { DonorResponse } from '../models/DonorResponse';
import { StudentRegistration } from '../models/StudentRegistration';
import { logAudit } from '../services/auditService';
import { z } from 'zod';
import crypto from 'crypto';
import { broadcastEmergencyRequest } from '../services/portalNotifications';

const CreateRequestSchema = z.object({
  clientRequestKey: z.string().min(8).max(100).optional(),
  requestTarget: z.enum(['Self', 'College Friend']).default('Self'),
  patientEmail: z.string().email().optional().or(z.literal('')),
  patientName: z.string().max(100).optional(),
  patientReference: z.string().optional(),
  district: z.string().min(2).max(100).default('Erode'),
  area: z.string().min(2).max(150),
  hospital: z.string().max(150).optional(),
  hospitalLocation: z.string().max(150).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
  urgency: z.enum(['emergency', 'within_24h', 'planned']).default('emergency'),
  unitsRequired: z.number().int().min(1).max(20),
  requiredBy: z.string().or(z.date()),
  contactPersonName: z.string().min(2).max(100),
  contactPersonPhone: z.string().min(8).max(20),
  briefContext: z.string().max(500).optional().default(''),
  supportingEvidenceNote: z.string().optional(),
  affectedStudentName: z.string().optional(),
  affectedStudentEmail: z.string().optional(),
  affectedStudentRegNo: z.string().optional(),
  relationshipToStudent: z.string().optional(),
});

export const createEmergencyRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const validated = CreateRequestSchema.parse(req.body);

    if (validated.clientRequestKey) {
      const prior = await EmergencyRequest.findOne({ requesterId: req.user._id, clientRequestKey: validated.clientRequestKey });
      if (prior) {
        res.status(200).json({ success: true, duplicate: true, request: prior, message: 'This request was already submitted.' });
        return;
      }
    }

    // Determine target patient details
    let targetEmail = (validated.patientEmail || '').toLowerCase().trim();
    let targetName = validated.patientName?.trim() || '';

    if (validated.requestTarget === 'Self') {
      targetEmail = req.user.googleEmail;
      targetName = req.user.name;
    } else {
      if (!targetEmail && !targetName) {
        res.status(400).json({ success: false, message: 'Enter your BIT friend’s name. College email is optional when unknown.' });
        return;
      }
      // Validate college friend's email domain
      if (targetEmail && !targetEmail.endsWith('@bitsathy.ac.in')) {
        res.status(400).json({
          success: false,
          message: 'Patient must have a verified college email ending in @bitsathy.ac.in.',
        });
        return;
      }

      // Verify college friend's institutional existence without exposing private information
      if (targetEmail) {
        const friendStudent = await StudentRegistration.findOne({ googleEmail: targetEmail });
        if (friendStudent && !targetName) targetName = friendStudent.name;
        else if (!targetName) targetName = targetEmail.split('@')[0];
      }
    }

    const requiredByDate = new Date(validated.requiredBy);
    const phoneDigits = validated.contactPersonPhone.replace(/\D/g, '');
    if (!Number.isFinite(requiredByDate.getTime()) || requiredByDate.getTime() <= Date.now()) {
      res.status(400).json({ success: false, message: 'Required date and time must be in the future.' });
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      res.status(400).json({ success: false, message: 'Enter a valid emergency contact number.' });
      return;
    }

    const yearSuffix = new Date().getFullYear();
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const requestId = `BIT-REQ-${yearSuffix}-${randomSuffix}`;

    const isCoordinator = req.user.systemRole === 'coordinator' || req.user.systemRole === 'admin';
    const initialStatus: RequestStatusType = 'broadcast';
    const broadcastAt = new Date();

    const emergencyRequest = new EmergencyRequest({
      requestId,
      clientRequestKey: validated.clientRequestKey,
      requestTarget: validated.requestTarget,
      patientEmail: targetEmail,
      patientName: targetName,
      patientReference: targetName ? `${targetName} (${validated.requestTarget})` : targetEmail,
      district: validated.district,
      area: validated.area,
      hospital: validated.hospital?.trim() || '',
      hospitalLocation: validated.hospitalLocation?.trim() || validated.area,
      affectedStudentName: targetName,
      affectedStudentEmail: targetEmail,
      affectedStudentRegNo: validated.affectedStudentRegNo?.toUpperCase().trim() || '',
      relationshipToStudent: validated.requestTarget === 'Self' ? 'Self' : (validated.relationshipToStudent || 'College Friend'),
      bloodGroup: validated.bloodGroup,
      urgency: validated.urgency,
      unitsRequired: validated.unitsRequired,
      requiredBy: new Date(validated.requiredBy),
      contactPersonName: validated.contactPersonName.trim(),
      contactPersonPhone: validated.contactPersonPhone.trim(),
      briefContext: validated.briefContext.trim(),
      supportingEvidenceNote: validated.supportingEvidenceNote?.trim() || '',
      requesterId: req.user._id,
      requesterEmail: req.user.googleEmail,
      requesterName: req.user.name,
      status: initialStatus,
      isDirectCoordinatorCreated: isCoordinator,
      broadcastAt,
      ...(isCoordinator && {
        assignedCoordinatorId: req.user._id,
        assignedCoordinatorName: req.user.name,
        verifiedAt: new Date(),
      }),
    });

    await emergencyRequest.save();
    const notifiedCount = await broadcastEmergencyRequest(emergencyRequest);

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: isCoordinator ? 'REQUEST_DIRECT_CREATED' : 'REQUEST_AUTO_BROADCAST',
      targetEntity: 'EmergencyRequest',
      targetId: emergencyRequest._id.toString(),
      details: {
        requestId,
        requestTarget: validated.requestTarget,
        status: initialStatus,
        bloodGroup: validated.bloodGroup,
        district: validated.district,
        area: validated.area,
        alertRecipients: notifiedCount,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Emergency request is open. Campus users received an alert, and matching donors can respond now.',
      request: emergencyRequest,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0]?.message || 'Validation error in request form.' });
      return;
    }
    next(error);
  }
};

export const getMyRequests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const requests = await EmergencyRequest.find({ requesterId: req.user._id }).sort({ createdAt: -1 });

    // Attach donor response counts for each request
    const requestIds = requests.map(r => r._id);
    const responses = await DonorResponse.aggregate([
      { $match: { requestId: { $in: requestIds } } },
      { $group: { _id: '$requestId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(responses.map(item => [item._id.toString(), item.count]));

    const enriched = requests.map(r => ({
      ...r.toObject(),
      donorResponseCount: countMap.get(r._id.toString()) || 0,
    }));

    res.status(200).json({ success: true, requests: enriched });
  } catch (error) {
    next(error);
  }
};

export const getActiveBroadcasts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Active requests are visible to eligible donors as soon as they are submitted.
    const filter: any = {
      status: { $in: ['pending_verification', 'verified', 'broadcast', 'coordinating'] },
      requiredBy: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    };

    // If blood group filter provided in query
    if (req.query.bloodGroup && req.query.bloodGroup !== 'All') {
      filter.bloodGroup = (req.query.bloodGroup as string).replace(/ /g, '+');
    }

    if (req.user && ['Donor', 'Both'].includes(req.user.portalRole || req.user.selectedRole)) {
      filter.bloodGroup = req.user.bloodGroup;
    }

    // Optional district filter
    if (req.query.district && req.query.district !== 'All') {
      filter.district = req.query.district;
    }

    const requests = await EmergencyRequest.find(filter)
      .select('requestId status bloodGroup urgency unitsRequired district area requiredBy broadcastAt createdAt')
      .sort({ broadcastAt: -1, createdAt: -1 });

    res.status(200).json({ success: true, requests: requests.map((request) => ({
      ...request.toObject(),
      patientName: '', patientEmail: '', patientReference: 'BIT College Request',
      contactPersonName: 'College requester', contactPersonPhone: '', briefContext: 'Open the portal to offer help. Patient details are coordinated privately.',
    })) });
  } catch (error) {
    next(error);
  }
};

export const getRequestDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await EmergencyRequest.findById(id);

    if (!request) {
      res.status(404).json({ success: false, message: 'Emergency request not found' });
      return;
    }

    const isOwner = req.user && request.requesterId.toString() === req.user._id.toString();
    const isCoordinator = req.user && (req.user.systemRole === 'coordinator' || req.user.systemRole === 'admin');
    const canRespond = req.user && ['broadcast', 'coordinating'].includes(request.status) && ['Donor', 'Both'].includes(req.user.portalRole || req.user.selectedRole) && req.user.bloodGroup === request.bloodGroup;
    if (!isOwner && !isCoordinator && !canRespond) {
      res.status(403).json({ success: false, message: 'Request details are not available to this account.' });
      return;
    }

    // Fetch donor responses only for the request owner or authorized coordinators.
    let responses: any[] = [];
    if (isOwner || isCoordinator) {
      const responseDocs = await DonorResponse.find({ requestId: request._id }).sort({ respondedAt: -1 });
      responses = await Promise.all(responseDocs.map(async (response) => {
        const donor = await StudentRegistration.findById(response.donorId).select('mobile shareContactWithRequesters');
        return { ...response.toObject(), donorPhone: isOwner && donor?.shareContactWithRequesters ? donor.mobile : undefined };
      }));
    }

    // Check if current user has personally responded
    let myResponse: any = null;
    if (req.user) {
      myResponse = await DonorResponse.findOne({ requestId: request._id, donorId: req.user._id });
    }

    res.status(200).json({
      success: true,
      request: canRespond && !isOwner && !isCoordinator ? {
        ...request.toObject(),
        patientName: '',
        patientEmail: '',
        patientReference: 'BIT College Request',
        affectedStudentName: '',
        affectedStudentEmail: '',
        affectedStudentRegNo: '',
        requesterId: undefined,
        requesterName: 'Campus member',
        requesterEmail: '',
        contactPersonName: 'College requester',
        contactPersonPhone: '',
        supportingEvidenceNote: '',
      } : request,
      responses,
      myResponse,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelEmergencyRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;
    const request = await EmergencyRequest.findById(id);

    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    const isOwner = request.requesterId.toString() === req.user._id.toString();
    const isCoordinator = req.user.systemRole === 'coordinator' || req.user.systemRole === 'admin';

    if (!isOwner && !isCoordinator) {
      res.status(403).json({ success: false, message: 'Unauthorized to cancel this request.' });
      return;
    }

    request.status = 'cancelled';
    request.cancellationReason = reason || 'Cancelled by requester/coordinator';
    request.closedAt = new Date();
    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'REQUEST_CANCELLED',
      targetEntity: 'EmergencyRequest',
      targetId: request._id.toString(),
      details: { requestId: request.requestId, reason },
    });

    res.status(200).json({
      success: true,
      message: `Emergency request ${request.requestId} has been cancelled.`,
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const closeOwnRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) { res.status(404).json({ success: false, message: 'Request not found.' }); return; }
    if (request.requesterId.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Only the account that submitted this request can close it.' }); return;
    }
    const status = req.body?.status;
    if (!['fulfilled', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, message: 'Choose fulfilled or cancelled.' }); return;
    }
    if (['fulfilled', 'cancelled', 'rejected', 'expired'].includes(request.status)) {
      res.status(409).json({ success: false, message: 'This request is already closed.' }); return;
    }
    request.status = status;
    request.closedAt = new Date();
    if (status === 'fulfilled') request.fulfilledAt = new Date();
    if (typeof req.body?.note === 'string') request.fulfillmentNotes = req.body.note.slice(0, 500);
    await request.save();
    await logAudit({ actorId: req.user?._id, actorEmail: req.user?.googleEmail || '', actorRole: req.user?.systemRole || 'student', action: status === 'fulfilled' ? 'REQUEST_MARKED_FULFILLED' : 'REQUEST_CLOSED_BY_OWNER', targetEntity: 'EmergencyRequest', targetId: request._id.toString(), details: { requestId: request.requestId, status } });
    res.status(200).json({ success: true, request, message: status === 'fulfilled' ? 'Request marked fulfilled.' : 'Request cancelled.' });
  } catch (error) { next(error); }
};
