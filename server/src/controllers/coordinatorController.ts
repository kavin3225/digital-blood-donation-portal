import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmergencyRequest } from '../models/EmergencyRequest';
import { DonorResponse } from '../models/DonorResponse';
import { StudentRegistration } from '../models/StudentRegistration';
import { dispatchNotification } from '../services/fcmService';
import { logAudit } from '../services/auditService';

export const getPendingVerificationRequests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requests = await EmergencyRequest.find({
      status: { $in: ['pending_verification', 'verified', 'broadcast', 'coordinating'] },
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const verifyAndApproveRequest = async (
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
    const { coordinatorNotes } = req.body;

    const request = await EmergencyRequest.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Emergency request not found' });
      return;
    }

    if (request.status !== 'pending_verification') {
      res.status(400).json({
        success: false,
        message: `Request status is currently '${request.status}', only 'pending_verification' requests can be verified.`,
      });
      return;
    }

    request.status = 'verified';
    request.assignedCoordinatorId = req.user._id;
    request.assignedCoordinatorName = req.user.name;
    request.coordinatorNotes = coordinatorNotes || request.coordinatorNotes;
    request.verifiedAt = new Date();
    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'REQUEST_VERIFIED_APPROVED',
      targetEntity: 'EmergencyRequest',
      targetId: request._id.toString(),
      details: { requestId: request.requestId, coordinatorNotes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      message: 'Emergency request has been verified and approved for broadcast.',
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const broadcastApprovedRequest = async (
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
    const request = await EmergencyRequest.findById(id);

    if (!request) {
      res.status(404).json({ success: false, message: 'Emergency request not found' });
      return;
    }

    // Only approved/verified requests can broadcast
    if (request.status !== 'verified' && request.status !== 'broadcast') {
      res.status(400).json({
        success: false,
        message: `Request must be in 'verified' status before broadcast. Current status is '${request.status}'.`,
      });
      return;
    }

    // Prevent excessive duplicate broadcasts within 15 minutes
    if (request.broadcastAt && Date.now() - new Date(request.broadcastAt).getTime() < 15 * 60 * 1000) {
      res.status(429).json({
        success: false,
        message: 'This emergency request was broadcast recently. Please wait at least 15 minutes before re-broadcasting.',
      });
      return;
    }

    // Target eligible student donors:
    // Registered, active, consented to emergency communications, matching blood group (or compatible), willing
    const matchingDonors = await StudentRegistration.find({
      status: 'active',
      consentEmergencyCommunications: true,
      currentWillingness: 'Willing',
      selectedRole: { $in: ['Donor', 'Both'] },
      $or: [{ bloodGroup: request.bloodGroup }, { bloodGroup: 'O-' }], // O- can donate universally
    }).limit(100);

    // Record notification dispatch to eligible donors
    let acceptedCount = 0;
    for (const donor of matchingDonors) {
      try {
        await dispatchNotification({
          recipientId: donor._id,
          recipientEmail: donor.googleEmail,
          requestId: request._id,
          type: 'emergency_broadcast',
          title: `URGENT BLOOD NEED: ${request.bloodGroup} in ${request.district || 'Erode'} (${request.area || 'BIT Area'})`,
          body: `Emergency coordination: ${request.unitsRequired} unit(s) of ${request.bloodGroup} needed by ${new Date(request.requiredBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please check your donor dashboard.`,
          data: {
            requestId: request.requestId,
            bloodGroup: request.bloodGroup,
            hospital: request.hospital || request.area || 'BIT Campus Area',
          },
        });
        acceptedCount += 1;
      } catch (err) {
        console.error(`Failed to dispatch alert to ${donor.googleEmail}:`, err);
      }
    }

    request.status = 'broadcast';
    request.broadcastAt = new Date();
    request.broadcastHistory.push({
      timestamp: new Date(),
      recipientCount: acceptedCount,
      channel: 'in_app_and_push',
    });
    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'REQUEST_BROADCAST_SENT',
      targetEntity: 'EmergencyRequest',
      targetId: request._id.toString(),
      details: { requestId: request.requestId, recipientsTargeted: acceptedCount },
    });

    res.status(200).json({
      success: true,
      message: `Emergency broadcast dispatched to ${acceptedCount} matching willing student donors.`,
      recipientCount: acceptedCount,
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (
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
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      return;
    }

    const request = await EmergencyRequest.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    request.status = 'rejected';
    request.rejectionReason = rejectionReason;
    request.closedAt = new Date();
    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'REQUEST_REJECTED',
      targetEntity: 'EmergencyRequest',
      targetId: request._id.toString(),
      details: { requestId: request.requestId, rejectionReason },
    });

    res.status(200).json({
      success: true,
      message: 'Request has been rejected.',
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const handoverCoordinator = async (
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
    const { newCoordinatorId, handoverNote } = req.body;

    if (!newCoordinatorId || !handoverNote) {
      res.status(400).json({ success: false, message: 'Target coordinator and handover note are required.' });
      return;
    }

    const targetCoord = await StudentRegistration.findById(newCoordinatorId);
    if (!targetCoord || (targetCoord.systemRole !== 'coordinator' && targetCoord.systemRole !== 'admin')) {
      res.status(400).json({ success: false, message: 'Target user must be a verified coordinator or admin.' });
      return;
    }

    const request = await EmergencyRequest.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    request.handoverHistory.push({
      coordinatorId: req.user._id,
      coordinatorName: req.user.name,
      timestamp: new Date(),
      handoverNote,
    });

    request.assignedCoordinatorId = targetCoord._id;
    request.assignedCoordinatorName = targetCoord.name;
    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'COORDINATOR_HANDOVER_EXECUTED',
      targetEntity: 'EmergencyRequest',
      targetId: request._id.toString(),
      details: { requestId: request.requestId, newCoordinator: targetCoord.googleEmail, handoverNote },
    });

    res.status(200).json({
      success: true,
      message: `Emergency request handed over to ${targetCoord.name}.`,
      request,
    });
  } catch (error) {
    next(error);
  }
};

export const viewDonorContactAuthorized = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { responseId } = req.params;
    const response = await DonorResponse.findById(responseId);

    if (!response) {
      res.status(404).json({ success: false, message: 'Donor response not found' });
      return;
    }

    const donor = await StudentRegistration.findById(response.donorId);
    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor record not found' });
      return;
    }

    // Mark as viewed
    response.contactViewedByCoordinator = true;
    response.contactViewedAt = new Date();
    await response.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'COORDINATOR_VIEWED_DONOR_CONTACT',
      targetEntity: 'DonorResponse',
      targetId: response._id.toString(),
      details: { donorEmail: donor.googleEmail, requestId: response.requestId.toString() },
    });

    res.status(200).json({
      success: true,
      donorContact: {
        donorId: donor._id,
        name: donor.name,
        email: donor.googleEmail,
        mobile: donor.mobile,
        residenceType: donor.residenceType,
        approximateArea: donor.approximateArea,
        registerNumber: donor.registerNumber,
        department: donor.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateFollowUpStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const { responseId } = req.params;
    const { coordinatorFollowUp, coordinatorNotes } = req.body;

    const response = await DonorResponse.findById(responseId);
    if (!response) {
      res.status(404).json({ success: false, message: 'Response not found' });
      return;
    }

    response.coordinatorFollowUp = coordinatorFollowUp;
    if (coordinatorNotes) {
      response.coordinatorNotes = coordinatorNotes;
    }
    await response.save();

    res.status(200).json({
      success: true,
      message: 'Follow-up status updated.',
      response,
    });
  } catch (error) {
    next(error);
  }
};

export const fulfillEmergencyRequest = async (
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
    const { fulfillmentNotes } = req.body;

    const request = await EmergencyRequest.findById(id);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found' });
      return;
    }

    request.status = 'fulfilled';
    request.fulfilledAt = new Date();
    request.closedAt = new Date();
    request.fulfillmentNotes = fulfillmentNotes || 'Requirement fulfilled through student donor coordination.';
    await request.save();

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'REQUEST_FULFILLED_CLOSED',
      targetEntity: 'EmergencyRequest',
      targetId: request._id.toString(),
      details: { requestId: request.requestId, fulfillmentNotes },
    });

    res.status(200).json({
      success: true,
      message: 'Emergency request confirmed fulfilled and closed. Broadcasts terminated.',
      request,
    });
  } catch (error) {
    next(error);
  }
};
