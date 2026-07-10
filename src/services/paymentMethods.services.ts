import * as paymentMethodsRepository from '../repositories/paymentMethods.repository';
import * as storageServices from './storage.services';
import type { Pagination } from '../types/common';
import { AppError } from '../utils/helper';
import { assertHasUpdateFields, rethrowDuplicate } from '../utils/serviceHelpers';

export interface PaymentMethodDTO {
  methodId: number;
  methodName: string;
  methodType: paymentMethodsRepository.PaymentMethodType;
  accountName: string | null;
  accountNumber: string | null;
  qrCodeUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const toPaymentMethodDTO = (row: paymentMethodsRepository.PaymentMethodRow): PaymentMethodDTO => ({
  methodId: row.method_id,
  methodName: row.method_name,
  methodType: row.method_type,
  accountName: row.account_name,
  accountNumber: row.account_number,
  qrCodeUrl: row.qr_code_url,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fetchPaymentMethod = async (methodId: number): Promise<PaymentMethodDTO> => {
  const method = await paymentMethodsRepository.findPaymentMethodById(methodId);
  if (!method) {
    throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD');
  }
  return toPaymentMethodDTO(method);
};

export interface CreatePaymentMethodInput {
  methodName: string;
  methodType?: 'manual';
  accountName?: string;
  accountNumber?: string;
}

export const createPaymentMethod = async (
  input: CreatePaymentMethodInput,
): Promise<PaymentMethodDTO> => {
  let methodId: number;
  try {
    methodId = await paymentMethodsRepository.createPaymentMethod({
      methodName: input.methodName,
      methodType: input.methodType ?? 'manual',
      accountName: input.accountName ?? null,
      accountNumber: input.accountNumber ?? null,
    });
  } catch (error) {
    return rethrowDuplicate(
      error,
      'A payment method with this name already exists',
      'PAYMENT_METHOD',
    );
  }

  return fetchPaymentMethod(methodId);
};

export interface PaginatedPaymentMethods {
  methods: PaymentMethodDTO[];
  pagination: Pagination;
}

export interface ListPaymentMethodsFilters {
  isActive?: boolean;
  search?: string;
  role: 'client' | 'admin';
}

export const listPaymentMethods = async (
  page: number,
  limit: number,
  filters: ListPaymentMethodsFilters,
): Promise<PaginatedPaymentMethods> => {
  const offset = (page - 1) * limit;
  const effectiveFilters = {
    search: filters.search,
    isActive: filters.role === 'client' ? true : filters.isActive,
  };

  const [rows, total] = await Promise.all([
    paymentMethodsRepository.findPaymentMethodsList(limit, offset, effectiveFilters),
    paymentMethodsRepository.countPaymentMethods(effectiveFilters),
  ]);

  return {
    methods: rows.map(toPaymentMethodDTO),
    pagination: { page, limit, total },
  };
};

export const getPaymentMethodById = async (
  methodId: number,
  role: 'client' | 'admin',
): Promise<PaymentMethodDTO> => {
  const method = await fetchPaymentMethod(methodId);
  if (role === 'client' && !method.isActive) {
    throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD');
  }
  return method;
};

export interface UpdatePaymentMethodInput {
  methodName?: string;
  methodType?: 'manual';
  accountName?: string;
  accountNumber?: string;
  isActive?: boolean;
}

export const updatePaymentMethod = async (
  methodId: number,
  input: UpdatePaymentMethodInput,
): Promise<PaymentMethodDTO> => {
  assertHasUpdateFields(input, 'PAYMENT_METHOD');

  const existing = await paymentMethodsRepository.findPaymentMethodById(methodId);
  if (!existing) {
    throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD');
  }

  try {
    await paymentMethodsRepository.updatePaymentMethod(methodId, {
      methodName: input.methodName,
      methodType: input.methodType,
      accountName: input.accountName,
      accountNumber: input.accountNumber,
      isActive: input.isActive,
    });
  } catch (error) {
    rethrowDuplicate(error, 'A payment method with this name already exists', 'PAYMENT_METHOD');
  }

  return fetchPaymentMethod(methodId);
};

export const deletePaymentMethod = async (methodId: number): Promise<void> => {
  const existing = await paymentMethodsRepository.findPaymentMethodById(methodId);
  if (!existing) {
    throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD');
  }

  const paymentCount = await paymentMethodsRepository.countPaymentsForMethod(methodId);
  if (paymentCount > 0) {
    throw new AppError(
      'Cannot delete a payment method with payment history — deactivate it instead',
      409,
      'PAYMENT_METHOD',
    );
  }

  await paymentMethodsRepository.deletePaymentMethod(methodId);
};

export const updateQrCode = async (
  methodId: number,
  file: Express.Multer.File,
): Promise<PaymentMethodDTO> => {
  const existing = await paymentMethodsRepository.findPaymentMethodById(methodId);
  if (!existing) {
    throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD');
  }

  const previousQrCodeUrl = existing.qr_code_url;
  const { url } = await storageServices.uploadImage(file.buffer, file.mimetype, 'payment-methods');
  await paymentMethodsRepository.updateQrCodeUrl(methodId, url);

  if (previousQrCodeUrl) {
    await storageServices.deleteImage(previousQrCodeUrl);
  }

  return fetchPaymentMethod(methodId);
};

export const deleteQrCode = async (methodId: number): Promise<PaymentMethodDTO> => {
  const existing = await paymentMethodsRepository.findPaymentMethodById(methodId);
  if (!existing) {
    throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD');
  }

  if (existing.qr_code_url) {
    await storageServices.deleteImage(existing.qr_code_url);
    await paymentMethodsRepository.updateQrCodeUrl(methodId, null);
  }

  return fetchPaymentMethod(methodId);
};
