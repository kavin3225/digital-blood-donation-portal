import { Router } from 'express';
import { requireAuth, requireSystemRole } from '../middlewares/auth';
import { deleteSupportConversationAdmin, getMySupportMessages, getSupportConversationAdmin, getSupportConversationsAdmin, sendSupportMessage, sendSupportReplyAdmin } from '../controllers/supportController';

const router = Router();
router.use(requireAuth);
router.get('/messages', getMySupportMessages);
router.post('/messages', sendSupportMessage);
router.get('/admin/conversations', requireSystemRole('admin'), getSupportConversationsAdmin);
router.get('/admin/conversations/:userId', requireSystemRole('admin'), getSupportConversationAdmin);
router.post('/admin/conversations/:userId', requireSystemRole('admin'), sendSupportReplyAdmin);
router.delete('/admin/conversations/:userId', requireSystemRole('admin'), deleteSupportConversationAdmin);

export default router;
