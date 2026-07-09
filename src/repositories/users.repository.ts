import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';

export interface RegistrationRow extends RowDataPacket {
  uuid: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  address: string | null;
  contact_no: string;
  email: string;
  password_hash: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface UserWithCredentialsRow extends RowDataPacket {
  user_id: number;
  registration_uuid: string;
  role: 'client' | 'admin';
  email: string;
  password_hash: string;
  status: 'active' | 'inactive' | 'pending';
  first_name: string;
  last_name: string;
}

export const findRegistrationByEmail = async (email: string): Promise<RegistrationRow | null> => {
  const [rows] = await pool.query<RegistrationRow[]>(
    'SELECT * FROM registration WHERE email = ? LIMIT 1',
    [email],
  );
  return rows[0] ?? null;
};

export const findUserWithCredentialsByEmail = async (
  email: string,
): Promise<UserWithCredentialsRow | null> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `SELECT u.user_id, u.registration_uuid, u.role,
            r.email, r.password_hash, r.status, r.first_name, r.last_name
     FROM users u
     INNER JOIN registration r ON r.uuid = u.registration_uuid
     WHERE r.email = ? LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
};

export const findUserById = async (userId: number): Promise<UserWithCredentialsRow | null> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `SELECT u.user_id, u.registration_uuid, u.role,
            r.email, r.password_hash, r.status, r.first_name, r.last_name
     FROM users u
     INNER JOIN registration r ON r.uuid = u.registration_uuid
     WHERE u.user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
};

export const findClientById = async (userId: number): Promise<UserWithCredentialsRow | null> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `SELECT u.user_id, u.registration_uuid, u.role,
            r.email, r.password_hash, r.status, r.first_name, r.last_name
     FROM users u
     INNER JOIN registration r ON r.uuid = u.registration_uuid
     WHERE u.user_id = ? AND u.role = 'client' LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
};

export const findClientsList = async (
  limit: number,
  offset: number,
): Promise<UserWithCredentialsRow[]> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `SELECT u.user_id, u.registration_uuid, u.role,
            r.email, r.password_hash, r.status, r.first_name, r.last_name
     FROM users u
     INNER JOIN registration r ON r.uuid = u.registration_uuid
     WHERE u.role = 'client'
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
};

export const countClients = async (): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'client'",
  );
  return Number(rows[0]?.total ?? 0);
};

export interface CreateRegistrationInput {
  uuid: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  address?: string | null;
  contactNo: string;
  email: string;
  passwordHash: string;
}

export interface UpdateProfileFields {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  address?: string | null;
  contactNo?: string;
}

const PROFILE_FIELD_COLUMNS: Record<keyof UpdateProfileFields, string> = {
  firstName: 'first_name',
  middleName: 'middle_name',
  lastName: 'last_name',
  address: 'address',
  contactNo: 'contact_no',
};

export const updateRegistrationProfile = async (
  uuid: string,
  fields: UpdateProfileFields,
): Promise<void> => {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return;
  }
  const setClause = entries
    .map(([key]) => `${PROFILE_FIELD_COLUMNS[key as keyof UpdateProfileFields]} = ?`)
    .join(', ');
  const values = entries.map(([, value]) => value);
  await pool.query(`UPDATE registration SET ${setClause}, updated_at = NOW() WHERE uuid = ?`, [
    ...values,
    uuid,
  ]);
};

export const updatePasswordHash = async (uuid: string, passwordHash: string): Promise<void> => {
  await pool.query('UPDATE registration SET password_hash = ?, updated_at = NOW() WHERE uuid = ?', [
    passwordHash,
    uuid,
  ]);
};

export const updateRegistrationStatus = async (
  uuid: string,
  status: 'active' | 'inactive' | 'pending',
): Promise<void> => {
  await pool.query('UPDATE registration SET status = ?, updated_at = NOW() WHERE uuid = ?', [
    status,
    uuid,
  ]);
};

export const deleteClientByUserId = async (userId: number): Promise<boolean> => {
  const connection: PoolConnection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT registration_uuid FROM users WHERE user_id = ? AND role = 'client' LIMIT 1",
      [userId],
    );
    const registrationUuid = rows[0]?.registration_uuid as string | undefined;
    if (!registrationUuid) {
      await connection.rollback();
      return false;
    }
    await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM registration WHERE uuid = ?', [registrationUuid]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const createRegistrationAndUser = async (
  input: CreateRegistrationInput,
): Promise<{ userId: number }> => {
  const connection: PoolConnection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO registration
        (uuid, first_name, middle_name, last_name, address, contact_no, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        input.uuid,
        input.firstName,
        input.middleName ?? null,
        input.lastName,
        input.address ?? null,
        input.contactNo,
        input.email,
        input.passwordHash,
      ],
    );
    const [result] = await connection.query<ResultSetHeader>(
      "INSERT INTO users (registration_uuid, role) VALUES (?, 'client')",
      [input.uuid],
    );
    await connection.commit();
    return { userId: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
