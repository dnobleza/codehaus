import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { withTransaction } from '../utils/db';

export type QuotationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export interface QuotationRow extends RowDataPacket {
  quotation_id: number;
  client_id: number;
  bundle_id: number | null;
  quotation_type: 'Fixed' | 'Manual';
  subtotal: string;
  discount: string;
  tax: string;
  grand_total: string;
  status: QuotationStatus;
  approved_at: Date | null;
  created_at: Date;
}

export interface QuotationItemRow extends RowDataPacket {
  quotation_item_id: number;
  quotation_id: number;
  feature_id: number | null;
  item_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface CreateQuotationInput {
  clientId: number;
  bundleId: number | null;
  quotationType: 'Fixed' | 'Manual';
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: 'Pending';
}

export interface CreateQuotationItemInput {
  featureId: number | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export const createQuotationTx = async (
  input: CreateQuotationInput,
  items: CreateQuotationItemInput[],
): Promise<number> => {
  return withTransaction(async (conn) => {
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO quotations
        (client_id, bundle_id, quotation_type, subtotal, discount, tax, grand_total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.clientId,
        input.bundleId,
        input.quotationType,
        input.subtotal,
        input.discount,
        input.tax,
        input.grandTotal,
        input.status,
      ],
    );
    const quotationId = result.insertId;

    if (items.length > 0) {
      const placeholders = items.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = items.flatMap((item) => [
        quotationId,
        item.featureId,
        item.itemName,
        item.quantity,
        item.unitPrice,
        item.subtotal,
      ]);
      await conn.query(
        `INSERT INTO quotation_items (quotation_id, feature_id, item_name, quantity, unit_price, subtotal)
         VALUES ${placeholders}`,
        values,
      );
    }

    return quotationId;
  });
};

export const findQuotationById = async (quotationId: number): Promise<QuotationRow | null> => {
  const [rows] = await pool.query<QuotationRow[]>(
    'SELECT * FROM quotations WHERE quotation_id = ? LIMIT 1',
    [quotationId],
  );
  return rows[0] ?? null;
};

export const findQuotationItems = async (quotationId: number): Promise<QuotationItemRow[]> => {
  const [rows] = await pool.query<QuotationItemRow[]>(
    'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY quotation_item_id ASC',
    [quotationId],
  );
  return rows;
};

export interface QuotationListFilters {
  status?: QuotationStatus;
  clientId?: number;
}

const buildQuotationFilterClause = (
  filters: QuotationListFilters,
): { where: string; params: unknown[] } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.clientId !== undefined) {
    conditions.push('client_id = ?');
    params.push(filters.clientId);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

export const findQuotationsList = async (
  limit: number,
  offset: number,
  filters: QuotationListFilters,
): Promise<QuotationRow[]> => {
  const { where, params } = buildQuotationFilterClause(filters);
  const [rows] = await pool.query<QuotationRow[]>(
    `SELECT * FROM quotations ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
};

export const countQuotations = async (filters: QuotationListFilters): Promise<number> => {
  const { where, params } = buildQuotationFilterClause(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM quotations ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
};

export interface UpdateQuotationStatusFields {
  status: 'Approved' | 'Rejected' | 'Expired';
  discount: number;
  tax: number;
  grandTotal: number;
}

export interface UpdateQuotationStatusProjectInput {
  projectName: string;
  startDate: string;
}

export interface UpdateQuotationStatusTxResult {
  projectId: number | null;
}

export const updateQuotationStatusTx = async (
  quotationId: number,
  fields: UpdateQuotationStatusFields & { approvedAt: Date | null },
  projectInput: UpdateQuotationStatusProjectInput | null,
): Promise<UpdateQuotationStatusTxResult> => {
  return withTransaction(async (conn) => {
    await conn.query(
      `UPDATE quotations SET status = ?, discount = ?, tax = ?, grand_total = ?, approved_at = ? WHERE quotation_id = ?`,
      [
        fields.status,
        fields.discount,
        fields.tax,
        fields.grandTotal,
        fields.approvedAt,
        quotationId,
      ],
    );

    let projectId: number | null = null;
    if (projectInput !== null) {
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO projects (quotation_id, project_name, overall_progress, status, start_date, expected_end_date)
         VALUES (?, ?, 0.00, 'Not Started', ?, NULL)`,
        [quotationId, projectInput.projectName, projectInput.startDate],
      );
      projectId = result.insertId;
    }

    return { projectId };
  });
};
