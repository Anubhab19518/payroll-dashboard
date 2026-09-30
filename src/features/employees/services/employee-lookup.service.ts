import { fetchApi } from '@/lib/client/api-client';
import type { EmployeeSummary } from '@/types/payroll';

export interface EmployeeListResponse {
  data: EmployeeSummary[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export class EmployeeLookupService {
  /**
   * Search active employees in the HR system for salary structure assignment & payslips
   */
  public static async searchEmployees(
    query: string = '',
    limit: number = 20,
  ): Promise<EmployeeSummary[]> {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    params.append('limit', limit.toString());
    params.append('status', 'ACTIVE');

    try {
      const result = await fetchApi<
        EmployeeSummary[] | { data?: EmployeeSummary[]; employees?: EmployeeSummary[] }
      >(`/api/v1/hr/employees?${params.toString()}`);

      if (Array.isArray(result)) {
        return result;
      }
      if (result && Array.isArray((result as { data?: EmployeeSummary[] }).data)) {
        return (result as { data: EmployeeSummary[] }).data;
      }
      if (result && Array.isArray((result as { employees?: EmployeeSummary[] }).employees)) {
        return (result as { employees: EmployeeSummary[] }).employees;
      }
      return [];
    } catch (error) {
      console.warn('Failed to search HR employees via /api/v1/hr/employees:', error);
      throw error;
    }
  }

  /**
   * Get employee details by ID from HR
   */
  public static async getEmployeeById(employeeId: string): Promise<EmployeeSummary> {
    return fetchApi<EmployeeSummary>(`/api/v1/hr/employees/${employeeId}`);
  }
}
