import * as projectsRepository from '../repositories/projects.repository';
import type { Pagination, Requester } from '../types/common';
import { AppError, toDateOnlyString } from '../utils/helper';
import { assertHasUpdateFields } from '../utils/serviceHelpers';

export interface ProjectDTO {
  projectId: number;
  quotationId: number;
  projectName: string;
  overallProgress: number;
  status: projectsRepository.ProjectStatus;
  startDate: string;
  expectedEndDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toProjectDTO = (row: projectsRepository.ProjectRow): ProjectDTO => ({
  projectId: row.project_id,
  quotationId: row.quotation_id,
  projectName: row.project_name,
  overallProgress: Number(row.overall_progress),
  status: row.status,
  startDate: toDateOnlyString(row.start_date) as string,
  expectedEndDate: toDateOnlyString(row.expected_end_date),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getProjectById = async (
  projectId: number,
  requester: Requester,
): Promise<ProjectDTO> => {
  const project = await projectsRepository.findProjectByIdWithClient(projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT');
  }
  if (requester.role === 'client' && project.client_id !== requester.userId) {
    throw new AppError('Project not found', 404, 'PROJECT');
  }
  return toProjectDTO(project);
};

export interface PaginatedProjects {
  projects: ProjectDTO[];
  pagination: Pagination;
}

export interface ListProjectsFilters {
  status?: projectsRepository.ProjectStatus;
  clientId?: number;
}

export const listProjects = async (
  page: number,
  limit: number,
  filters: ListProjectsFilters,
): Promise<PaginatedProjects> => {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    projectsRepository.findProjectsList(limit, offset, filters),
    projectsRepository.countProjects(filters),
  ]);

  return {
    projects: rows.map(toProjectDTO),
    pagination: { page, limit, total },
  };
};

export interface UpdateProjectInput {
  projectName?: string;
  status?: projectsRepository.ProjectStatus;
  startDate?: string;
  expectedEndDate?: string | null;
  overallProgress?: number;
}

export const updateProject = async (
  projectId: number,
  input: UpdateProjectInput,
): Promise<ProjectDTO> => {
  assertHasUpdateFields(input, 'PROJECT');

  const existing = await projectsRepository.findProjectByIdWithClient(projectId);
  if (!existing) {
    throw new AppError('Project not found', 404, 'PROJECT');
  }

  await projectsRepository.updateProject(projectId, {
    projectName: input.projectName,
    status: input.status,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    overallProgress: input.overallProgress,
  });

  const updated = await projectsRepository.findProjectByIdWithClient(projectId);
  if (!updated) {
    throw new AppError('Project not found', 404, 'PROJECT');
  }
  return toProjectDTO(updated);
};
