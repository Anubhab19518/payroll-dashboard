import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../services/employee.service';
import { EmployeeLookupService } from '../services/employee-lookup.service';
import type { EmployeeRecord } from '../types/employee.types';
import * as apiClient from '@/lib/client/api-client';

describe('Employee Domain Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('EmployeeService', () => {
    it('lists employees with query filters and handles various API envelopes', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          employeeCode: 'EMP001',
          firstName: 'Tamagno',
          lastName: 'Roy',
          status: 'ACTIVE',
        },
      ];

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockEmployees);
      let res = await EmployeeService.listEmployees({ search: 'Tamagno', status: 'ACTIVE' });
      expect(res).toHaveLength(1);
      expect(res[0]?.employeeCode).toBe('EMP001');

      // Envelope { data: [...] }
      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({ data: mockEmployees });
      res = await EmployeeService.listEmployees();
      expect(res).toHaveLength(1);

      // Envelope { records: [...] }
      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({ records: mockEmployees });
      res = await EmployeeService.listEmployees();
      expect(res).toHaveLength(1);

      // Error handling fallback
      vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce(new Error('Network failure'));
      res = await EmployeeService.listEmployees();
      expect(res).toEqual([]);
    });

    it('fetches employee assignments', async () => {
      const mockAssignments = [
        {
          id: 'asg-1',
          employeeId: 'emp-1',
          companyId: 'comp-1',
          departmentId: 'dept-1',
          jobRoleId: 'role-1',
          isPrimary: true,
          status: 'ACTIVE',
        },
      ];

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockAssignments);
      const res = await EmployeeService.getEmployeeAssignments('emp-1');
      expect(res).toHaveLength(1);
      expect(res[0]?.companyId).toBe('comp-1');

      // Error handling fallback
      vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce(new Error('Failed'));
      const errorRes = await EmployeeService.getEmployeeAssignments('emp-1');
      expect(errorRes).toEqual([]);
    });

    it('lists enriched employees with resolved company, department, and role metadata', async () => {
      const mockEmployees: EmployeeRecord[] = [
        {
          id: 'emp-1',
          workspaceId: 'ws-1',
          employeeCode: 'EMP001',
          firstName: 'Tamagno',
          lastName: 'Roy',
          employmentStatus: 'ACTIVE',
          employmentType: 'FULL_TIME',
          isActive: true,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      const mockCompanies = [{ id: 'comp-1', name: 'Acme Corp', type: 'INTERNAL' as const }];
      const mockDepartments = [{ id: 'dept-1', name: 'Engineering' }];
      const mockJobRoles = [{ id: 'role-1', name: 'Senior Architect' }];

      vi.spyOn(EmployeeService, 'listEmployees').mockResolvedValueOnce(mockEmployees);
      vi.spyOn(EmployeeService, 'getEmployeeAssignments').mockResolvedValueOnce([
        {
          id: 'asg-1',
          workspaceId: 'ws-1',
          employeeId: 'emp-1',
          companyId: 'comp-1',
          departmentId: 'dept-1',
          jobRoleId: 'role-1',
          effectiveFrom: '2026-01-01',
          status: 'ACTIVE',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]);
      vi.spyOn(apiClient, 'fetchApi')
        .mockResolvedValueOnce(mockCompanies)
        .mockResolvedValueOnce(mockDepartments)
        .mockResolvedValueOnce(mockJobRoles);

      const enriched = await EmployeeService.listEnrichedEmployees();
      expect(enriched).toHaveLength(1);
      expect(enriched[0]?.companyName).toBe('Acme Corp');
      expect(enriched[0]?.departmentName).toBe('Engineering');
      expect(enriched[0]?.jobRoleName).toBe('Senior Architect');
    });
  });

  describe('EmployeeLookupService', () => {
    it('searches employees with parameters and retrieves employee details by id', async () => {
      const mockSummary = {
        id: 'emp-1',
        employeeCode: 'EMP001',
        firstName: 'Tamagno',
        lastName: 'Roy',
      };

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({ data: [mockSummary] });
      const searchRes = await EmployeeLookupService.searchEmployees('Tamagno', 10);
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0]?.employeeCode).toBe('EMP001');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockSummary);
      const detailRes = await EmployeeLookupService.getEmployeeById('emp-1');
      expect(detailRes.id).toBe('emp-1');
      expect(detailRes.firstName).toBe('Tamagno');
    });

    it('throws error when searchEmployees fails', async () => {
      vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce(new Error('Search failed'));
      await expect(EmployeeLookupService.searchEmployees('error')).rejects.toThrow('Search failed');
    });
  });
});
