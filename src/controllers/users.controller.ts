import * as usersService from '../services/users.services';
import { AppError } from '../utils/helper';
import { catchAsync, parsePagination } from '../utils/http';

export const register = catchAsync(async (req, res) => {
  const data = await usersService.registerUser(req.body);
  res.status(201).json({ success: true, message: 'Registration successful', data });
});

export const login = catchAsync(async (req, res) => {
  const data = await usersService.loginUser(req.body.email, req.body.password);
  res.status(200).json({ success: true, message: 'Login successful', data });
});

export const refresh = catchAsync(async (req, res) => {
  const data = await usersService.refreshTokens(req.body.refreshToken);
  res.status(200).json({ success: true, message: 'Token refreshed', data });
});

export const logout = catchAsync(async (req, res) => {
  await usersService.logoutUser(req.body.refreshToken);
  res.status(200).json({ success: true, message: 'Logged out' });
});

export const me = catchAsync(async (req, res) => {
  const user = await usersService.getCurrentUser(Number(req.user!.sub));
  res.status(200).json({ success: true, message: 'Current user', data: { user } });
});

export const updateProfile = catchAsync(async (req, res) => {
  const user = await usersService.updateProfile(Number(req.user!.sub), req.body);
  res.status(200).json({ success: true, message: 'Profile updated', data: { user } });
});

export const changePassword = catchAsync(async (req, res) => {
  await usersService.changePassword(
    Number(req.user!.sub),
    req.body.currentPassword,
    req.body.newPassword,
  );
  res.status(200).json({ success: true, message: 'Password changed' });
});

export const deactivateSelf = catchAsync(async (req, res) => {
  await usersService.deactivateSelf(Number(req.user!.sub), req.body.password);
  res.status(200).json({ success: true, message: 'Account deactivated' });
});

export const listClients = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const data = await usersService.listClients(page, limit);
  res.status(200).json({ success: true, message: 'Clients retrieved', data });
});

export const getClientById = catchAsync(async (req, res) => {
  const user = await usersService.getClientById(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Client retrieved', data: { user } });
});

export const activateClient = catchAsync(async (req, res) => {
  const user = await usersService.activateClient(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Client activated', data: { user } });
});

export const deactivateClient = catchAsync(async (req, res) => {
  const user = await usersService.deactivateClient(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Client deactivated', data: { user } });
});

export const deleteClient = catchAsync(async (req, res) => {
  await usersService.deleteClient(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Client deleted' });
});

export const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('An image file is required', 400, 'UPLOAD');
  }
  const user = await usersService.updateAvatar(Number(req.user!.sub), req.file);
  res.status(200).json({ success: true, message: 'Avatar updated', data: { user } });
});

export const deleteAvatar = catchAsync(async (req, res) => {
  const user = await usersService.deleteAvatar(Number(req.user!.sub));
  res.status(200).json({ success: true, message: 'Avatar removed', data: { user } });
});
