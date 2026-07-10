import * as projectMilestonesService from '../services/projectMilestones.services';
import { catchAsync, getRequester, parsePagination } from '../utils/http';

export const createMilestone = catchAsync(async (req, res) => {
  const milestone = await projectMilestonesService.createMilestone(req.body);
  res.status(201).json({ success: true, message: 'Milestone created', data: { milestone } });
});

export const listMilestones = catchAsync(async (req, res) => {
  const projectId = Number(req.query.projectId);
  const { page, limit } = parsePagination(req);

  const data = await projectMilestonesService.listMilestones(
    projectId,
    page,
    limit,
    getRequester(req),
  );
  res.status(200).json({ success: true, message: 'Milestones retrieved', data });
});

export const getMilestoneById = catchAsync(async (req, res) => {
  const milestone = await projectMilestonesService.getMilestoneById(
    Number(req.params.id),
    getRequester(req),
  );
  res.status(200).json({ success: true, message: 'Milestone retrieved', data: { milestone } });
});

export const updateMilestone = catchAsync(async (req, res) => {
  const milestone = await projectMilestonesService.updateMilestone(Number(req.params.id), req.body);
  res.status(200).json({ success: true, message: 'Milestone updated', data: { milestone } });
});

export const deleteMilestone = catchAsync(async (req, res) => {
  await projectMilestonesService.deleteMilestone(Number(req.params.id));
  res.status(200).json({ success: true, message: 'Milestone deleted' });
});
