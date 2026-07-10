import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { buildUpdateSetClause } from '../utils/db';

export type MilestoneStatus = 'Pending' | 'Paid';

export interface MilestoneRow extends RowDataPacket {
  milestone_id: number;
  project_id: number;
  title: string;
  required_progress_percentage: string;
  amount: string;
  status: MilestoneStatus;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MilestoneWithClientRow extends MilestoneRow {
  client_id: number;
}

export interface CreateMilestoneInput {
  projectId: number;
  title: string;
  requiredProgressPercentage: number;
  amount: number;
  dueDate: string | null;
}

export const createMilestone = async (input: CreateMilestoneInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO project_milestones
      (project_id, title, required_progress_percentage, amount, status, due_date)
     VALUES (?, ?, ?, ?, 'Pending', ?)`,
    [input.projectId, input.title, input.requiredProgressPercentage, input.amount, input.dueDate],
  );
  return result.insertId;
};

export const findMilestoneById = async (milestoneId: number): Promise<MilestoneRow | null> => {
  const [rows] = await pool.query<MilestoneRow[]>(
    'SELECT * FROM project_milestones WHERE milestone_id = ? LIMIT 1',
    [milestoneId],
  );
  return rows[0] ?? null;
};

export const findMilestoneByIdWithClient = async (
  milestoneId: number,
): Promise<MilestoneWithClientRow | null> => {
  const [rows] = await pool.query<MilestoneWithClientRow[]>(
    `SELECT m.*, q.client_id AS client_id
     FROM project_milestones m
     INNER JOIN projects p ON p.project_id = m.project_id
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     WHERE m.milestone_id = ?
     LIMIT 1`,
    [milestoneId],
  );
  return rows[0] ?? null;
};

export const findMilestonesList = async (
  projectId: number,
  limit: number,
  offset: number,
): Promise<MilestoneRow[]> => {
  const [rows] = await pool.query<MilestoneRow[]>(
    `SELECT * FROM project_milestones WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [projectId, limit, offset],
  );
  return rows;
};

export const countMilestones = async (projectId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM project_milestones WHERE project_id = ?',
    [projectId],
  );
  return Number(rows[0]?.total ?? 0);
};

export interface UpdateMilestoneFields {
  title?: string;
  requiredProgressPercentage?: number;
  amount?: number;
  dueDate?: string | null;
}

const MILESTONE_FIELD_COLUMNS: Record<keyof UpdateMilestoneFields, string> = {
  title: 'title',
  requiredProgressPercentage: 'required_progress_percentage',
  amount: 'amount',
  dueDate: 'due_date',
};

export const updateMilestone = async (
  milestoneId: number,
  fields: UpdateMilestoneFields,
): Promise<void> => {
  const built = buildUpdateSetClause(fields, MILESTONE_FIELD_COLUMNS);
  if (built === null) {
    return;
  }
  const { setClause, values } = built;
  await pool.query(
    `UPDATE project_milestones SET ${setClause}, updated_at = NOW() WHERE milestone_id = ?`,
    [...values, milestoneId],
  );
};

export const deleteMilestone = async (milestoneId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM project_milestones WHERE milestone_id = ?',
    [milestoneId],
  );
  return result.affectedRows > 0;
};

export const countPaymentsForMilestone = async (milestoneId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM payments WHERE milestone_id = ?',
    [milestoneId],
  );
  return Number(rows[0]?.total ?? 0);
};
