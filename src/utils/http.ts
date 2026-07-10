import type { Request, RequestHandler } from 'express';
import type { Requester, Role } from '../types/common';

/**
 * Wraps an async Express handler so rejected promises (including thrown
 * AppErrors) are forwarded to `next` instead of crashing the process.
 * Kept explicit rather than relying on Express 5's implicit async-error
 * forwarding.
 */
export const catchAsync =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Parses `page`/`limit` query params with the project-wide defaults of 1/20.
 */
export const parsePagination = (req: Request): { page: number; limit: number } => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  return { page, limit };
};

/**
 * Builds the `{ userId, role }` requester object from the authenticated
 * request. Routes must run `authenticate` before any handler using this.
 */
export const getRequester = (req: Request): Requester => ({
  userId: Number(req.user!.sub),
  role: req.user!.role,
});

/**
 * Parses the admin-only `?isActive=` filter used by bundles and payment
 * methods listings. Non-admins always get `undefined` (no override).
 */
export const parseAdminIsActiveFilter = (req: Request, role: Role): boolean | undefined =>
  role === 'admin' && req.query.isActive !== undefined
    ? String(req.query.isActive) === 'true'
    : undefined;
