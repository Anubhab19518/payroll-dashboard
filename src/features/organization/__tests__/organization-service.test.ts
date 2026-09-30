import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from '../services/organization.service';
import * as apiClient from '@/lib/client/api-client';

describe('OrganizationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists companies with optional type filter', async () => {
    const mockCompanies = [{ id: 'comp-1', name: 'Acme Internal', type: 'INTERNAL' as const }];

    vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockCompanies);
    let res = await OrganizationService.listCompanies('INTERNAL');
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe('Acme Internal');

    // Envelope { data: [...] }
    vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({ data: mockCompanies });
    res = await OrganizationService.listCompanies();
    expect(res).toHaveLength(1);

    // Error fallback
    vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce(new Error('Network error'));
    res = await OrganizationService.listCompanies();
    expect(res).toEqual([]);
  });

  it('lists departments with error fallback', async () => {
    const mockDepartments = [{ id: 'dept-1', name: 'Engineering' }];

    vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockDepartments);
    let res = await OrganizationService.listDepartments();
    expect(res).toHaveLength(1);

    vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce(new Error('Error'));
    res = await OrganizationService.listDepartments();
    expect(res).toEqual([]);
  });

  it('lists job roles with error fallback', async () => {
    const mockJobRoles = [{ id: 'role-1', name: 'Engineer' }];

    vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockJobRoles);
    let res = await OrganizationService.listJobRoles();
    expect(res).toHaveLength(1);

    vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce(new Error('Error'));
    res = await OrganizationService.listJobRoles();
    expect(res).toEqual([]);
  });
});
