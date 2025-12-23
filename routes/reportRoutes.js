import express from 'express';
import {
  getMemberReport,
  getAttendanceReport,
  getFinancialReport,
  getPlanReport,
  getTrainerReport,
  getExpiryAlertReport,
  getDailySummary
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/members', getMemberReport);
router.get('/attendance', getAttendanceReport);
router.get('/financial', getFinancialReport);
router.get('/plans', getPlanReport);
router.get('/trainers', getTrainerReport);
router.get('/expiry-alerts', getExpiryAlertReport);
router.get('/daily-summary', getDailySummary);

export default router;

