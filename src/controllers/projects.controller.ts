import * as projectsService from '../services/projects.services';
import type { ProjectStatus } from '../repositories/projects.repository';
import { catchAsync, getRequester, parsePagination } from '../utils/http';

export const listProjects = catchAsync(async (req, res) => {
  const { page, limit } = parsePagination(req);
  const role = req.user!.role;
  const status =
    role === 'admin' && req.query.status !== undefined
      ? (String(req.query.status) as ProjectStatus)
      : undefined;
  const clientId =
    role === 'client'
      ? Number(req.user!.sub)
      : req.query.clientId !== undefined
        ? Number(req.query.clientId)
        : undefined;

  const data = await projectsService.listProjects(page, limit, { status, clientId });
  res.status(200).json({ success: true, message: 'Projects retrieved', data });
});

export const getProjectById = catchAsync(async (req, res) => {
  const project = await projectsService.getProjectById(Number(req.params.id), getRequester(req));
  res.status(200).json({ success: true, message: 'Project retrieved', data: { project } });
});

export const updateProject = catchAsync(async (req, res) => {
  const project = await projectsService.updateProject(Number(req.params.id), req.body);
  res.status(200).json({ success: true, message: 'Project updated', data: { project } });
});
