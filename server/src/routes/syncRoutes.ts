import { Router } from 'express';
import { syncGoogleFormSubmission, retryFailedSyncEvent } from '../controllers/syncController';
import { verifyAppsScriptHmac } from '../middlewares/hmacVerify';
import { syncLimiter } from '../middlewares/rateLimiter';
import { requireAuth, requireSystemRole } from '../middlewares/auth';

const router = Router();

// Endpoint called by Google Apps Script onFormSubmit
router.post('/google-form', syncLimiter, verifyAppsScriptHmac, syncGoogleFormSubmission);

// Admin manual retry
router.post('/retry/:eventId', requireAuth, requireSystemRole('admin'), retryFailedSyncEvent);

export default router;
