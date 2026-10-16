import { Router } from 'express';
import {
  subscribeDeviceToken,
  unsubscribeDeviceToken,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  sendTestNotification,
} from '../controllers/notificationController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/subscribe', subscribeDeviceToken);
router.post('/unsubscribe', unsubscribeDeviceToken);
router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.post('/test', sendTestNotification);

export default router;
