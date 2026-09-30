import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/auth-service';
import { hasPermission, assertAuthorized } from '@/lib/auth/rbac';

describe('Auth Service & RBAC (AGENTS.md Rule 16)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should authenticate admin via email with POST /api/v1/auth/login', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        accessToken: 'jwt_admin_token',
        user: {
          id: 'admin_1',
          email: 'admin@urgentmanpower.com',
          name: 'Super Admin',
          isSuperAdmin: true,
          status: 'ACTIVE',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await AuthService.login({
      identifier: 'admin@urgentmanpower.com',
      password: 'AdminPassword@123',
    });

    expect(result.accessToken).toBe('jwt_admin_token');
    expect(result.user.email).toBe('admin@urgentmanpower.com');
    expect(result.user.isSuperAdmin).toBe(true);
  });

  it('should authenticate employee via employeeCode with POST /api/v1/auth/employee/login', async () => {
    const mockResponse = {
      status: 'success',
      data: {
        accessToken: 'jwt_emp_token',
        user: {
          id: 'emp_1',
          name: 'Shakti Mohan',
          isSuperAdmin: false,
          status: 'ACTIVE',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await AuthService.login({
      identifier: 'EMP001',
      password: 'Password@123',
    });

    expect(result.accessToken).toBe('jwt_emp_token');
    expect(result.user.employeeCode).toBe('EMP001');
    expect(result.user.isSuperAdmin).toBe(false);
  });

  it('should allow Super Admins full access', async () => {
    const isAllowed = await AuthService.verifyPayrollAccess(
      {
        id: '1',
        email: 'admin@urgentmanpower.com',
        isSuperAdmin: true,
      },
      'test-token',
      'workspace-1',
    );

    expect(isAllowed).toBe(true);
  });

  it('should allow employees with active PAYROLL_ADMIN role from live permissions', async () => {
    const mockPermResponse = {
      status: 'success',
      data: {
        isSuperAdmin: false,
        roles: ['PAYROLL_ADMIN'],
        permissions: [{ subject: 'Payroll', action: 'manage' }],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPermResponse,
    });

    const isAllowed = await AuthService.verifyPayrollAccess(
      {
        id: 'emp_1',
        employeeCode: 'EMP001',
        isSuperAdmin: false,
      },
      'test-token',
      'workspace-1',
    );

    expect(isAllowed).toBe(true);
  });

  it('should reject employees whose PAYROLL_ADMIN role was removed', async () => {
    const mockPermResponse = {
      status: 'success',
      data: {
        isSuperAdmin: false,
        roles: ['STAFF'],
        permissions: [{ subject: 'LeaveApplication', action: 'create' }],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPermResponse,
    });

    const isAllowed = await AuthService.verifyPayrollAccess(
      {
        id: 'emp_1',
        employeeCode: 'EMP001',
        isSuperAdmin: false,
      },
      'test-token',
      'workspace-1',
    );

    expect(isAllowed).toBe(false);
  });

  it('should allow employees when backend returns array of permission objects with payroll codes', async () => {
    const mockArrayPermResponse = {
      status: 'ok',
      data: [
        {
          id: 'perm_1',
          code: 'payroll:read',
          name: 'Read Payroll',
          action: 'read',
          subject: 'Payroll',
        },
        {
          id: 'perm_2',
          code: 'payroll:run:create',
          name: 'Create Payroll Run',
          action: 'create',
          subject: 'Payroll',
        },
        {
          id: 'perm_3',
          code: 'app:payroll:access',
          name: 'Payroll Access',
          action: 'access',
          subject: 'App',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockArrayPermResponse,
    });

    const isAllowed = await AuthService.verifyPayrollAccess(
      {
        id: 'emp_shakti',
        employeeCode: 'EMP_SHAKTI',
        name: 'Shakti Mohan',
        isSuperAdmin: false,
      },
      'test-token',
      'workspace-1',
    );

    expect(isAllowed).toBe(true);
  });

  it('should reject employees when backend returns array of permission objects without payroll permissions', async () => {
    const mockArrayPermResponse = {
      status: 'ok',
      data: [
        {
          id: 'perm_1',
          code: 'attendance:read',
          name: 'Read Attendance',
          action: 'read',
          subject: 'Attendance',
        },
        {
          id: 'perm_2',
          code: 'leave:apply',
          name: 'Apply Leave',
          action: 'create',
          subject: 'Leave',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockArrayPermResponse,
    });

    const isAllowed = await AuthService.verifyPayrollAccess(
      {
        id: 'emp_other',
        employeeCode: 'EMP002',
        isSuperAdmin: false,
      },
      'test-token',
      'workspace-1',
    );

    expect(isAllowed).toBe(false);
  });

  it('should enforce role-based permissions correctly', () => {
    const adminUser = {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin',
      role: 'admin' as const,
    };
    const viewerUser = {
      id: '2',
      email: 'viewer@test.com',
      name: 'Viewer',
      role: 'viewer' as const,
    };

    expect(hasPermission(adminUser, 'orders:approve_high_value')).toBe(true);
    expect(hasPermission(viewerUser, 'orders:approve_high_value')).toBe(false);
    expect(hasPermission(viewerUser, 'orders:read')).toBe(true);

    expect(() => assertAuthorized(viewerUser, 'orders:delete')).toThrow(/Unauthorized/);
    expect(() => assertAuthorized(adminUser, 'orders:delete')).not.toThrow();
  });
});
