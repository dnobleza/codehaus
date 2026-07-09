import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  role: 'client' | 'admin';
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set');
}

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] }) as unknown as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'] }) as unknown as RefreshTokenPayload;
