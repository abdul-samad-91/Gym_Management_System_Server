import express from 'express';
import {
  getTrainers,
  getTrainer,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  assignTrainerToMember,
  unassignTrainerFromMember,
  toggleTrainerStatus
} from '../controllers/trainerController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTrainers)
  .post(authorize('admin'), upload.single('photo'), createTrainer);

router.route('/:id')
  .get(getTrainer)
  .put(authorize('admin'), upload.single('photo'), updateTrainer)
  .delete(authorize('admin'), deleteTrainer);

router.post('/assign', assignTrainerToMember);
router.post('/unassign', unassignTrainerFromMember);
router.put('/:id/toggle-status', authorize('admin'), toggleTrainerStatus);

export default router;

