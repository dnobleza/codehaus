import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as refreshTokensRepository from '../repositories/refreshTokens.repository';
import * as usersRepository from '../repositories/users.repository';
import { AppError, constantTimeEqual, hashToken } from '../utils/helper';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import logger from '../utils/logger';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

export interface RegisterInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  address?: string;
  contactNo: string;
  email: string;
  password: string;
}

export interface PublicUser {
  userId: number;
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'client' | 'admin';
  status: 'active' | 'inactive' | 'pending';
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

interface IssuableUser {
  userId: number;
  uuid: string;
  email: string;
  role: 'client' | 'admin';
  firstName: string;
  lastName: string;
}

const issueTokenPair = async (user: IssuableUser): Promise<AuthResult> => {
  const accessToken = signAccessToken({
    sub: String(user.userId),
    role: user.role,
    email: user.email,
  });

  const jti = uuidv4();
  const refreshToken = signRefreshToken({ sub: String(user.userId), jti });
  const decoded = jwt.decode(refreshToken) as { exp: number };

  await refreshTokensRepository.insertRefreshToken({
    id: jti,
    userId: user.userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  });

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.userId,
      uuid: user.uuid,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: 'active',
    },
  };
};

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const existing = await usersRepository.findRegistrationByEmail(input.email);
  if (existing) {
    throw new AppError('Email is already registered', 409, 'REGISTRATION');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const uuid = uuidv4();

  try {
    const { userId } = await usersRepository.createRegistrationAndUser({
      uuid,
      firstName: input.firstName,
      middleName: input.middleName ?? null,
      lastName: input.lastName,
      address: input.address ?? null,
      contactNo: input.contactNo,
      email: input.email,
      passwordHash,
    });

    return issueTokenPair({
      userId,
      uuid,
      email: input.email,
      role: 'client',
      firstName: input.firstName,
      lastName: input.lastName,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new AppError('Email is already registered', 409, 'REGISTRATION');
    }
    throw error;
  }
};

export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  const user = await usersRepository.findUserWithCredentialsByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'LOGIN');
  }
  if (user.status !== 'active') {
    throw new AppError('Account is not active', 403, 'LOGIN');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'LOGIN');
  }

  return issueTokenPair({
    userId: user.user_id,
    uuid: user.registration_uuid,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
  });
};

export const refreshTokens = async (rawRefreshToken: string): Promise<AuthResult> => {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'REFRESH');
  }

  const existing = await refreshTokensRepository.findRefreshTokenById(payload.jti);
  if (!existing || !constantTimeEqual(existing.token_hash, hashToken(rawRefreshToken))) {
    throw new AppError('Invalid or expired refresh token', 401, 'REFRESH');
  }

  if (existing.revoked_at || existing.expires_at.getTime() < Date.now()) {
    await refreshTokensRepository.revokeAllRefreshTokensForUser(existing.user_id);
    logger.warn(`Refresh token reuse/expiry detected for user_id=${existing.user_id}`, {
      tag: 'REFRESH',
    });
    throw new AppError('Invalid or expired refresh token', 401, 'REFRESH');
  }

  await refreshTokensRepository.revokeRefreshTokenById(existing.id);

  const user = await usersRepository.findUserById(existing.user_id);
  if (!user || user.status !== 'active') {
    throw new AppError('Account is not active', 403, 'REFRESH');
  }

  return issueTokenPair({
    userId: user.user_id,
    uuid: user.registration_uuid,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
  });
};

export const logoutUser = async (rawRefreshToken: string): Promise<void> => {
  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    await refreshTokensRepository.revokeRefreshTokenById(payload.jti);
  } catch {
    return;
  }
};

export const getCurrentUser = async (userId: number): Promise<PublicUser> => {
  const user = await usersRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER');
  }
  return {
    userId: user.user_id,
    uuid: user.registration_uuid,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
};

export interface UpdateProfileInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  address?: string;
  contactNo?: string;
}

export const updateProfile = async (
  userId: number,
  input: UpdateProfileInput,
): Promise<PublicUser> => {
  const hasAnyField = Object.values(input).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new AppError('At least one field must be provided', 400, 'PROFILE');
  }

  const user = await usersRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'PROFILE');
  }

  await usersRepository.updateRegistrationProfile(user.registration_uuid, input);

  const updated = await usersRepository.findUserById(userId);
  return {
    userId: updated!.user_id,
    uuid: updated!.registration_uuid,
    firstName: updated!.first_name,
    lastName: updated!.last_name,
    email: updated!.email,
    role: updated!.role,
    status: updated!.status,
  };
};

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await usersRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'PASSWORD');
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Current password is incorrect', 401, 'PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await usersRepository.updatePasswordHash(user.registration_uuid, passwordHash);
  await refreshTokensRepository.revokeAllRefreshTokensForUser(userId);
};

export const deactivateSelf = async (userId: number, password: string): Promise<void> => {
  const user = await usersRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'DEACTIVATE');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Password is incorrect', 401, 'DEACTIVATE');
  }

  await usersRepository.updateRegistrationStatus(user.registration_uuid, 'inactive');
  await refreshTokensRepository.revokeAllRefreshTokensForUser(userId);
};

export interface PaginatedClients {
  clients: PublicUser[];
  pagination: { page: number; limit: number; total: number };
}

const toPublicUser = (row: usersRepository.UserWithCredentialsRow): PublicUser => ({
  userId: row.user_id,
  uuid: row.registration_uuid,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
  status: row.status,
});

export const listClients = async (page: number, limit: number): Promise<PaginatedClients> => {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    usersRepository.findClientsList(limit, offset),
    usersRepository.countClients(),
  ]);

  return {
    clients: rows.map(toPublicUser),
    pagination: { page, limit, total },
  };
};

export const getClientById = async (userId: number): Promise<PublicUser> => {
  const user = await usersRepository.findClientById(userId);
  if (!user) {
    throw new AppError('Client not found', 404, 'ADMIN');
  }
  return toPublicUser(user);
};

export const activateClient = async (userId: number): Promise<PublicUser> => {
  const user = await usersRepository.findClientById(userId);
  if (!user) {
    throw new AppError('Client not found', 404, 'ADMIN');
  }
  await usersRepository.updateRegistrationStatus(user.registration_uuid, 'active');
  return { ...toPublicUser(user), status: 'active' };
};

export const deactivateClient = async (userId: number): Promise<PublicUser> => {
  const user = await usersRepository.findClientById(userId);
  if (!user) {
    throw new AppError('Client not found', 404, 'ADMIN');
  }
  await usersRepository.updateRegistrationStatus(user.registration_uuid, 'inactive');
  await refreshTokensRepository.revokeAllRefreshTokensForUser(userId);
  return { ...toPublicUser(user), status: 'inactive' };
};

export const deleteClient = async (userId: number): Promise<void> => {
  const deleted = await usersRepository.deleteClientByUserId(userId);
  if (!deleted) {
    throw new AppError('Client not found', 404, 'ADMIN');
  }
};
