import { Router } from 'express';
import {
  submitDonorResponse,
  getMyResponseHistory,
  searchDonorsPrivacySafe,
  updateAvailabilityFreshness,
} from '../controllers/donorController';
import { requireAuth, requirePortalRole, requireCompleteProfile } from '../middlewares/auth';

const router = Router();

router.post('/respond', requireAuth, requireCompleteProfile, requirePortalRole('Donor', 'Both'), submitDonorResponse);
router.get('/history', requireAuth, getMyResponseHistory);
router.get('/search', requireAuth, searchDonorsPrivacySafe);
router.put('/freshness', requireAuth, requireCompleteProfile, requirePortalRole('Donor', 'Both'), updateAvailabilityFreshness);

export default router;
