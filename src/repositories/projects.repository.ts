import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { buildUpdateSetClause } from '../utils/db';

export type ProjectStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

export interface ProjectRow extends RowDataPacket {
  project_id: number;
  quotation_id: number;
  project_name: string;
  overall_progress: string;
  status: ProjectStatus;
  start_date: Date;
  expected_end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectWithClientRow extends ProjectRow {
  client_id: number;
}

export const findProjectByIdWithClient = async (
  projectId: number,
): Promise<ProjectWithClientRow | null> => {
  const [rows] = await pool.query<ProjectWithClientRow[]>(
    `SELECT p.*, q.client_id AS client_id
     FROM projects p
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     WHERE p.project_id = ?
     LIMIT 1`,
    [projectId],
  );
  return rows[0] ?? null;
};

export interface ProjectListFilters {
  status?: ProjectStatus;
  clientId?: number;
}

const buildProjectFilterClause = (
  filters: ProjectListFilters,
): { where: string; params: unknown[] } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    conditions.push('p.status = ?');
    params.push(filters.status);
  }
  if (filters.clientId !== undefined) {
    conditions.push('q.client_id = ?');
    params.push(filters.clientId);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

export const findProjectsList = async (
  limit: number,
  offset: number,
  filters: ProjectListFilters,
): Promise<ProjectRow[]> => {
  const { where, params } = buildProjectFilterClause(filters);
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT p.*
     FROM projects p
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
};

export const countProjects = async (filters: ProjectListFilters): Promise<number> => {
  const { where, params } = buildProjectFilterClause(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM projects p
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
};

export interface UpdateProjectFields {
  projectName?: string;
  status?: ProjectStatus;
  startDate?: string;
  expectedEndDate?: string | null;
  overallProgress?: number;
}

const PROJECT_FIELD_COLUMNS: Record<keyof UpdateProjectFields, string> = {
  projectName: 'project_name',
  status: 'status',
  startDate: 'start_date',
  expectedEndDate: 'expected_end_date',
  overallProgress: 'overall_progress',
};

export const updateProject = async (
  projectId: number,
  fields: UpdateProjectFields,
): Promise<void> => {
  const built = buildUpdateSetClause(fields, PROJECT_FIELD_COLUMNS);
  if (built === null) {
    return;
  }
  const { setClause, values } = built;
  await pool.query(`UPDATE projects SET ${setClause}, updated_at = NOW() WHERE project_id = ?`, [
    ...values,
    projectId,
  ]);
};
