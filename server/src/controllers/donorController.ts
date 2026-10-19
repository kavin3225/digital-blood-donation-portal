import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { DonorResponse, DonorResponseType } from '../models/DonorResponse';
import { EmergencyRequest } from '../models/EmergencyRequest';
import { StudentRegistration, BloodGroupType, WillingnessType, checkProfileCompletion } from '../models/StudentRegistration';
import { logAudit } from '../services/auditService';
import { notifyRequesterOfDonorResponse } from '../services/portalNotifications';

export const submitDonorResponse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    // Backend restriction: Block donation responses until profile completion is complete
    if (!checkProfileCompletion(req.user)) {
      res.status(403).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        message: 'You must complete your college profile (Name, Register No/Staff ID, Department, Blood Group, Mobile, District & Area) before responding to donation requests.',
      });
      return;
    }

    const { requestId, responseType, note } = req.body;

    if (!requestId || !responseType) {
      res.status(400).json({ success: false, message: 'Request ID and response type are required.' });
      return;
    }

    const validTypes: DonorResponseType[] = ['i_can_help', 'not_available', 'withdrawn', 'logistical_help'];
    if (!validTypes.includes(responseType)) {
      res.status(400).json({ success: false, message: 'Invalid donor response type.' });
      return;
    }

    const emergencyRequest = await EmergencyRequest.findById(requestId);
    if (!emergencyRequest) {
      res.status(404).json({ success: false, message: 'Emergency request not found' });
      return;
    }

    if (responseType === 'i_can_help' && (!req.user.consentEmergencyCommunications || req.user.bloodGroup !== emergencyRequest.bloodGroup)) {
      res.status(403).json({ success: false, message: 'Only consenting donors with the requested blood group can offer to help.' });
      return;
    }

    // Check request state: donors can only respond to broadcast or coordinating requests
    if (!['broadcast', 'coordinating'].includes(emergencyRequest.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot respond to request with status '${emergencyRequest.status}'. Only active broadcasts accept responses.`,
      });
      return;
    }

    // Upsert response (one per donor per request)
    const existing = await DonorResponse.findOne({ requestId: emergencyRequest._id, donorId: req.user._id });

    let responseDoc;
    if (existing) {
      const shouldNotifyRequester = responseType === 'i_can_help' && existing.responseType !== 'i_can_help';
      existing.responseType = responseType;
      existing.note = note || existing.note;
      existing.respondedAt = new Date();
      responseDoc = await existing.save();
      if (shouldNotifyRequester) await notifyRequesterOfDonorResponse(emergencyRequest, req.user.name, req.user.approximateArea);
    } else {
      responseDoc = await DonorResponse.create({
        requestId: emergencyRequest._id,
        donorId: req.user._id,
        donorEmail: req.user.googleEmail,
        donorName: req.user.name,
        donorBloodGroup: req.user.bloodGroup,
        donorArea: req.user.approximateArea,
        responseType,
        note: note || '',
        coordinatorFollowUp: 'pending',
      });
      if (responseType === 'i_can_help') await notifyRequesterOfDonorResponse(emergencyRequest, req.user.name, req.user.approximateArea);

      // Advance request status to 'coordinating' if it was in 'broadcast'
      if (emergencyRequest.status === 'broadcast' && responseType === 'i_can_help') {
        emergencyRequest.status = 'coordinating';
        await emergencyRequest.save();
      }
    }

    await logAudit({
      actorId: req.user._id,
      actorEmail: req.user.googleEmail,
      actorRole: req.user.systemRole,
      action: 'DONOR_RESPONSE_SUBMITTED',
      targetEntity: 'DonorResponse',
      targetId: responseDoc._id.toString(),
      details: { requestId: emergencyRequest.requestId, responseType },
    });

    res.status(200).json({
      success: true,
      message: 'Response recorded. The college coordinator will contact you if matched with the patient requirement.',
      response: responseDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyResponseHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const responses = await DonorResponse.find({ donorId: req.user._id })
      .populate('requestId', 'requestId patientEmail patientName district area bloodGroup unitsRequired status requiredBy patientReference')
      .sort({ respondedAt: -1 });

    res.status(200).json({ success: true, responses });
  } catch (error) {
    next(error);
  }
};

/**
 * Privacy-safe donor search:
 * - Redacts phone numbers and personal student numbers
 * - Highlights freshness: "Confirmed today", "Stale"
 * - Labels: "Self-reported blood group", "Willing donor"
 */
export const searchDonorsPrivacySafe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bloodGroup, area, residenceType, willingness, district } = req.query;

    const filter: any = {
      systemRole: { $ne: 'admin' },
      status: 'active',
      // Only students who consented to emergency communications
      consentEmergencyCommunications: true,
      selectedRole: { $in: ['Donor', 'Both'] },
    };

    if (bloodGroup && bloodGroup !== 'All') {
      const sanitizedBg = (bloodGroup as string).replace(/ /g, '+');
      filter.bloodGroup = sanitizedBg;
    }

    if (district && district !== 'All') {
      filter.district = district;
    }

    if (area && area !== 'All') {
      filter.approximateArea = { $regex: new RegExp(area as string, 'i') };
    }

    if (residenceType && residenceType !== 'All') {
      filter.residenceType = residenceType;
    }

    if (willingness && willingness !== 'All') {
      filter.currentWillingness = willingness;
    }

    const donors = await StudentRegistration.find(filter)
      .select('name userType department year bloodGroup district residenceType approximateArea currentWillingness nonDonationHelp')
      .sort({ name: 1 })
      .limit(50);

    const sanitizedDonors = donors.map(d => {
      return {
        id: d._id,
        name: d.name,
        userType: d.userType || 'Student',
        department: d.department,
        year: d.year,
        bloodGroup: d.bloodGroup,
        district: d.district || 'Erode',
        residenceType: d.residenceType,
        approximateArea: d.approximateArea,
        currentWillingness: d.currentWillingness,
        nonDonationHelp: d.nonDonationHelp,
        disclaimer: 'Self-reported blood group. Verification and cross-matching is performed before transfusion.',
        contactPolicy: 'Private phone numbers protected. Contact is routed through authorized college coordinators.',
      };
    });

    res.status(200).json({
      success: true,
      count: sanitizedDonors.length,
      donors: sanitizedDonors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm or update donor availability freshness
 */
export const updateAvailabilityFreshness = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    if (!checkProfileCompletion(req.user)) {
      res.status(403).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        message: 'Please complete your college profile before updating donor availability.',
      });
      return;
    }

    const { currentWillingness, approximateArea, nonDonationHelp } = req.body;

    const student = await StudentRegistration.findById(req.user._id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    student.availabilityLastConfirmedAt = new Date();
    student.portalEditedAt = new Date();

    if (currentWillingness) {
      student.currentWillingness = currentWillingness as WillingnessType;
    }

    if (approximateArea) {
      student.approximateArea = approximateArea.trim();
    }

    if (nonDonationHelp) {
      student.nonDonationHelp = nonDonationHelp;
    }

    await student.save();

    await logAudit({
      actorId: student._id,
      actorEmail: student.googleEmail,
      actorRole: student.systemRole,
      action: 'AVAILABILITY_CONFIRMED_FRESH',
      targetEntity: 'StudentRegistration',
      targetId: student._id.toString(),
      details: { willingness: student.currentWillingness, area: student.approximateArea },
    });

    res.status(200).json({
      success: true,
      message: 'Availability confirmed fresh. Thank you for keeping your coordination status up to date!',
      availabilityLastConfirmedAt: student.availabilityLastConfirmedAt,
    });
  } catch (error) {
    next(error);
  }
};
