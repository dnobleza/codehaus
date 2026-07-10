import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { withTransaction } from '../utils/db';

export type PaymentStatus = 'Pending' | 'Verified' | 'Rejected';

export interface PaymentRow extends RowDataPacket {
  payment_id: number;
  milestone_id: number;
  method_id: number;
  amount_paid: string;
  reference_number: string;
  payment_date: Date;
  proof_image_url: string | null;
  payment_status: PaymentStatus;
  gateway_reference: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentWithClientRow extends PaymentRow {
  client_id: number;
}

export interface MilestoneForPaymentRow extends RowDataPacket {
  milestone_id: number;
  milestone_status: 'Pending' | 'Paid';
  client_id: number;
  project_status: string;
}

export const findMilestoneForPayment = async (
  milestoneId: number,
): Promise<MilestoneForPaymentRow | null> => {
  const [rows] = await pool.query<MilestoneForPaymentRow[]>(
    `SELECT m.milestone_id, m.status AS milestone_status, q.client_id AS client_id, p.status AS project_status
     FROM project_milestones m
     INNER JOIN projects p ON p.project_id = m.project_id
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     WHERE m.milestone_id = ?
     LIMIT 1`,
    [milestoneId],
  );
  return rows[0] ?? null;
};

export const countActivePaymentsForMilestone = async (milestoneId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM payments
     WHERE milestone_id = ? AND payment_status IN ('Pending', 'Verified')`,
    [milestoneId],
  );
  return Number(rows[0]?.total ?? 0);
};

export interface CreatePaymentInput {
  milestoneId: number;
  methodId: number;
  amountPaid: number;
  referenceNumber: string;
  paymentDate: string;
}

export const createPayment = async (input: CreatePaymentInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO payments
      (milestone_id, method_id, amount_paid, reference_number, payment_date, proof_image_url, payment_status)
     VALUES (?, ?, ?, ?, ?, NULL, 'Pending')`,
    [input.milestoneId, input.methodId, input.amountPaid, input.referenceNumber, input.paymentDate],
  );
  return result.insertId;
};

export const findPaymentById = async (paymentId: number): Promise<PaymentRow | null> => {
  const [rows] = await pool.query<PaymentRow[]>(
    'SELECT * FROM payments WHERE payment_id = ? LIMIT 1',
    [paymentId],
  );
  return rows[0] ?? null;
};

export const findPaymentByIdWithClient = async (
  paymentId: number,
): Promise<PaymentWithClientRow | null> => {
  const [rows] = await pool.query<PaymentWithClientRow[]>(
    `SELECT pay.*, q.client_id AS client_id
     FROM payments pay
     INNER JOIN project_milestones m ON m.milestone_id = pay.milestone_id
     INNER JOIN projects p ON p.project_id = m.project_id
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     WHERE pay.payment_id = ?
     LIMIT 1`,
    [paymentId],
  );
  return rows[0] ?? null;
};

export interface PaymentListFilters {
  milestoneId?: number;
  projectId?: number;
  status?: PaymentStatus;
  clientId?: number;
}

const buildPaymentFilterClause = (
  filters: PaymentListFilters,
): { where: string; params: unknown[] } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.milestoneId !== undefined) {
    conditions.push('pay.milestone_id = ?');
    params.push(filters.milestoneId);
  }
  if (filters.projectId !== undefined) {
    conditions.push('m.project_id = ?');
    params.push(filters.projectId);
  }
  if (filters.status) {
    conditions.push('pay.payment_status = ?');
    params.push(filters.status);
  }
  if (filters.clientId !== undefined) {
    conditions.push('q.client_id = ?');
    params.push(filters.clientId);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

const PAYMENT_LIST_JOIN = `
  FROM payments pay
  INNER JOIN project_milestones m ON m.milestone_id = pay.milestone_id
  INNER JOIN projects p ON p.project_id = m.project_id
  INNER JOIN quotations q ON q.quotation_id = p.quotation_id
`;

export const findPaymentsList = async (
  limit: number,
  offset: number,
  filters: PaymentListFilters,
): Promise<PaymentRow[]> => {
  const { where, params } = buildPaymentFilterClause(filters);
  const [rows] = await pool.query<PaymentRow[]>(
    `SELECT pay.* ${PAYMENT_LIST_JOIN} ${where} ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
};

export const countPayments = async (filters: PaymentListFilters): Promise<number> => {
  const { where, params } = buildPaymentFilterClause(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total ${PAYMENT_LIST_JOIN} ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
};

export const updateProofImageUrl = async (
  paymentId: number,
  proofImageUrl: string | null,
): Promise<void> => {
  await pool.query(
    'UPDATE payments SET proof_image_url = ?, updated_at = NOW() WHERE payment_id = ?',
    [proofImageUrl, paymentId],
  );
};

export const updatePaymentStatus = async (paymentId: number, status: 'Rejected'): Promise<void> => {
  await pool.query(
    'UPDATE payments SET payment_status = ?, updated_at = NOW() WHERE payment_id = ?',
    [status, paymentId],
  );
};

export const verifyPaymentTx = async (paymentId: number, milestoneId: number): Promise<void> => {
  return withTransaction(async (conn) => {
    await conn.query(
      "UPDATE payments SET payment_status = 'Verified', updated_at = NOW() WHERE payment_id = ?",
      [paymentId],
    );
    await conn.query(
      "UPDATE project_milestones SET status = 'Paid', updated_at = NOW() WHERE milestone_id = ?",
      [milestoneId],
    );
  });
};
