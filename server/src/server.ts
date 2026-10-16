import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import authRoutes from './routes/authRoutes';
import syncRoutes from './routes/syncRoutes';
import requestRoutes from './routes/requestRoutes';
import donorRoutes from './routes/donorRoutes';
import coordinatorRoutes from './routes/coordinatorRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import statsRoutes from './routes/statsRoutes';

const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Handled by frontend or configured for GIS
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: [ENV.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-BIT-Signature', 'X-BIT-Timestamp', 'X-BIT-Event-Id'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// General Rate Limiting
app.use('/api', apiLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    college: 'Bannari Amman Institute of Technology',
    portal: 'Digital Blood Donation & Emergency Availability Management Portal',
    timestamp: new Date().toISOString(),
    env: ENV.NODE_ENV,
    collegeDomain: ENV.ALLOWED_COLLEGE_DOMAIN,
    integrations: {
      googleOAuthConfigured: ENV.GOOGLE_CLIENT_ID_FORMAT_VALID,
      emailVerificationConfigured: Boolean(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS),
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// Serve the built React application from the same origin in production.
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) next(err);
  });
});

// Centralized Error Handling
app.use(errorHandler);

// Bootstrap
export const startServer = async () => {
  await connectDB();

  const server = app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`================================================================`);
    console.log(`  DIGITAL BLOOD DONATION PORTAL API`);
    console.log(`  Institution: Bannari Amman Institute of Technology`);
    console.log(`  Allowed Workspace Domain: @${ENV.ALLOWED_COLLEGE_DOMAIN}`);
    console.log(`  Listening on: http://localhost:${ENV.PORT}`);
    console.log(`================================================================`);
  });

  return { app, server };
};

// Keep imports side-effect free (Jest and other consumers import `app` directly).
if (require.main === module && process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}

export default app;
