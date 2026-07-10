import * as paymentMethodsService from '../services/paymentMethods.services';
import { AppError } from '../utils/helper';
import { catchAsync, parseAdminIsActiveFilter, parsePagination } from '../utils/http';

export const createPaymentMethod = catchAsync(async (req, res) => {
  const method = await paymentMethodsService.createPaymentMethod(req.body);
  res.status(201).json({ success: true, message: 'Payment method created', data: { method } });
});

export const listPaymentMethods = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const role = req.user!.role;
  const isActive = parseAdminIsActiveFilter(req, role);

  const data = await paymentMethodsService.listPaymentMethods(page, limit, {
    search,
    isActive,
    role,
  });
  res.status(200).json({ success: true, message: 'Payment methods retrieved', data });
});

export const getPaymentMethodById = catchAsync(async (req, res) => {
  const method = await paymentMethodsService.getPaymentMethodById(
    Number(req.params.id),
    req.user!.role,
  );
  res.status(200).json({ success: true, message: 'Payment method retrieved', data: { method } });
});

export const updatePaymentMethod = catchAsync(async (req, res) => {
  const method = await paymentMethodsService.updatePaymentMethod(Number(req.params.id), req.body);
  res.status(200).json({ success: true, message: 'Payment method updated', data: { method } });
});

export const deletePaymentMethod = catchAsync(async (req, res) => {
  await paymentMethodsService.deletePaymentMethod(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Payment method deleted' });
});

export const updateQrCode = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('A QR code image file is required', 400, 'UPLOAD');
  }
  const method = await paymentMethodsService.updateQrCode(Number(req.params.id), req.file);
  res.status(200).json({ success: true, message: 'QR code updated', data: { method } });
});

export const deleteQrCode = catchAsync(async (req, res) => {
  const method = await paymentMethodsService.deleteQrCode(Number(req.params.id));
  res.status(200).json({ success: true, message: 'QR code removed', data: { method } });
});
