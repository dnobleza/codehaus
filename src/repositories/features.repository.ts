import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { buildUpdateSetClause } from '../utils/db';

export interface FeatureRow extends RowDataPacket {
  feature_id: number;
  feature_name: string;
  category: string;
  description: string | null;
  price: string;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFeatureInput {
  featureName: string;
  category: string;
  description?: string | null;
  price: number;
}

export const createFeature = async (input: CreateFeatureInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO features (feature_name, category, description, price)
     VALUES (?, ?, ?, ?)`,
    [input.featureName, input.category, input.description ?? null, input.price],
  );
  return result.insertId;
};

export const findFeatureById = async (featureId: number): Promise<FeatureRow | null> => {
  const [rows] = await pool.query<FeatureRow[]>(
    'SELECT * FROM features WHERE feature_id = ? LIMIT 1',
    [featureId],
  );
  return rows[0] ?? null;
};

export const findFeaturesByIds = async (featureIds: number[]): Promise<FeatureRow[]> => {
  if (featureIds.length === 0) {
    return [];
  }
  const placeholders = featureIds.map(() => '?').join(', ');
  const [rows] = await pool.query<FeatureRow[]>(
    `SELECT * FROM features WHERE feature_id IN (${placeholders})`,
    featureIds,
  );
  return rows;
};

export interface FeatureListFilters {
  category?: string;
  search?: string;
}

const buildFeatureFilterClause = (
  filters: FeatureListFilters,
): { where: string; params: unknown[] } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.search) {
    conditions.push('feature_name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

export const findFeaturesList = async (
  limit: number,
  offset: number,
  filters: FeatureListFilters,
): Promise<FeatureRow[]> => {
  const { where, params } = buildFeatureFilterClause(filters);
  const [rows] = await pool.query<FeatureRow[]>(
    `SELECT * FROM features ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
};

export const countFeatures = async (filters: FeatureListFilters): Promise<number> => {
  const { where, params } = buildFeatureFilterClause(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM features ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
};

export interface UpdateFeatureFields {
  featureName?: string;
  category?: string;
  description?: string | null;
  price?: number;
}

const FEATURE_FIELD_COLUMNS: Record<keyof UpdateFeatureFields, string> = {
  featureName: 'feature_name',
  category: 'category',
  description: 'description',
  price: 'price',
};

export const updateFeature = async (
  featureId: number,
  fields: UpdateFeatureFields,
): Promise<void> => {
  const built = buildUpdateSetClause(fields, FEATURE_FIELD_COLUMNS);
  if (built === null) {
    return;
  }
  const { setClause, values } = built;
  await pool.query(`UPDATE features SET ${setClause}, updated_at = NOW() WHERE feature_id = ?`, [
    ...values,
    featureId,
  ]);
};

export const updateFeatureImageUrl = async (
  featureId: number,
  imageUrl: string | null,
): Promise<void> => {
  await pool.query('UPDATE features SET image_url = ?, updated_at = NOW() WHERE feature_id = ?', [
    imageUrl,
    featureId,
  ]);
};

export const deleteFeature = async (featureId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM features WHERE feature_id = ?', [
    featureId,
  ]);
  return result.affectedRows > 0;
};
