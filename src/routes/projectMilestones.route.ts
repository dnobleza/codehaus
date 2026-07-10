import { Router } from 'express';
import * as projectMilestonesController from '../controllers/projectMilestones.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createMilestoneValidation,
  listMilestonesValidation,
  milestoneIdParamValidation,
  updateMilestoneValidation,
} from '../validations/projectMilestones.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('admin'),
  createMilestoneValidation,
  validate,
  projectMilestonesController.createMilestone,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listMilestonesValidation,
  validate,
  projectMilestonesController.listMilestones,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  milestoneIdParamValidation,
  validate,
  projectMilestonesController.getMilestoneById,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  milestoneIdParamValidation,
  updateMilestoneValidation,
  validate,
  projectMilestonesController.updateMilestone,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  milestoneIdParamValidation,
  validate,
  projectMilestonesController.deleteMilestone,
);

export default router;
