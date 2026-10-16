import { Router } from 'express';
import {
  getPendingVerificationRequests,
  verifyAndApproveRequest,
  broadcastApprovedRequest,
  rejectRequest,
  handoverCoordinator,
  viewDonorContactAuthorized,
  updateFollowUpStatus,
  fulfillEmergencyRequest,
} from '../controllers/coordinatorController';
import { requireAuth, requireSystemRole } from '../middlewares/auth';
import { broadcastLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(requireAuth);
router.use(requireSystemRole('coordinator'));

router.get('/requests', getPendingVerificationRequests);
router.put('/requests/:id/verify', verifyAndApproveRequest);
router.post('/requests/:id/broadcast', broadcastLimiter, broadcastApprovedRequest);
router.put('/requests/:id/reject', rejectRequest);
router.post('/requests/:id/handover', handoverCoordinator);
router.get('/donor-response/:responseId/contact', viewDonorContactAuthorized);
router.put('/donor-response/:responseId/follow-up', updateFollowUpStatus);
router.put('/requests/:id/fulfill', fulfillEmergencyRequest);

export default router;
