import webPush from 'web-push';
import { Types } from 'mongoose';
import { ENV } from '../config/env';
import { NotificationSubscription } from '../models/NotificationSubscription';
import { NotificationLog, NotificationType } from '../models/NotificationLog';

export const webPushConfigured = () => Boolean(ENV.WEB_PUSH_VAPID_PUBLIC_KEY && ENV.WEB_PUSH_VAPID_PRIVATE_KEY);

export const sendWebPushToUser = async (input: {
  recipientId: Types.ObjectId | string;
  recipientEmail: string;
  requestId?: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) => {
  if (!webPushConfigured()) return { attempted: 0, accepted: 0, failed: 0, configured: false };
  const recipientId = new Types.ObjectId(input.recipientId.toString());
  const subscriptions = await NotificationSubscription.find({ userId: recipientId, isActive: true });
  if (!subscriptions.length) return { attempted: 0, accepted: 0, failed: 0, configured: true };

  webPush.setVapidDetails(ENV.WEB_PUSH_SUBJECT, ENV.WEB_PUSH_VAPID_PUBLIC_KEY, ENV.WEB_PUSH_VAPID_PRIVATE_KEY);
  let accepted = 0;
  let failed = 0;
  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    data: Object.fromEntries(Object.entries(input.data || {}).map(([key, value]) => [key, String(value)])),
  });

  for (const subscription of subscriptions) {
    const delivery = {
      recipientId,
      recipientEmail: input.recipientEmail.toLowerCase(),
      requestId: input.requestId ? new Types.ObjectId(input.requestId.toString()) : undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      channel: 'web_push' as const,
    };
    try {
      await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 60 });
      accepted++;
      await NotificationLog.create({ ...delivery, deliveryStatus: 'provider_accepted', read: false });
    } catch (error: any) {
      failed++;
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        subscription.isActive = false;
        await subscription.save();
      }
      await NotificationLog.create({ ...delivery, deliveryStatus: 'failed', errorMessage: `Web Push provider returned ${error?.statusCode || 'an error'}.`, read: false });
    }
  }
  return { attempted: subscriptions.length, accepted, failed, configured: true };
};
