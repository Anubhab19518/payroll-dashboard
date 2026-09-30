import { fetchApi } from '@/lib/client/api-client';
import type { CompanyRecord, DepartmentRecord, JobRoleRecord } from '../types/organization.types';

export class OrganizationService {
  /**
   * Fetch all companies in the active workspace
   */
  public static async listCompanies(type?: 'INTERNAL' | 'CLIENT'): Promise<CompanyRecord[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await fetchApi<CompanyRecord[] | { data?: CompanyRecord[] }>(
        `/api/v1/hr/companies${query}`,
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data?: CompanyRecord[] }).data)) {
        return (res as { data: CompanyRecord[] }).data;
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch companies:', err);
      return [];
    }
  }

  /**
   * Fetch all departments in the active workspace
   */
  public static async listDepartments(): Promise<DepartmentRecord[]> {
    try {
      const res = await fetchApi<DepartmentRecord[] | { data?: DepartmentRecord[] }>(
        '/api/v1/hr/departments',
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data?: DepartmentRecord[] }).data)) {
        return (res as { data: DepartmentRecord[] }).data;
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch departments:', err);
      return [];
    }
  }

  /**
   * Fetch all job roles in the active workspace
   */
  public static async listJobRoles(): Promise<JobRoleRecord[]> {
    try {
      const res = await fetchApi<JobRoleRecord[] | { data?: JobRoleRecord[] }>(
        '/api/v1/hr/job-roles',
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data?: JobRoleRecord[] }).data)) {
        return (res as { data: JobRoleRecord[] }).data;
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch job roles:', err);
      return [];
    }
  }
}
