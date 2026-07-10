import { Router } from 'express';
import * as projectsController from '../controllers/projects.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  listProjectsValidation,
  projectIdParamValidation,
  updateProjectValidation,
} from '../validations/projects.validation';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listProjectsValidation,
  validate,
  projectsController.listProjects,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  projectIdParamValidation,
  validate,
  projectsController.getProjectById,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  projectIdParamValidation,
  updateProjectValidation,
  validate,
  projectsController.updateProject,
);

export default router;
