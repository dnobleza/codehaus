import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { withTransaction } from '../utils/db';

export interface ProjectUpdateRow extends RowDataPacket {
  update_id: number;
  project_id: number;
  title: string;
  description: string | null;
  progress: string;
  created_at: Date;
}

export interface ProjectUpdateWithClientRow extends ProjectUpdateRow {
  client_id: number;
}

export interface CreateProjectUpdateInput {
  projectId: number;
  title: string;
  description: string | null;
  progress: number;
}

export const createProjectUpdateTx = async (input: CreateProjectUpdateInput): Promise<number> => {
  return withTransaction(async (conn) => {
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO project_updates (project_id, title, description, progress)
       VALUES (?, ?, ?, ?)`,
      [input.projectId, input.title, input.description, input.progress],
    );
    const updateId = result.insertId;

    await conn.query('UPDATE projects SET overall_progress = ? WHERE project_id = ?', [
      input.progress,
      input.projectId,
    ]);

    return updateId;
  });
};

export const findProjectUpdateById = async (updateId: number): Promise<ProjectUpdateRow | null> => {
  const [rows] = await pool.query<ProjectUpdateRow[]>(
    'SELECT * FROM project_updates WHERE update_id = ? LIMIT 1',
    [updateId],
  );
  return rows[0] ?? null;
};

export const findProjectUpdateByIdWithClient = async (
  updateId: number,
): Promise<ProjectUpdateWithClientRow | null> => {
  const [rows] = await pool.query<ProjectUpdateWithClientRow[]>(
    `SELECT pu.*, q.client_id AS client_id
     FROM project_updates pu
     INNER JOIN projects p ON p.project_id = pu.project_id
     INNER JOIN quotations q ON q.quotation_id = p.quotation_id
     WHERE pu.update_id = ?
     LIMIT 1`,
    [updateId],
  );
  return rows[0] ?? null;
};

export const findProjectUpdatesList = async (
  projectId: number,
  limit: number,
  offset: number,
): Promise<ProjectUpdateRow[]> => {
  const [rows] = await pool.query<ProjectUpdateRow[]>(
    `SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [projectId, limit, offset],
  );
  return rows;
};

export const countProjectUpdates = async (projectId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM project_updates WHERE project_id = ?',
    [projectId],
  );
  return Number(rows[0]?.total ?? 0);
};
