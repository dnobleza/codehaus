import type { PoolConnection } from 'mysql2/promise';
import pool from '../config/database';

/**
 * Runs `fn` inside a MySQL transaction: begins the transaction, commits on
 * success, and rolls back + rethrows the ORIGINAL error on failure. Always
 * releases the connection back to the pool. Callers that need to inspect the
 * underlying mysql error (e.g. `ER_DUP_ENTRY`) can safely do so from their
 * own try/catch around the returned promise.
 */
export const withTransaction = async <T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

/**
 * Builds a `col1 = ?, col2 = ?` SET clause and matching params array from a
 * partial fields object, skipping any key whose value is `undefined`.
 * Returns `null` when no fields are set, so callers can no-op.
 *
 * `columnMap` maps each field key to its DB column name. `transform`, when
 * provided, lets a caller convert a field's value (e.g. boolean -> 0/1)
 * before it's added to the params array.
 */
export const buildUpdateSetClause = <T extends object>(
  fields: T,
  columnMap: Record<keyof T, string>,
  transform?: (key: keyof T, value: unknown) => unknown,
): { setClause: string; values: unknown[] } | null => {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return null;
  }
  const setClause = entries.map(([key]) => `${columnMap[key as keyof T]} = ?`).join(', ');
  const values = entries.map(([key, value]) =>
    transform ? transform(key as keyof T, value) : value,
  );
  return { setClause, values };
};
