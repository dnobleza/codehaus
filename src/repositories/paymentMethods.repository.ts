import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { buildUpdateSetClause } from '../utils/db';

export type PaymentMethodType = 'manual' | 'paymongo' | 'stripe';

export interface PaymentMethodRow extends RowDataPacket {
  method_id: number;
  method_name: string;
  method_type: PaymentMethodType;
  account_name: string | null;
  account_number: string | null;
  qr_code_url: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentMethodInput {
  methodName: string;
  methodType: PaymentMethodType;
  accountName: string | null;
  accountNumber: string | null;
}

export const createPaymentMethod = async (input: CreatePaymentMethodInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO payment_methods
      (method_name, method_type, account_name, account_number, qr_code_url, is_active)
     VALUES (?, ?, ?, ?, NULL, 1)`,
    [input.methodName, input.methodType, input.accountName, input.accountNumber],
  );
  return result.insertId;
};

export const findPaymentMethodById = async (methodId: number): Promise<PaymentMethodRow | null> => {
  const [rows] = await pool.query<PaymentMethodRow[]>(
    'SELECT * FROM payment_methods WHERE method_id = ? LIMIT 1',
    [methodId],
  );
  return rows[0] ?? null;
};

export interface PaymentMethodListFilters {
  isActive?: boolean;
  search?: string;
}

const buildPaymentMethodFilterClause = (
  filters: PaymentMethodListFilters,
): { where: string; params: unknown[] } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.isActive !== undefined) {
    conditions.push('is_active = ?');
    params.push(filters.isActive ? 1 : 0);
  }
  if (filters.search) {
    conditions.push('method_name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

export const findPaymentMethodsList = async (
  limit: number,
  offset: number,
  filters: PaymentMethodListFilters,
): Promise<PaymentMethodRow[]> => {
  const { where, params } = buildPaymentMethodFilterClause(filters);
  const [rows] = await pool.query<PaymentMethodRow[]>(
    `SELECT * FROM payment_methods ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
};

export const countPaymentMethods = async (filters: PaymentMethodListFilters): Promise<number> => {
  const { where, params } = buildPaymentMethodFilterClause(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM payment_methods ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
};

export interface UpdatePaymentMethodFields {
  methodName?: string;
  methodType?: PaymentMethodType;
  accountName?: string | null;
  accountNumber?: string | null;
  isActive?: boolean;
}

const PAYMENT_METHOD_FIELD_COLUMNS: Record<keyof UpdatePaymentMethodFields, string> = {
  methodName: 'method_name',
  methodType: 'method_type',
  accountName: 'account_name',
  accountNumber: 'account_number',
  isActive: 'is_active',
};

export const updatePaymentMethod = async (
  methodId: number,
  fields: UpdatePaymentMethodFields,
): Promise<void> => {
  const built = buildUpdateSetClause(fields, PAYMENT_METHOD_FIELD_COLUMNS, (key, value) =>
    key === 'isActive' ? (value ? 1 : 0) : value,
  );
  if (built === null) {
    return;
  }
  const { setClause, values } = built;
  await pool.query(
    `UPDATE payment_methods SET ${setClause}, updated_at = NOW() WHERE method_id = ?`,
    [...values, methodId],
  );
};

export const updateQrCodeUrl = async (
  methodId: number,
  qrCodeUrl: string | null,
): Promise<void> => {
  await pool.query(
    'UPDATE payment_methods SET qr_code_url = ?, updated_at = NOW() WHERE method_id = ?',
    [qrCodeUrl, methodId],
  );
};

export const deletePaymentMethod = async (methodId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM payment_methods WHERE method_id = ?',
    [methodId],
  );
  return result.affectedRows > 0;
};

export const countPaymentsForMethod = async (methodId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM payments WHERE method_id = ?',
    [methodId],
  );
  return Number(rows[0]?.total ?? 0);
};
