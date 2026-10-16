import { Router } from 'express';
import { getCampusOverviewStats } from '../controllers/statsController';

const router = Router();

router.get('/overview', getCampusOverviewStats);

export default router;
