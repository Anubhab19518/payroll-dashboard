import { fetchApi } from '@/lib/client/api-client';
import type {
  EmployeeRecord,
  EmployeeAssignmentRecord,
  EnrichedEmployee,
} from '../types/employee.types';

interface OrgItem {
  id: string;
  name: string;
  type?: 'INTERNAL' | 'CLIENT';
}

export class EmployeeService {
  /**
   * List all employees in the active workspace
   */
  public static async listEmployees(params?: {
    search?: string;
    status?: string;
    limit?: number;
  }): Promise<EmployeeRecord[]> {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.status) qs.append('status', params.status);
    if (params?.limit) qs.append('limit', params.limit.toString());
    const query = qs.toString() ? `?${qs.toString()}` : '';

    try {
      const res = await fetchApi<
        EmployeeRecord[] | { data?: EmployeeRecord[]; records?: EmployeeRecord[] }
      >(`/api/v1/hr/employees${query}`);

      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data?: EmployeeRecord[] }).data)) {
        return (res as { data: EmployeeRecord[] }).data;
      }
      if (res && Array.isArray((res as { records?: EmployeeRecord[] }).records)) {
        return (res as { records: EmployeeRecord[] }).records;
      }
      return [];
    } catch (err) {
      console.warn('Failed to list employees:', err);
      return [];
    }
  }

  /**
   * Fetch assignments for a specific employee
   */
  public static async getEmployeeAssignments(
    employeeId: string,
  ): Promise<EmployeeAssignmentRecord[]> {
    try {
      const res = await fetchApi<
        | EmployeeAssignmentRecord[]
        | { data?: EmployeeAssignmentRecord[]; assignments?: EmployeeAssignmentRecord[] }
      >(`/api/v1/hr/employees/${employeeId}/assignments`);

      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data?: EmployeeAssignmentRecord[] }).data)) {
        return (res as { data: EmployeeAssignmentRecord[] }).data;
      }
      if (res && Array.isArray((res as { assignments?: EmployeeAssignmentRecord[] }).assignments)) {
        return (res as { assignments: EmployeeAssignmentRecord[] }).assignments;
      }
      return [];
    } catch (err) {
      console.warn(`Failed to fetch assignments for employee ${employeeId}:`, err);
      return [];
    }
  }

  /**
   * List all employees with their current active job assignment / posting details resolved
   */
  public static async listEnrichedEmployees(): Promise<EnrichedEmployee[]> {
    const [employees, companiesRes, departmentsRes, jobRolesRes] = await Promise.all([
      this.listEmployees({ limit: 100 }),
      fetchApi<OrgItem[] | { data?: OrgItem[] }>('/api/v1/hr/companies').catch(() => []),
      fetchApi<OrgItem[] | { data?: OrgItem[] }>('/api/v1/hr/departments').catch(() => []),
      fetchApi<OrgItem[] | { data?: OrgItem[] }>('/api/v1/hr/job-roles').catch(() => []),
    ]);

    const companies: OrgItem[] = Array.isArray(companiesRes)
      ? companiesRes
      : Array.isArray((companiesRes as { data?: OrgItem[] })?.data)
        ? (companiesRes as { data: OrgItem[] }).data
        : [];
    const departments: OrgItem[] = Array.isArray(departmentsRes)
      ? departmentsRes
      : Array.isArray((departmentsRes as { data?: OrgItem[] })?.data)
        ? (departmentsRes as { data: OrgItem[] }).data
        : [];
    const jobRoles: OrgItem[] = Array.isArray(jobRolesRes)
      ? jobRolesRes
      : Array.isArray((jobRolesRes as { data?: OrgItem[] })?.data)
        ? (jobRolesRes as { data: OrgItem[] }).data
        : [];

    const companyMap = new Map(companies.map((c) => [c.id, c]));
    const deptMap = new Map(departments.map((d) => [d.id, d]));
    const roleMap = new Map(jobRoles.map((r) => [r.id, r]));

    // For each employee, fetch assignments concurrently
    const enrichedList = await Promise.all(
      employees.map(async (emp) => {
        let activeAssignment: EmployeeAssignmentRecord | null = null;
        try {
          const assignments = await this.getEmployeeAssignments(emp.id);
          activeAssignment =
            assignments.find((a) => a.status === 'ACTIVE') || assignments[0] || null;
        } catch {
          // Continue without assignment
        }

        const company = activeAssignment?.companyId
          ? companyMap.get(activeAssignment.companyId)
          : null;
        const dept = activeAssignment?.departmentId
          ? deptMap.get(activeAssignment.departmentId)
          : null;
        const role = activeAssignment?.jobRoleId ? roleMap.get(activeAssignment.jobRoleId) : null;

        const enriched: EnrichedEmployee = {
          ...emp,
          activeAssignment,
          companyName: company?.name,
          companyType: company?.type,
          departmentName: dept?.name,
          jobRoleName: role?.name,
        };

        return enriched;
      }),
    );

    return enrichedList;
  }
}
