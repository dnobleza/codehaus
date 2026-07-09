import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  loginLimiter,
  refreshLimiter,
  registerLimiter,
} from '../middleware/ratelimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  changePasswordValidation,
  clientIdParamValidation,
  deactivateValidation,
  listClientsValidation,
  loginValidation,
  refreshValidation,
  registerValidation,
  updateProfileValidation,
} from '../validations/users.validation';

const router = Router();

router.post('/register', registerLimiter, registerValidation, validate, usersController.register);
router.post('/login', loginLimiter, loginValidation, validate, usersController.login);
router.post('/refresh', refreshLimiter, refreshValidation, validate, usersController.refresh);
router.post('/logout', refreshLimiter, refreshValidation, validate, usersController.logout);

router.get('/me', authenticate, authorize('client', 'admin'), usersController.me);
router.patch(
  '/me',
  authenticate,
  authorize('client', 'admin'),
  updateProfileValidation,
  validate,
  usersController.updateProfile,
);
router.patch(
  '/me/password',
  authenticate,
  authorize('client', 'admin'),
  changePasswordValidation,
  validate,
  usersController.changePassword,
);
router.post(
  '/me/deactivate',
  authenticate,
  authorize('client', 'admin'),
  deactivateValidation,
  validate,
  usersController.deactivateSelf,
);

router.get(
  '/',
  authenticate,
  authorize('admin'),
  listClientsValidation,
  validate,
  usersController.listClients,
);
router.get(
  '/:id',
  authenticate,
  authorize('admin'),
  clientIdParamValidation,
  validate,
  usersController.getClientById,
);
router.patch(
  '/:id/activate',
  authenticate,
  authorize('admin'),
  clientIdParamValidation,
  validate,
  usersController.activateClient,
);
router.patch(
  '/:id/deactivate',
  authenticate,
  authorize('admin'),
  clientIdParamValidation,
  validate,
  usersController.deactivateClient,
);
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  clientIdParamValidation,
  validate,
  usersController.deleteClient,
);

export default router;
