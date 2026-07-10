import { Router } from 'express';
import * as projectUpdatesController from '../controllers/projectUpdates.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createProjectUpdateValidation,
  listProjectUpdatesValidation,
  projectUpdateIdParamValidation,
} from '../validations/projectUpdates.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('admin'),
  createProjectUpdateValidation,
  validate,
  projectUpdatesController.createProjectUpdate,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listProjectUpdatesValidation,
  validate,
  projectUpdatesController.listProjectUpdates,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  projectUpdateIdParamValidation,
  validate,
  projectUpdatesController.getProjectUpdateById,
);

export default router;
