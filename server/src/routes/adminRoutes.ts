import { Router } from 'express';
import {
  getAllUsersAdmin,
  updateUserAdmin,
  getAllRequestsAdmin,
  getSuspiciousRegistrations,
  resolveSuspiciousRegistration,
  toggleAccountStatus,
  getSyncEvents,
  getAuditLogs,
  getAllDonorResponsesAdmin,
  getAllNotificationsAdmin,
  moderateRequestAdmin,
  sendPortalAnnouncement,
} from '../controllers/adminController';
import { requireAuth, requireSystemRole } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.use(requireSystemRole('admin'));

// Full Student & Staff User Directory
router.get('/users', getAllUsersAdmin);
router.put('/users/:studentId', updateUserAdmin);

// Emergency Requests Directory for Admin
router.get('/requests', getAllRequestsAdmin);
router.put('/requests/:requestId', moderateRequestAdmin);
router.get('/donor-responses', getAllDonorResponsesAdmin);
router.get('/notifications', getAllNotificationsAdmin);
router.post('/announcements', sendPortalAnnouncement);

// Registration & Account Governance
router.get('/suspicious-registrations', getSuspiciousRegistrations);
router.put('/suspicious-registrations/:studentId/resolve', resolveSuspiciousRegistration);
router.put('/accounts/:studentId/status', toggleAccountStatus);
router.get('/sync-events', getSyncEvents);
router.get('/audit-logs', getAuditLogs);

export default router;
