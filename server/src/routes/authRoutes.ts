import { Router } from 'express';
import {
  googleLogin,
  getCurrentUser,
  updateProfile,
  updatePortalRole,
  logout,
  registerWithPassword,
  verifyEmailAddress,
  loginWithPassword,
  requestPasswordReset,
  resetPassword,
} from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';
import { authLimiter, passwordLoginLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register-email', authLimiter, registerWithPassword);
router.post('/google', authLimiter, googleLogin);
router.post('/verify-email', authLimiter, verifyEmailAddress);
router.post('/login-email', passwordLoginLimiter, loginWithPassword);
router.post('/password-reset/request', authLimiter, requestPasswordReset);
router.post('/password-reset/complete', authLimiter, resetPassword);
router.get('/me', requireAuth, getCurrentUser);
router.put('/profile', requireAuth, updateProfile);
router.put('/role', requireAuth, updatePortalRole);
router.post('/logout', logout);

export default router;
