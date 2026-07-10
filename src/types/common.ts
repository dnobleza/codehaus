export type Role = 'client' | 'admin';

export interface Requester {
  userId: number;
  role: Role;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface WhereClause {
  where: string;
  params: unknown[];
}
