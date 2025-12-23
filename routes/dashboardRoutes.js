import express from 'express';
import {
  getDashboardStats,
  getAttendanceTrends,
  getRevenueTrends,
  getMemberGrowth
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/attendance-trends', getAttendanceTrends);
router.get('/revenue-trends', getRevenueTrends);
router.get('/member-growth', getMemberGrowth);

export default router;

