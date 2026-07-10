import * as projectsRepository from '../repositories/projects.repository';
import type { Requester } from '../types/common';
import { AppError } from '../utils/helper';

/**
 * Throws a 404 'Project not found' when the project doesn't exist, or when a
 * client requester doesn't own it (i.e. isn't the project's client). Shared
 * by the projectUpdates and projectMilestones services, which previously
 * each kept a verbatim-duplicated copy of this check differing only in the
 * log tag passed to AppError.
 */
export const assertProjectOwnership = async (
  projectId: number,
  requester: Requester,
  tag: string,
): Promise<void> => {
  const project = await projectsRepository.findProjectByIdWithClient(projectId);
  if (!project) {
    throw new AppError('Project not found', 404, tag);
  }
  if (requester.role === 'client' && project.client_id !== requester.userId) {
    throw new AppError('Project not found', 404, tag);
  }
};
