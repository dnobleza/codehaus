import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { buildUpdateSetClause, withTransaction } from '../utils/db';

export interface BundleRow extends RowDataPacket {
  bundle_id: number;
  bundle_name: string;
  description: string | null;
  price: string | null;
  pricing_type: 'Fixed' | 'Manual';
  is_active: number;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BundleFeatureRow extends RowDataPacket {
  feature_id: number;
  feature_name: string;
  category: string;
  price: string;
}

export interface CreateBundleInput {
  bundleName: string;
  description?: string | null;
  price?: number | null;
  pricingType: 'Fixed' | 'Manual';
  isActive?: boolean;
}

export const createBundleTx = async (
  input: CreateBundleInput,
  featureIds: number[] = [],
): Promise<number> => {
  return withTransaction(async (conn) => {
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO bundles (bundle_name, description, price, pricing_type, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.bundleName,
        input.description ?? null,
        input.price ?? null,
        input.pricingType,
        input.isActive === false ? 0 : 1,
      ],
    );
    const bundleId = result.insertId;

    if (featureIds.length > 0) {
      const placeholders = featureIds.map(() => '(?, ?)').join(', ');
      const values = featureIds.flatMap((featureId) => [bundleId, featureId]);
      await conn.query(
        `INSERT IGNORE INTO bundle_features (bundle_id, feature_id) VALUES ${placeholders}`,
        values,
      );
    }

    return bundleId;
  });
};

export const findBundleById = async (bundleId: number): Promise<BundleRow | null> => {
  const [rows] = await pool.query<BundleRow[]>(
    'SELECT * FROM bundles WHERE bundle_id = ? LIMIT 1',
    [bundleId],
  );
  return rows[0] ?? null;
};

export const findBundleFeatures = async (bundleId: number): Promise<BundleFeatureRow[]> => {
  const [rows] = await pool.query<BundleFeatureRow[]>(
    `SELECT f.feature_id, f.feature_name, f.category, f.price
     FROM bundle_features bf
     INNER JOIN features f ON f.feature_id = bf.feature_id
     WHERE bf.bundle_id = ?
     ORDER BY f.feature_name ASC`,
    [bundleId],
  );
  return rows;
};

export interface BundleListFilters {
  search?: string;
  isActive?: boolean;
}

const buildBundleFilterClause = (
  filters: BundleListFilters,
): { where: string; params: unknown[] } => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    conditions.push('bundle_name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  if (filters.isActive !== undefined) {
    conditions.push('is_active = ?');
    params.push(filters.isActive ? 1 : 0);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
};

export const findBundlesList = async (
  limit: number,
  offset: number,
  filters: BundleListFilters,
): Promise<BundleRow[]> => {
  const { where, params } = buildBundleFilterClause(filters);
  const [rows] = await pool.query<BundleRow[]>(
    `SELECT * FROM bundles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
};

export const countBundles = async (filters: BundleListFilters): Promise<number> => {
  const { where, params } = buildBundleFilterClause(filters);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM bundles ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
};

export interface UpdateBundleFields {
  bundleName?: string;
  description?: string | null;
  price?: number | null;
  pricingType?: 'Fixed' | 'Manual';
  isActive?: boolean;
}

const BUNDLE_FIELD_COLUMNS: Record<keyof UpdateBundleFields, string> = {
  bundleName: 'bundle_name',
  description: 'description',
  price: 'price',
  pricingType: 'pricing_type',
  isActive: 'is_active',
};

export const updateBundle = async (bundleId: number, fields: UpdateBundleFields): Promise<void> => {
  const built = buildUpdateSetClause(fields, BUNDLE_FIELD_COLUMNS, (key, value) =>
    key === 'isActive' ? (value ? 1 : 0) : value,
  );
  if (built === null) {
    return;
  }
  const { setClause, values } = built;
  await pool.query(`UPDATE bundles SET ${setClause}, updated_at = NOW() WHERE bundle_id = ?`, [
    ...values,
    bundleId,
  ]);
};

export const updateBundleImageUrl = async (
  bundleId: number,
  imageUrl: string | null,
): Promise<void> => {
  await pool.query('UPDATE bundles SET image_url = ?, updated_at = NOW() WHERE bundle_id = ?', [
    imageUrl,
    bundleId,
  ]);
};

export const deleteBundle = async (bundleId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM bundles WHERE bundle_id = ?', [
    bundleId,
  ]);
  return result.affectedRows > 0;
};

export const attachFeatures = async (bundleId: number, featureIds: number[]): Promise<void> => {
  if (featureIds.length === 0) {
    return;
  }
  const placeholders = featureIds.map(() => '(?, ?)').join(', ');
  const values = featureIds.flatMap((featureId) => [bundleId, featureId]);
  await pool.query(
    `INSERT IGNORE INTO bundle_features (bundle_id, feature_id) VALUES ${placeholders}`,
    values,
  );
};

export const detachFeature = async (bundleId: number, featureId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM bundle_features WHERE bundle_id = ? AND feature_id = ?',
    [bundleId, featureId],
  );
  return result.affectedRows > 0;
};
