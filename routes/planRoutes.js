import express from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
  getPlanStatistics
} from '../controllers/planController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPlans)
  .post(authorize('admin'), createPlan);

router.get('/statistics', getPlanStatistics);

router.route('/:id')
  .get(getPlan)
  .put(authorize('admin'), updatePlan)
  .delete(authorize('admin'), deletePlan);

router.put('/:id/toggle-status', authorize('admin'), togglePlanStatus);

export default router;

