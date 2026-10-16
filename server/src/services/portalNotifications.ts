import { Types } from 'mongoose';
import { EmergencyRequest, IEmergencyRequest } from '../models/EmergencyRequest';
import { NotificationLog, NotificationType } from '../models/NotificationLog';
import { StudentRegistration } from '../models/StudentRegistration';
import { sendWebPushToUser } from './webPushService';

export const createInAppNotification = async (input: {
  recipientId: Types.ObjectId | string;
  recipientEmail: string;
  type: NotificationType;
  title: string;
  body: string;
  requestId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
}) => NotificationLog.create({
  ...input,
  recipientId: new Types.ObjectId(input.recipientId.toString()),
  ...(input.requestId ? { requestId: new Types.ObjectId(input.requestId.toString()) } : {}),
  channel: 'in_app',
  deliveryStatus: 'provider_accepted',
  read: false,
});

/** Persist minimal emergency alerts for signed-in, active campus identities. */
export const broadcastEmergencyRequest = async (request: IEmergencyRequest): Promise<number> => {
  const users = await StudentRegistration.find({
    _id: { $ne: request.requesterId },
    status: 'active',
    $or: [
      { googleSubjectId: { $exists: true, $ne: '' } },
      { emailVerifiedAt: { $exists: true, $ne: null } },
    ],
    consentEmergencyCommunications: true,
    'notificationPreferences.emergencyAlerts': true,
  }).select('_id googleEmail portalRole selectedRole bloodGroup currentWillingness district approximateArea');

  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const urgencyLabel = request.urgency === 'emergency' ? 'Urgent' : request.urgency === 'within_24h' ? 'Needed within 24 hours' : 'Scheduled';
  const neededBy = new Date(request.requiredBy).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const location = [request.hospital || request.hospitalLocation || request.area, request.district]
    .filter(Boolean)
    .join(', ');
  const alert = {
    type: 'emergency_broadcast' as const,
    requestId: request._id,
    title: `${urgencyLabel}: ${request.bloodGroup} blood needed`,
    body: `${request.unitsRequired} unit(s) needed at ${location} by ${neededBy}. Open the portal to review the request and respond if you can help.`,
    channel: 'in_app' as const,
    deliveryStatus: 'provider_accepted' as const,
    read: false,
  };
  if (!users.length) return 0;
  const alerts = users.map((user) => {
    const isDonor = ['Donor', 'Both'].includes(user.portalRole || user.selectedRole);
    const locationMatch = normalize(user.district || '') === normalize(request.district) && normalize(user.approximateArea || '').includes(normalize(request.area));
    const priorityMatch = isDonor && user.bloodGroup === request.bloodGroup && locationMatch;
    return {
      ...alert,
      recipientId: user._id,
      recipientEmail: user.googleEmail,
      metadata: {
        requestCode: request.requestId,
        bloodGroup: request.bloodGroup,
        district: request.district,
        area: request.area,
        urgency: request.urgency,
        priorityMatch,
      },
    };
  });
  await NotificationLog.insertMany(alerts, { ordered: false });
  for (let index = 0; index < users.length; index += 50) {
    await Promise.allSettled(users.slice(index, index + 50).map((user) => sendWebPushToUser({
      recipientId: user._id,
      recipientEmail: user.googleEmail,
      requestId: request._id,
      type: 'emergency_broadcast',
      title: alert.title,
      body: alert.body,
      data: { requestId: request._id.toString() },
    })));
  }
  return users.length;
};

export const notifyRequesterOfDonorResponse = async (request: IEmergencyRequest, donorName: string, donorArea: string) => {
  const notification = await createInAppNotification({
    recipientId: request.requesterId,
    recipientEmail: request.requesterEmail,
    requestId: request._id,
    type: 'donor_response',
    title: 'A donor offered to help',
    body: `${request.unitsRequired} unit(s) needed at ${location} by ${neededBy}. Open the portal to review the request and respond if you can help.`
    metadata: { requestCode: request.requestId },
  });
  await sendWebPushToUser({
    recipientId: request.requesterId,
    recipientEmail: request.requesterEmail,
    requestId: request._id,
    type: 'donor_response',
    title: 'A donor offered to help',
    body: `${request.unitsRequired} unit(s) needed at ${location} by ${neededBy}. Open the portal to review the request and respond if you can help.`
    data: { requestId: request._id.toString() },
  });
  return notification;
};
