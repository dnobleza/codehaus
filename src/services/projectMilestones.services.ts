import * as projectMilestonesRepository from '../repositories/projectMilestones.repository';
import * as projectsRepository from '../repositories/projects.repository';
import { assertProjectOwnership } from './projectAccess';
import type { Pagination, Requester } from '../types/common';
import { AppError, toDateOnlyString } from '../utils/helper';
import { assertHasUpdateFields } from '../utils/serviceHelpers';

export interface MilestoneDTO {
  milestoneId: number;
  projectId: number;
  title: string;
  requiredProgressPercentage: number;
  amount: number;
  status: projectMilestonesRepository.MilestoneStatus;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const computeIsOverdue = (
  dueDate: Date | null,
  status: projectMilestonesRepository.MilestoneStatus,
): boolean => dueDate !== null && dueDate < new Date() && status === 'Pending';

const toMilestoneDTO = (row: projectMilestonesRepository.MilestoneRow): MilestoneDTO => ({
  milestoneId: row.milestone_id,
  projectId: row.project_id,
  title: row.title,
  requiredProgressPercentage: Number(row.required_progress_percentage),
  amount: Number(row.amount),
  status: row.status,
  dueDate: toDateOnlyString(row.due_date),
  isOverdue: computeIsOverdue(row.due_date, row.status),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface CreateMilestoneInput {
  projectId: number;
  title: string;
  requiredProgressPercentage: number;
  amount: number;
  dueDate?: string;
}

export const createMilestone = async (input: CreateMilestoneInput): Promise<MilestoneDTO> => {
  const project = await projectsRepository.findProjectByIdWithClient(input.projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'MILESTONE');
  }

  const milestoneId = await projectMilestonesRepository.createMilestone({
    projectId: input.projectId,
    title: input.title,
    requiredProgressPercentage: input.requiredProgressPercentage,
    amount: input.amount,
    dueDate: input.dueDate ?? null,
  });

  const created = await projectMilestonesRepository.findMilestoneById(milestoneId);
  if (!created) {
    throw new AppError('Milestone not found', 404, 'MILESTONE');
  }
  return toMilestoneDTO(created);
};

export interface PaginatedMilestones {
  milestones: MilestoneDTO[];
  pagination: Pagination;
}

export const listMilestones = async (
  projectId: number,
  page: number,
  limit: number,
  requester: Requester,
): Promise<PaginatedMilestones> => {
  await assertProjectOwnership(projectId, requester, 'MILESTONE');

  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    projectMilestonesRepository.findMilestonesList(projectId, limit, offset),
    projectMilestonesRepository.countMilestones(projectId),
  ]);

  return {
    milestones: rows.map(toMilestoneDTO),
    pagination: { page, limit, total },
  };
};

export const getMilestoneById = async (
  milestoneId: number,
  requester: Requester,
): Promise<MilestoneDTO> => {
  const milestone = await projectMilestonesRepository.findMilestoneByIdWithClient(milestoneId);
  if (!milestone) {
    throw new AppError('Milestone not found', 404, 'MILESTONE');
  }
  if (requester.role === 'client' && milestone.client_id !== requester.userId) {
    throw new AppError('Milestone not found', 404, 'MILESTONE');
  }
  return toMilestoneDTO(milestone);
};

export interface UpdateMilestoneInput {
  title?: string;
  requiredProgressPercentage?: number;
  amount?: number;
  dueDate?: string | null;
}

export const updateMilestone = async (
  milestoneId: number,
  input: UpdateMilestoneInput,
): Promise<MilestoneDTO> => {
  assertHasUpdateFields(input, 'MILESTONE');

  const existing = await projectMilestonesRepository.findMilestoneById(milestoneId);
  if (!existing) {
    throw new AppError('Milestone not found', 404, 'MILESTONE');
  }

  if (
    existing.status === 'Paid' &&
    (input.amount !== undefined || input.requiredProgressPercentage !== undefined)
  ) {
    throw new AppError(
      'Cannot modify amount or required progress of a paid milestone',
      409,
      'MILESTONE',
    );
  }

  await projectMilestonesRepository.updateMilestone(milestoneId, {
    title: input.title,
    requiredProgressPercentage: input.requiredProgressPercentage,
    amount: input.amount,
    dueDate: input.dueDate,
  });

  const updated = await projectMilestonesRepository.findMilestoneById(milestoneId);
  if (!updated) {
    throw new AppError('Milestone not found', 404, 'MILESTONE');
  }
  return toMilestoneDTO(updated);
};

export const deleteMilestone = async (milestoneId: number): Promise<void> => {
  const existing = await projectMilestonesRepository.findMilestoneById(milestoneId);
  if (!existing) {
    throw new AppError('Milestone not found', 404, 'MILESTONE');
  }

  const paymentCount = await projectMilestonesRepository.countPaymentsForMilestone(milestoneId);
  if (paymentCount > 0) {
    throw new AppError('Cannot delete a milestone with payment history', 409, 'MILESTONE');
  }

  await projectMilestonesRepository.deleteMilestone(milestoneId);
};
