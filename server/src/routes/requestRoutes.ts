import { Router } from 'express';
import {
  createEmergencyRequest,
  getMyRequests,
  getActiveBroadcasts,
  getRequestDetails,
  cancelEmergencyRequest,
  closeOwnRequest,
} from '../controllers/requestController';
import { requireAuth, requirePortalRole, requireCompleteProfile } from '../middlewares/auth';

const router = Router();

router.post('/', requireAuth, requireCompleteProfile, requirePortalRole('Requester', 'Both'), createEmergencyRequest);
router.get('/mine', requireAuth, getMyRequests);
router.get('/active', requireAuth, getActiveBroadcasts);
router.get('/:id', requireAuth, getRequestDetails);
router.put('/:id/cancel', requireAuth, cancelEmergencyRequest);
router.put('/:id/close', requireAuth, closeOwnRequest);

export default router;
