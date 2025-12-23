import express from 'express';
import {
  markAttendance,
  markCheckout,
  getTodayAttendance,
  getAttendanceByDateRange,
  getMemberAttendance,
  syncBiometricAttendance,
  getAttendanceStatistics
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/checkin', markAttendance);
router.post('/checkout', markCheckout);
router.get('/today', getTodayAttendance);
router.get('/date-range', getAttendanceByDateRange);
router.get('/member/:memberId', getMemberAttendance);
router.post('/biometric/sync', syncBiometricAttendance);
router.get('/statistics', getAttendanceStatistics);

export default router;

