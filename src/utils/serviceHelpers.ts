import { AppError } from './helper';

/**
 * Throws a 400 'At least one field must be provided' when every property of
 * `input` is `undefined` (i.e. an update request supplied no fields).
 */
export const assertHasUpdateFields = (input: object, tag: string): void => {
  if (!Object.values(input).some((value) => value !== undefined)) {
    throw new AppError('At least one field must be provided', 400, tag);
  }
};

/**
 * Rethrows a MySQL `ER_DUP_ENTRY` error as a 409 AppError with the given
 * message/tag; any other error is rethrown unchanged.
 */
export const rethrowDuplicate = (error: unknown, message: string, tag: string): never => {
  if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
    throw new AppError(message, 409, tag);
  }
  throw error;
};
