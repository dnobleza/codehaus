import * as paymentsService from '../services/payments.services';
import type { PaymentStatus } from '../repositories/payments.repository';
import { AppError } from '../utils/helper';
import { catchAsync, getRequester, parsePagination } from '../utils/http';

export const createPayment = catchAsync(async (req, res) => {
  const payment = await paymentsService.createPayment(getRequester(req), req.body);
  res.status(201).json({ success: true, message: 'Payment submitted', data: { payment } });
});

export const listPayments = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const milestoneId = req.query.milestoneId ? Number(req.query.milestoneId) : undefined;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const status = req.query.status ? (String(req.query.status) as PaymentStatus) : undefined;
  const role = req.user!.role;
  const clientId = role === 'client' ? Number(req.user!.sub) : undefined;

  const data = await paymentsService.listPayments(page, limit, {
    milestoneId,
    projectId,
    status,
    clientId,
  });
  res.status(200).json({ success: true, message: 'Payments retrieved', data });
});

export const getPaymentById = catchAsync(async (req, res) => {
  const payment = await paymentsService.getPaymentById(Number(req.params.id), getRequester(req));
  res.status(200).json({ success: true, message: 'Payment retrieved', data: { payment } });
});

export const updatePaymentProof = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('A proof image file is required', 400, 'UPLOAD');
  }
  const payment = await paymentsService.updatePaymentProof(
    Number(req.params.id),
    getRequester(req),
    req.file,
  );
  res.status(200).json({ success: true, message: 'Proof of payment uploaded', data: { payment } });
});

export const updatePaymentStatus = catchAsync(async (req, res) => {
  const payment = await paymentsService.updatePaymentStatus(Number(req.params.id), req.body);
  res.status(200).json({ success: true, message: 'Payment status updated', data: { payment } });
});
