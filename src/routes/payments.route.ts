import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createPaymentValidation,
  listPaymentsValidation,
  paymentIdParamValidation,
  updatePaymentStatusValidation,
} from '../validations/payments.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('client', 'admin'),
  createPaymentValidation,
  validate,
  paymentsController.createPayment,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listPaymentsValidation,
  validate,
  paymentsController.listPayments,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  paymentIdParamValidation,
  validate,
  paymentsController.getPaymentById,
);
router.patch(
  '/:id/proof',
  authenticate,
  authorize('client', 'admin'),
  paymentIdParamValidation,
  validate,
  ...uploadSingleImage('proofImage'),
  paymentsController.updatePaymentProof,
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  updatePaymentStatusValidation,
  validate,
  paymentsController.updatePaymentStatus,
);

export default router;
