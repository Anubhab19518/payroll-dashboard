import { clientEnv } from '@/lib/env/client';
import { ApiClientError } from '@/lib/client/api-client';
import { verifyPayrollAccess } from '@/lib/client/auth-guard';
import type { AuthUser, LoginResult } from '../types/auth.types';

function buildApiUrl(path: string): string {
  const rawApiBase = clientEnv.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const apiBase = rawApiBase.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (apiBase.endsWith('/api/v1') && cleanPath.startsWith('/api/v1')) {
    return `${apiBase}${cleanPath.slice(7)}`;
  }
  return `${apiBase}${cleanPath}`;
}

export interface LoginCredentials {
  identifier: string; // Email or Employee Code
  password: string;
}

export class AuthService {
  /**
   * Authenticates user either via Email (Admin/Super Admin) or Employee Code (Employee)
   */
  public static async login(credentials: LoginCredentials): Promise<LoginResult> {
    const cleanIdentifier = credentials.identifier.trim();
    const isEmail = cleanIdentifier.includes('@');

    const endpoint = isEmail
      ? buildApiUrl('/api/v1/auth/login')
      : buildApiUrl('/api/v1/auth/employee/login');

    const payload = isEmail
      ? { email: cleanIdentifier.toLowerCase(), password: credentials.password }
      : { employeeCode: cleanIdentifier.toUpperCase(), password: credentials.password };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      throw new ApiClientError(
        `Could not connect to authentication service at ${endpoint}. (${message})`,
        'NETWORK_ERROR',
        err,
        0,
      );
    }

    const data = await response.json().catch(() => null);

    if (
      !response.ok ||
      data?.status === 'error' ||
      data?.status === 'fail' ||
      data?.success === false
    ) {
      const errorMsg =
        data?.message ||
        data?.error?.message ||
        data?.error ||
        `Authentication failed (HTTP ${response.status})`;
      throw new ApiClientError(
        errorMsg,
        data?.code || `HTTP_${response.status}`,
        data,
        response.status,
      );
    }

    // Envelope normalization: data can be in data.data or data
    const resData = data?.data || data;
    const accessToken = resData?.accessToken || resData?.token || resData?.jwt;
    const refreshToken =
      resData?.refreshToken || resData?.refresh_token || data?.refreshToken || data?.refresh_token;
    const userObj = resData?.user || {};
    const user: AuthUser = {
      id: userObj.id || resData?.userId || 'unknown',
      email: userObj.email || (isEmail ? cleanIdentifier : undefined),
      employeeCode: userObj.employeeCode || (!isEmail ? cleanIdentifier : undefined),
      name: userObj.name || resData?.name || cleanIdentifier,
      firstName: userObj.firstName,
      lastName: userObj.lastName,
      isSuperAdmin: userObj.isSuperAdmin ?? resData?.isSuperAdmin ?? false,
      status: userObj.status || resData?.status || 'ACTIVE',
      role: userObj.role,
      roles: userObj.roles,
    };

    if (!accessToken) {
      throw new ApiClientError(
        'No access token received from authentication service',
        'INVALID_RESPONSE',
      );
    }

    return {
      accessToken,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
      user,
      forceChange: resData?.forceChange ?? false,
    };
  }

  /**
   * Verifies if the authenticated user has permissions to access the Payroll module.
   * Super Admins receive full access. Other users MUST have the PAYROLL_ADMIN / SUPER_ADMIN role
   * or active permissions covering Payroll / SalaryStructure.
   */
  public static verifyPayrollAccess = verifyPayrollAccess;
}
