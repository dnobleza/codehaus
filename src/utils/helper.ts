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

/**
 * Converts a decimal money amount (e.g. 19.99) into integer cents (1999) to
 * avoid floating point drift when summing multiple amounts.
 */
export const toCents = (amount: number): number => Math.round(amount * 100);

/**
 * Rounds a decimal money amount to 2 decimal places, avoiding floating point
 * drift artifacts (e.g. 19.999999999998).
 */
export const roundMoney = (amount: number): number => Math.round(amount * 100) / 100;

/**
 * Formats a SQL DATE column value (returned by mysql2 as a JS Date) into a
 * plain 'YYYY-MM-DD' string for API responses. Returns null when given null.
 */
export const toDateOnlyString = (date: Date | string | null): string | null => {
  if (date === null) {
    return null;
  }
  const value = typeof date === 'string' ? new Date(date) : date;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
