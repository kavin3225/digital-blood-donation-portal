import { Router } from 'express';
import {
  createEmergencyRequest,
  getMyRequests,
  getActiveBroadcasts,
  getRequestDetails,
  cancelEmergencyRequest,
  closeOwnRequest,
  updateOwnRequestRemark,
  permanentlyDeleteRequest,
} from '../controllers/requestController';
import { requireAuth, requirePortalRole, requireCompleteProfile } from '../middlewares/auth';

const router = Router();

router.post('/', requireAuth, requireCompleteProfile, requirePortalRole('Requester', 'Both'), createEmergencyRequest);
router.get('/mine', requireAuth, getMyRequests);
router.get('/active', requireAuth, getActiveBroadcasts);
router.get('/:id', requireAuth, getRequestDetails);
router.put('/:id/cancel', requireAuth, cancelEmergencyRequest);
router.put('/:id/close', requireAuth, closeOwnRequest);
router.put('/:id/remark', requireAuth, updateOwnRequestRemark);
router.delete('/:id', requireAuth, permanentlyDeleteRequest);

export default router;
