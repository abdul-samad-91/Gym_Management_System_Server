import express from 'express';
import {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  assignPlan,
  renewMembership,
  updateMembershipStatus,
  getExpiringMemberships
} from '../controllers/memberController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMembers)
  .post(
    // upload.single('photo'), 
    createMember);

router.route('/:id')
  .get(getMember)
  .put(upload.single('photo'), updateMember)
  .delete(deleteMember);

router.post('/assign-plan', assignPlan);
router.post('/renew', renewMembership);
router.put('/status', updateMembershipStatus);
router.get('/expiring/list', getExpiringMemberships);

export default router;

