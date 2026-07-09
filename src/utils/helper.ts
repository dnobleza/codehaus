import crypto from 'crypto';

export class AppError extends Error {
  statusCode: number;
  tag?: string;

  constructor(message: string, statusCode = 500, tag?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.tag = tag;
  }
}

export const hashToken = (rawToken: string): string =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

export const constantTimeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
};

export const isStrongPassword = (password: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
