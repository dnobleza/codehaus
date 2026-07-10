import * as projectUpdatesService from '../services/projectUpdates.services';
import { catchAsync, getRequester, parsePagination } from '../utils/http';

export const createProjectUpdate = catchAsync(async (req, res) => {
  const update = await projectUpdatesService.createProjectUpdate(req.body);
  res.status(201).json({ success: true, message: 'Project update created', data: { update } });
});

export const listProjectUpdates = catchAsync(async (req, res) => {
  const projectId = Number(req.query.projectId);
  const { page, limit } = parsePagination(req);

  const data = await projectUpdatesService.listProjectUpdates(
    projectId,
    page,
    limit,
    getRequester(req),
  );
  res.status(200).json({ success: true, message: 'Project updates retrieved', data });
});

export const getProjectUpdateById = catchAsync(async (req, res) => {
  const update = await projectUpdatesService.getProjectUpdateById(
    Number(req.params.id),
    getRequester(req),
  );
  res.status(200).json({ success: true, message: 'Project update retrieved', data: { update } });
});
