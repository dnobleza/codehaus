import { Router } from 'express';
import * as quotationsController from '../controllers/quotations.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createQuotationValidation,
  listQuotationsValidation,
  quotationIdParamValidation,
  updateQuotationStatusValidation,
} from '../validations/quotations.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('client', 'admin'),
  createQuotationValidation,
  validate,
  quotationsController.createQuotation,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listQuotationsValidation,
  validate,
  quotationsController.listQuotations,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  quotationIdParamValidation,
  validate,
  quotationsController.getQuotationById,
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  updateQuotationStatusValidation,
  validate,
  quotationsController.updateQuotationStatus,
);

export default router;
