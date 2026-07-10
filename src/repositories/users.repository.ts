import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { buildUpdateSetClause, withTransaction } from '../utils/db';

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
  avatar_url: string | null;
}

export const findRegistrationByEmail = async (email: string): Promise<RegistrationRow | null> => {
  const [rows] = await pool.query<RegistrationRow[]>(
    'SELECT * FROM registration WHERE email = ? LIMIT 1',
    [email],
  );
  return rows[0] ?? null;
};

// Shared SELECT + JOIN prefix for the 4 queries below. Kept as a static
// template literal (no user input) so the produced SQL text stays identical
// to the previously copy-pasted version.
const USER_COLUMNS = `SELECT u.user_id, u.registration_uuid, u.role,
            r.email, r.password_hash, r.status, r.first_name, r.last_name, r.avatar_url
     FROM users u
     INNER JOIN registration r ON r.uuid = u.registration_uuid`;

export const findUserWithCredentialsByEmail = async (
  email: string,
): Promise<UserWithCredentialsRow | null> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `${USER_COLUMNS}
     WHERE r.email = ? LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
};

export const findUserById = async (userId: number): Promise<UserWithCredentialsRow | null> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `${USER_COLUMNS}
     WHERE u.user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
};

export const findClientById = async (userId: number): Promise<UserWithCredentialsRow | null> => {
  const [rows] = await pool.query<UserWithCredentialsRow[]>(
    `${USER_COLUMNS}
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
    `${USER_COLUMNS}
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
  const built = buildUpdateSetClause(fields, PROFILE_FIELD_COLUMNS);
  if (built === null) {
    return;
  }
  const { setClause, values } = built;
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

export const updateRegistrationAvatarUrl = async (
  uuid: string,
  avatarUrl: string | null,
): Promise<void> => {
  await pool.query('UPDATE registration SET avatar_url = ?, updated_at = NOW() WHERE uuid = ?', [
    avatarUrl,
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
  return withTransaction(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT registration_uuid FROM users WHERE user_id = ? AND role = 'client' LIMIT 1",
      [userId],
    );
    const registrationUuid = rows[0]?.registration_uuid as string | undefined;
    if (!registrationUuid) {
      return false;
    }
    await conn.query('DELETE FROM users WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM registration WHERE uuid = ?', [registrationUuid]);
    return true;
  });
};

export const createRegistrationAndUser = async (
  input: CreateRegistrationInput,
): Promise<{ userId: number }> => {
  return withTransaction(async (conn) => {
    await conn.query(
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
    const [result] = await conn.query<ResultSetHeader>(
      "INSERT INTO users (registration_uuid, role) VALUES (?, 'client')",
      [input.uuid],
    );
    return { userId: result.insertId };
  });
};
