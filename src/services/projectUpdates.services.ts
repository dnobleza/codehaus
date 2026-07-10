import * as projectUpdatesRepository from '../repositories/projectUpdates.repository';
import * as projectsRepository from '../repositories/projects.repository';
import { assertProjectOwnership } from './projectAccess';
import type { Pagination, Requester } from '../types/common';
import { AppError } from '../utils/helper';

export interface ProjectUpdateDTO {
  updateId: number;
  projectId: number;
  title: string;
  description: string | null;
  progress: number;
  createdAt: Date;
}

const toProjectUpdateDTO = (row: projectUpdatesRepository.ProjectUpdateRow): ProjectUpdateDTO => ({
  updateId: row.update_id,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  progress: Number(row.progress),
  createdAt: row.created_at,
});

export interface CreateProjectUpdateInput {
  projectId: number;
  title: string;
  description?: string;
  progress: number;
}

export const createProjectUpdate = async (
  input: CreateProjectUpdateInput,
): Promise<ProjectUpdateDTO> => {
  const project = await projectsRepository.findProjectByIdWithClient(input.projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_UPDATE');
  }

  const updateId = await projectUpdatesRepository.createProjectUpdateTx({
    projectId: input.projectId,
    title: input.title,
    description: input.description ?? null,
    progress: input.progress,
  });

  const created = await projectUpdatesRepository.findProjectUpdateById(updateId);
  if (!created) {
    throw new AppError('Project update not found', 404, 'PROJECT_UPDATE');
  }
  return toProjectUpdateDTO(created);
};

export interface PaginatedProjectUpdates {
  updates: ProjectUpdateDTO[];
  pagination: Pagination;
}

export const listProjectUpdates = async (
  projectId: number,
  page: number,
  limit: number,
  requester: Requester,
): Promise<PaginatedProjectUpdates> => {
  await assertProjectOwnership(projectId, requester, 'PROJECT_UPDATE');

  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    projectUpdatesRepository.findProjectUpdatesList(projectId, limit, offset),
    projectUpdatesRepository.countProjectUpdates(projectId),
  ]);

  return {
    updates: rows.map(toProjectUpdateDTO),
    pagination: { page, limit, total },
  };
};

export const getProjectUpdateById = async (
  updateId: number,
  requester: Requester,
): Promise<ProjectUpdateDTO> => {
  const update = await projectUpdatesRepository.findProjectUpdateByIdWithClient(updateId);
  if (!update) {
    throw new AppError('Project update not found', 404, 'PROJECT_UPDATE');
  }
  if (requester.role === 'client' && update.client_id !== requester.userId) {
    throw new AppError('Project update not found', 404, 'PROJECT_UPDATE');
  }
  return toProjectUpdateDTO(update);
};
