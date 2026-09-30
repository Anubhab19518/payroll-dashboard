import { clientEnv } from '@/lib/env/client';

export type AuthUserSummary = {
  id: string;
  email?: string;
  employeeCode?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
  status?: string;
  role?: string;
  roles?: string[];
};

export type PermissionItem = {
  id?: string;
  code?: string;
  name?: string;
  subject?: string;
  action?: string;
};

type AuthPayload = {
  status?: string;
  isSuperAdmin?: boolean;
  roles?: Array<string | { name?: string; code?: string }>;
  permissions?: PermissionItem[];
  permissionModules?: Array<{ code?: string; name?: string }>;
  data?:
    | PermissionItem[]
    | {
        isSuperAdmin?: boolean;
        roles?: Array<string | { name?: string; code?: string }>;
        permissions?: PermissionItem[];
        permissionModules?: Array<{ code?: string; name?: string }>;
        data?: PermissionItem[];
      };
};

function buildApiUrl(path: string): string {
  const rawApiBase = clientEnv.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const apiBase = rawApiBase.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (apiBase.endsWith('/api/v1') && cleanPath.startsWith('/api/v1')) {
    return `${apiBase}${cleanPath.slice(7)}`;
  }
  return `${apiBase}${cleanPath}`;
}

/**
 * Verifies if the authenticated user has permissions to access the Payroll module.
 * Super Admins receive full access. Other users MUST have the PAYROLL_ADMIN / SUPER_ADMIN role
 * or active permissions covering Payroll / SalaryStructure.
 */
export async function verifyPayrollAccess(
  user: AuthUserSummary,
  accessToken: string,
  workspaceId?: string,
): Promise<boolean> {
  // 1. Super Admins always have full, unconditional access
  if (user.isSuperAdmin) {
    return true;
  }

  // 2. Query live workspace permissions from the backend authorization service
  if (workspaceId && user.id) {
    try {
      const permEndpoint = buildApiUrl(
        `/api/v1/authorization/users/${user.id}/permissions?workspaceId=${workspaceId}`,
      );
      const res = await fetch(permEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-workspace-id': workspaceId,
        },
      });

      if (res.ok) {
        const permData = (await res.json().catch(() => null)) as AuthPayload | null;
        if (!permData) return false;

        const rawData = permData.data ?? permData;

        // Check if user is super admin in live DB response
        if (
          (typeof rawData === 'object' &&
            !Array.isArray(rawData) &&
            (rawData as { isSuperAdmin?: boolean }).isSuperAdmin === true) ||
          permData.isSuperAdmin === true
        ) {
          return true;
        }

        // Check live roles from DB (if present in object envelope)
        if (typeof rawData === 'object' && !Array.isArray(rawData)) {
          const envelope = rawData as {
            roles?: Array<string | { name?: string; code?: string }>;
            permissionModules?: Array<{ code?: string; name?: string }>;
          };
          const liveRoles = (envelope.roles || []).map(
            (r: string | { name?: string; code?: string }) =>
              typeof r === 'string' ? r.toUpperCase() : (r.code || r.name || '').toUpperCase(),
          );
          if (
            liveRoles.includes('SUPER_ADMIN') ||
            liveRoles.includes('PAYROLL_ADMIN') ||
            liveRoles.includes('ADMIN')
          ) {
            return true;
          }

          // Check live permission modules
          const modules = envelope.permissionModules || [];
          const hasPayrollModule = modules.some((m: { code?: string; name?: string }) => {
            const code = (m.code || '').toUpperCase();
            const name = (m.name || '').toLowerCase();
            return code === 'PM_PAYROLL' || name.includes('payroll');
          });
          if (hasPayrollModule) return true;
        }

        // Extract permissions list from array or object envelope
        const permissionsList: PermissionItem[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as { permissions?: PermissionItem[] }).permissions)
            ? (rawData as { permissions?: PermissionItem[] }).permissions || []
            : Array.isArray((rawData as { data?: PermissionItem[] }).data)
              ? (rawData as { data?: PermissionItem[] }).data || []
              : [];

        // Map permission codes as string array
        const permissionCodes: string[] = permissionsList.map((p: PermissionItem | string) =>
          typeof p === 'string' ? p.toLowerCase() : (p?.code || '').toLowerCase(),
        );

        // Verify payroll permissions
        const hasPayrollAccess =
          permissionCodes.includes('payroll:read') ||
          permissionCodes.includes('payroll:run:create') ||
          permissionCodes.includes('payroll:run:calculate') ||
          permissionCodes.includes('payroll:run:approve') ||
          permissionCodes.includes('payroll:run:finalize') ||
          permissionCodes.includes('payroll:config:manage') ||
          permissionCodes.includes('app:payroll:access') ||
          permissionCodes.some(
            (code) =>
              code.startsWith('payroll:') ||
              code === 'pm_payroll' ||
              code === 'workspace:manage_all' ||
              code.includes('payroll'),
          ) ||
          permissionsList.some((p: PermissionItem) => {
            if (typeof p !== 'object' || !p) return false;
            const subj = (p.subject || '').toLowerCase();
            const act = (p.action || '').toLowerCase();
            const name = (p.name || '').toLowerCase();
            const code = (p.code || '').toLowerCase();

            return (
              subj.includes('payroll') ||
              subj.includes('salary') ||
              subj.includes('structure') ||
              subj.includes('payslip') ||
              subj === 'all' ||
              subj === '*' ||
              name.includes('payroll') ||
              code.startsWith('payroll:') ||
              (act === 'manage' && (subj === 'all' || subj === '*'))
            );
          });

        if (hasPayrollAccess) return true;

        // No payroll permissions found for this user
        return false;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  // 3. Fallback to roles embedded in the user token/session object
  const userRoles = [
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(user.role ? [user.role] : []),
  ].map((r) => r.toUpperCase());

  return (
    userRoles.includes('SUPER_ADMIN') ||
    userRoles.includes('PAYROLL_ADMIN') ||
    userRoles.includes('ADMIN') ||
    userRoles.includes('PM_PAYROLL')
  );
}
