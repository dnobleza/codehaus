import type { NextFunction, Request, Response } from 'express';
import * as usersService from '../services/users.services';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await usersService.registerUser(req.body);
    res.status(201).json({ success: true, message: 'Registration successful', data });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await usersService.loginUser(req.body.email, req.body.password);
    res.status(200).json({ success: true, message: 'Login successful', data });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await usersService.refreshTokens(req.body.refreshToken);
    res.status(200).json({ success: true, message: 'Token refreshed', data });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await usersService.logoutUser(req.body.refreshToken);
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await usersService.getCurrentUser(Number(req.user!.sub));
    res.status(200).json({ success: true, message: 'Current user', data: { user } });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.updateProfile(Number(req.user!.sub), req.body);
    res.status(200).json({ success: true, message: 'Profile updated', data: { user } });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await usersService.changePassword(
      Number(req.user!.sub),
      req.body.currentPassword,
      req.body.newPassword,
    );
    res.status(200).json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
};

export const deactivateSelf = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await usersService.deactivateSelf(Number(req.user!.sub), req.body.password);
    res.status(200).json({ success: true, message: 'Account deactivated' });
  } catch (err) {
    next(err);
  }
};

export const listClients = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const data = await usersService.listClients(page, limit);
    res.status(200).json({ success: true, message: 'Clients retrieved', data });
  } catch (err) {
    next(err);
  }
};

export const getClientById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.getClientById(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Client retrieved', data: { user } });
  } catch (err) {
    next(err);
  }
};

export const activateClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.activateClient(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Client activated', data: { user } });
  } catch (err) {
    next(err);
  }
};

export const deactivateClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.deactivateClient(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Client deactivated', data: { user } });
  } catch (err) {
    next(err);
  }
};

export const deleteClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await usersService.deleteClient(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
