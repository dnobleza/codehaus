import * as paymentMethodsRepository from '../repositories/paymentMethods.repository';
import * as paymentsRepository from '../repositories/payments.repository';
import * as storageServices from './storage.services';
import type { Pagination, Requester } from '../types/common';
import { AppError, roundMoney, toDateOnlyString } from '../utils/helper';

export interface PaymentDTO {
  paymentId: number;
  milestoneId: number;
  methodId: number;
  amountPaid: number;
  referenceNumber: string;
  paymentDate: string;
  proofImageUrl: string | null;
  paymentStatus: paymentsRepository.PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const toPaymentDTO = (row: paymentsRepository.PaymentRow): PaymentDTO => ({
  paymentId: row.payment_id,
  milestoneId: row.milestone_id,
  methodId: row.method_id,
  amountPaid: Number(row.amount_paid),
  referenceNumber: row.reference_number,
  paymentDate: toDateOnlyString(row.payment_date) as string,
  proofImageUrl: row.proof_image_url,
  paymentStatus: row.payment_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fetchPayment = async (paymentId: number): Promise<PaymentDTO> => {
  const payment = await paymentsRepository.findPaymentById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT');
  }
  return toPaymentDTO(payment);
};

export interface CreatePaymentInput {
  milestoneId: number;
  methodId: number;
  amountPaid: number;
  referenceNumber: string;
  paymentDate: string;
}

export const createPayment = async (
  actor: Requester,
  input: CreatePaymentInput,
): Promise<PaymentDTO> => {
  const milestone = await paymentsRepository.findMilestoneForPayment(input.milestoneId);
  if (!milestone || (actor.role === 'client' && milestone.client_id !== actor.userId)) {
    throw new AppError('Milestone not found', 404, 'PAYMENT');
  }

  if (milestone.milestone_status === 'Paid') {
    throw new AppError('This milestone has already been paid', 409, 'PAYMENT');
  }

  const activeCount = await paymentsRepository.countActivePaymentsForMilestone(input.milestoneId);
  if (activeCount > 0) {
    throw new AppError(
      'A payment is already awaiting review or has been verified for this milestone',
      409,
      'PAYMENT',
    );
  }

  const method = await paymentMethodsRepository.findPaymentMethodById(input.methodId);
  if (!method || !method.is_active) {
    throw new AppError('Payment method not found or inactive', 404, 'PAYMENT');
  }

  if (milestone.project_status === 'Cancelled') {
    throw new AppError('Project is cancelled, cannot accept new payments', 409, 'PAYMENT');
  }

  const paymentId = await paymentsRepository.createPayment({
    milestoneId: input.milestoneId,
    methodId: input.methodId,
    amountPaid: roundMoney(input.amountPaid),
    referenceNumber: input.referenceNumber,
    paymentDate: input.paymentDate,
  });

  return fetchPayment(paymentId);
};

export interface PaginatedPayments {
  payments: PaymentDTO[];
  pagination: Pagination;
}

export interface ListPaymentsFilters {
  milestoneId?: number;
  projectId?: number;
  status?: paymentsRepository.PaymentStatus;
  clientId?: number;
}

export const listPayments = async (
  page: number,
  limit: number,
  filters: ListPaymentsFilters,
): Promise<PaginatedPayments> => {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    paymentsRepository.findPaymentsList(limit, offset, filters),
    paymentsRepository.countPayments(filters),
  ]);

  return {
    payments: rows.map(toPaymentDTO),
    pagination: { page, limit, total },
  };
};

export const getPaymentById = async (paymentId: number, actor: Requester): Promise<PaymentDTO> => {
  const payment = await paymentsRepository.findPaymentByIdWithClient(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT');
  }
  if (actor.role === 'client' && payment.client_id !== actor.userId) {
    throw new AppError('Payment not found', 404, 'PAYMENT');
  }
  return toPaymentDTO(payment);
};

export const updatePaymentProof = async (
  paymentId: number,
  actor: Requester,
  file: Express.Multer.File,
): Promise<PaymentDTO> => {
  const existing = await paymentsRepository.findPaymentByIdWithClient(paymentId);
  if (!existing) {
    throw new AppError('Payment not found', 404, 'PAYMENT');
  }
  if (actor.role === 'client' && existing.client_id !== actor.userId) {
    throw new AppError('Payment not found', 404, 'PAYMENT');
  }
  if (existing.payment_status !== 'Pending') {
    throw new AppError('Payment already finalized', 409, 'PAYMENT');
  }

  const previousProofImageUrl = existing.proof_image_url;
  const { url } = await storageServices.uploadImage(file.buffer, file.mimetype, 'payment-proofs');
  await paymentsRepository.updateProofImageUrl(paymentId, url);

  if (previousProofImageUrl) {
    await storageServices.deleteImage(previousProofImageUrl);
  }

  return fetchPayment(paymentId);
};

export interface UpdatePaymentStatusInput {
  status: 'Verified' | 'Rejected';
}

export const updatePaymentStatus = async (
  paymentId: number,
  input: UpdatePaymentStatusInput,
): Promise<PaymentDTO> => {
  const existing = await paymentsRepository.findPaymentById(paymentId);
  if (!existing) {
    throw new AppError('Payment not found', 404, 'PAYMENT');
  }
  if (existing.payment_status !== 'Pending') {
    throw new AppError('Payment already finalized', 409, 'PAYMENT');
  }

  if (input.status === 'Verified') {
    if (!existing.proof_image_url) {
      throw new AppError('Proof of payment is required before verification', 400, 'PAYMENT');
    }
    await paymentsRepository.verifyPaymentTx(paymentId, existing.milestone_id);
  } else {
    await paymentsRepository.updatePaymentStatus(paymentId, 'Rejected');
  }

  return fetchPayment(paymentId);
};
