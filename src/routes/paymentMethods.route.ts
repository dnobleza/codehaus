import { Router } from 'express';
import * as paymentMethodsController from '../controllers/paymentMethods.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createPaymentMethodValidation,
  listPaymentMethodsValidation,
  paymentMethodIdParamValidation,
  updatePaymentMethodValidation,
} from '../validations/paymentMethods.validation';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('admin'),
  createPaymentMethodValidation,
  validate,
  paymentMethodsController.createPaymentMethod,
);
router.get(
  '/',
  authenticate,
  authorize('client', 'admin'),
  listPaymentMethodsValidation,
  validate,
  paymentMethodsController.listPaymentMethods,
);
router.get(
  '/:id',
  authenticate,
  authorize('client', 'admin'),
  paymentMethodIdParamValidation,
  validate,
  paymentMethodsController.getPaymentMethodById,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  paymentMethodIdParamValidation,
  updatePaymentMethodValidation,
  validate,
  paymentMethodsController.updatePaymentMethod,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  paymentMethodIdParamValidation,
  validate,
  paymentMethodsController.deletePaymentMethod,
);
router.patch(
  '/:id/qr-code',
  authenticate,
  authorize('admin'),
  paymentMethodIdParamValidation,
  validate,
  ...uploadSingleImage('qrCode'),
  paymentMethodsController.updateQrCode,
);
router.delete(
  '/:id/qr-code',
  authenticate,
  authorize('admin'),
  paymentMethodIdParamValidation,
  validate,
  paymentMethodsController.deleteQrCode,
);

export default router;
