import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { NotificationSubscription } from '../models/NotificationSubscription';
import { NotificationLog } from '../models/NotificationLog';
import { dispatchNotification } from '../services/fcmService';
import { webPushConfigured } from '../services/webPushService';

export const subscribeDeviceToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    if (!webPushConfigured()) {
      res.status(503).json({ success: false, message: 'Browser push is not configured on this server. Portal inbox alerts are still available.' });
      return;
    }

    const { subscription, userAgent, deviceType } = req.body;
    const endpoint = String(subscription?.endpoint || '');
    const p256dh = String(subscription?.keys?.p256dh || '');
    const auth = String(subscription?.keys?.auth || '');
    if (!endpoint.startsWith('https://') || !p256dh || !auth) {
      res.status(400).json({ success: false, message: 'A valid browser PushSubscription is required.' });
      return;
    }

    const browserSubscription = await NotificationSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        userEmail: req.user.googleEmail,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || req.headers['user-agent'] || '',
        deviceType: deviceType || 'browser',
        isActive: true,
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Browser push subscription saved for this account.',
      subscriptionId: browserSubscription._id,
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribeDeviceToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const endpoint = String(req.body?.endpoint || '');
    if (endpoint && req.user) {
      await NotificationSubscription.updateOne({ endpoint, userId: req.user._id }, { isActive: false });
    }
    res.status(200).json({ success: true, message: 'Push subscription deactivated.' });
  } catch (error) {
    next(error);
  }
};

export const getMyNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const notifications = await NotificationLog.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await NotificationLog.countDocuments({
      recipientId: req.user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await NotificationLog.findOneAndUpdate(
      { _id: id, recipientId: req.user?._id },
      { read: true, acknowledgedAt: new Date(), deliveryStatus: 'acknowledged' },
      { new: true }
    );

    res.status(200).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    await NotificationLog.updateMany(
      { recipientId: req.user._id, read: false },
      { read: true, acknowledgedAt: new Date(), deliveryStatus: 'acknowledged' }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

export const sendTestNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated' });
      return;
    }

    const result = await dispatchNotification({
      recipientId: req.user._id,
      recipientEmail: req.user.googleEmail,
      type: 'emergency_broadcast',
      title: 'Portal notification test',
      body: 'This is a test alert. Push delivery will be reported separately from the saved in-app notification.',
      data: { isTest: 'true' },
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
};
