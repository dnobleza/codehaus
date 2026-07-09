import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';

export interface RefreshTokenRow extends RowDataPacket {
  id: string;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export const insertRefreshToken = async (params: {
  id: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> => {
  await pool.query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [params.id, params.userId, params.tokenHash, params.expiresAt],
  );
};

export const findRefreshTokenById = async (id: string): Promise<RefreshTokenRow | null> => {
  const [rows] = await pool.query<RefreshTokenRow[]>(
    'SELECT * FROM refresh_tokens WHERE id = ? LIMIT 1',
    [id],
  );
  return rows[0] ?? null;
};

export const revokeRefreshTokenById = async (id: string): Promise<void> => {
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [id]);
};

export const revokeAllRefreshTokensForUser = async (userId: number): Promise<void> => {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
    [userId],
  );
};
