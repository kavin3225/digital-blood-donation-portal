import { Types } from 'mongoose';
import { NotificationLog, DeliveryStatus, NotificationType } from '../models/NotificationLog';
import { createInAppNotification } from './portalNotifications';
import { sendWebPushToUser, webPushConfigured } from './webPushService';

export interface SendPushPayload {
  recipientId: Types.ObjectId | string;
  recipientEmail: string;
  requestId?: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  inAppLogId: string;
  pushSent: boolean;
  deliveryStatus: DeliveryStatus;
  providerAccepted: boolean;
  message: string;
}

/** Persist the in-app item, then send only to explicitly subscribed browser endpoints. */
export const dispatchNotification = async (payload: SendPushPayload): Promise<PushResult> => {
  const inApp = await createInAppNotification(payload);
  const push = await sendWebPushToUser(payload);
  const deliveryStatus: DeliveryStatus = push.accepted > 0 ? 'provider_accepted' : push.attempted > 0 ? 'failed' : 'queued';
  let message = 'Saved to the portal inbox.';
  if (!webPushConfigured()) message += ' Browser push is not configured on the server.';
  else if (push.attempted === 0) message += ' No browser devices have opted in.';
  else message += ` Web Push accepted by ${push.accepted} device(s); ${push.failed} failed.`;
  return {
    inAppLogId: inApp._id.toString(),
    pushSent: push.accepted > 0,
    deliveryStatus,
    providerAccepted: push.accepted > 0,
    message,
  };
};
