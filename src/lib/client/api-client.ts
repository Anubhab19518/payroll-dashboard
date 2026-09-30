import { clientEnv } from '@/lib/env/client';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'CLIENT_ERROR', details?: unknown, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Token & Workspace Context Management
let currentAuthToken: string | null = null;
let currentRefreshToken: string | null = null;
let currentWorkspaceId: string = clientEnv.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;
let refreshPromise: Promise<string | null> | null = null;

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('payroll_jwt_token', token);
      localStorage.setItem('hr-dashboard-token', token);
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('payroll_jwt_token');
      localStorage.removeItem('hr-dashboard-token');
      localStorage.removeItem('user');
      localStorage.removeItem('payroll_user');
    }
  }
}

export function getAuthToken(): string | null {
  if (currentAuthToken) return currentAuthToken;
  if (typeof window !== 'undefined') {
    const stored =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('payroll_jwt_token') ||
      localStorage.getItem('hr-dashboard-token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('hrms_jwt_token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('access_token') ||
      sessionStorage.getItem('auth_token');
    if (stored) return stored;
  }
  return clientEnv.NEXT_PUBLIC_DEV_AUTH_TOKEN || null;
}

export function setRefreshToken(token: string | null): void {
  currentRefreshToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('refreshToken', token);
      localStorage.setItem('refresh_token', token);
      localStorage.setItem('user_refresh_token', token);
      localStorage.setItem('payroll_refresh_token', token);
    } else {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_refresh_token');
      localStorage.removeItem('payroll_refresh_token');
    }
  }
}

export function getRefreshToken(): string | null {
  if (currentRefreshToken) return currentRefreshToken;
  if (typeof window !== 'undefined') {
    const stored =
      localStorage.getItem('refreshToken') ||
      localStorage.getItem('refresh_token') ||
      localStorage.getItem('user_refresh_token') ||
      localStorage.getItem('payroll_refresh_token') ||
      sessionStorage.getItem('refreshToken') ||
      sessionStorage.getItem('refresh_token');
    if (stored) return stored;
  }
  return null;
}

export function clearAuthTokens(): void {
  setAuthToken(null);
  setRefreshToken(null);
}

export function setWorkspaceId(workspaceId: string): void {
  currentWorkspaceId = workspaceId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('active_workspace_id', workspaceId);
    localStorage.setItem('payroll_workspace_id', workspaceId);
    localStorage.setItem('hr-dashboard-workspace-id', workspaceId);
  }
}

export function getWorkspaceId(): string {
  if (typeof window !== 'undefined') {
    const saved =
      localStorage.getItem('active_workspace_id') ||
      localStorage.getItem('payroll_workspace_id') ||
      localStorage.getItem('hr-dashboard-workspace-id');
    if (saved) return saved;
  }
  return currentWorkspaceId || clientEnv.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;
}

/**
 * Safely parse JWT expiration timestamp (in seconds)
 */
function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr =
      typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr) as { exp?: number };
    return typeof parsed?.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * Checks if token is expired or within the threshold buffer (default: 30 seconds)
 */
function isTokenExpiring(token: string, bufferSeconds = 30): boolean {
  const exp = parseJwtExp(token);
  if (!exp) return false;
  const nowInSec = Math.floor(Date.now() / 1000);
  return exp - bufferSeconds <= nowInSec;
}

/**
 * Concurrency-safe automatic token refresh.
 * Sends a refresh request using either the stored refresh token or the HTTP-only cookie.
 */
export async function refreshAuthToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async (): Promise<string | null> => {
    try {
      const refreshToken = getRefreshToken();
      const rawApiBase = clientEnv.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const apiBase = rawApiBase.replace(/\/+$/, '');
      const refreshUrl = apiBase.endsWith('/api/v1')
        ? `${apiBase}/auth/refresh`
        : `${apiBase}/api/v1/auth/refresh`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const workspaceId = getWorkspaceId();
      if (workspaceId) {
        headers['x-workspace-id'] = workspaceId;
      }

      const body = refreshToken
        ? JSON.stringify({ refreshToken, refresh_token: refreshToken })
        : JSON.stringify({});

      const response = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`Token refresh rejected (HTTP ${response.status})`);
      }

      const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const resData =
        json && typeof json === 'object' && 'data' in json && json.data
          ? (json.data as Record<string, unknown>)
          : json;

      const newAccessToken =
        typeof resData?.accessToken === 'string'
          ? resData.accessToken
          : typeof resData?.token === 'string'
            ? resData.token
            : typeof resData?.jwt === 'string'
              ? resData.jwt
              : null;

      const newRefreshToken =
        typeof resData?.refreshToken === 'string'
          ? resData.refreshToken
          : typeof resData?.refresh_token === 'string'
            ? resData.refresh_token
            : null;

      if (!newAccessToken) {
        throw new Error('No new access token in refresh payload');
      }

      setAuthToken(newAccessToken);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }

      if (resData?.user && typeof resData.user === 'object' && typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(resData.user));
        localStorage.setItem('payroll_user', JSON.stringify(resData.user));
      }

      return newAccessToken;
    } catch (err) {
      console.warn('Dynamic token refresh could not be completed:', err);
      // If token refresh fails definitively, clear invalid session tokens
      clearAuthTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const isAuthOrRefresh =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/employee/login') ||
    endpoint.includes('/auth/refresh');

  // Proactive check: If token is expiring within 30s and not an auth route, refresh proactively
  if (!isRetry && !isAuthOrRefresh) {
    const currentToken = getAuthToken();
    if (currentToken && isTokenExpiring(currentToken)) {
      await refreshAuthToken();
    }
  }

  const tokenAtRequestTime = getAuthToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject workspace context and bearer token if available
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const workspaceId = getWorkspaceId();
  if (workspaceId && !headers.has('x-workspace-id')) {
    headers.set('x-workspace-id', workspaceId);
  }

  const rawApiBase = clientEnv.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const apiBase = rawApiBase.replace(/\/+$/, '');

  let url: string;
  if (endpoint.startsWith('http')) {
    url = endpoint;
  } else {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (apiBase.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1')) {
      url = `${apiBase}${cleanEndpoint.slice(7)}`;
    } else {
      url = `${apiBase}${cleanEndpoint}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiClientError(
      `Could not connect to backend server at ${apiBase}. Please verify the backend is running. (${message})`,
      'NETWORK_ERROR',
      err,
      0,
    );
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      // If 401 and not retried yet, attempt dynamic token refresh and retry
      if (response.status === 401 && !isRetry && !isAuthOrRefresh) {
        const currentToken = getAuthToken();
        if (currentToken && tokenAtRequestTime && currentToken !== tokenAtRequestTime) {
          const retryHeaders = new Headers(options.headers);
          retryHeaders.set('Authorization', `Bearer ${currentToken}`);
          return fetchApi<T>(endpoint, { ...options, headers: retryHeaders }, true);
        }

        const refreshedToken = await refreshAuthToken();
        if (refreshedToken) {
          const retryHeaders = new Headers(options.headers);
          retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
          return fetchApi<T>(endpoint, { ...options, headers: retryHeaders }, true);
        }
      }

      throw new ApiClientError(
        `Server returned error HTTP ${response.status}: ${response.statusText}`,
        `HTTP_${response.status}`,
        undefined,
        response.status,
      );
    }
  }

  const resObj = (typeof json === 'object' && json !== null ? json : {}) as Record<string, unknown>;
  const isErrorStatus =
    !response.ok ||
    resObj['success'] === false ||
    resObj['status'] === 'error' ||
    resObj['status'] === 'fail';

  if (isErrorStatus) {
    const errorNested = (
      typeof resObj['error'] === 'object' && resObj['error'] !== null ? resObj['error'] : {}
    ) as Record<string, unknown>;

    const errorCode =
      (typeof errorNested['code'] === 'string' ? errorNested['code'] : null) ||
      (typeof resObj['code'] === 'string' ? resObj['code'] : null) ||
      `HTTP_${response.status}`;

    let errorMessage =
      (typeof errorNested['message'] === 'string' ? errorNested['message'] : null) ||
      (typeof resObj['message'] === 'string' ? resObj['message'] : null) ||
      (typeof resObj['error'] === 'string' ? resObj['error'] : null) ||
      `HTTP ${response.status} Error: ${response.statusText || 'Request failed'}`;

    // Reactive Refresh: If 401 Unauthorized or expired token error, refresh and retry once
    const isUnauthorized =
      response.status === 401 ||
      errorCode === 'UNAUTHORIZED' ||
      errorCode === 'JWT_EXPIRED' ||
      errorCode === 'TOKEN_EXPIRED' ||
      errorCode === 'UNAUTHENTICATED' ||
      errorMessage.toLowerCase().includes('expired') ||
      errorMessage.toLowerCase().includes('authentication') ||
      errorMessage.toLowerCase().includes('token required') ||
      errorMessage.toLowerCase().includes('unauthorized');

    if (isUnauthorized && !isRetry && !isAuthOrRefresh) {
      const currentToken = getAuthToken();
      if (currentToken && tokenAtRequestTime && currentToken !== tokenAtRequestTime) {
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Authorization', `Bearer ${currentToken}`);
        return fetchApi<T>(endpoint, { ...options, headers: retryHeaders }, true);
      }

      const refreshedToken = await refreshAuthToken();
      if (refreshedToken) {
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
        return fetchApi<T>(endpoint, { ...options, headers: retryHeaders }, true);
      }
    }

    const details = errorNested['details'] || resObj['details'] || resObj['errors'];

    // Friendly translations for standard domain error scenarios
    if (response.status === 401 || errorCode === 'UNAUTHORIZED') {
      errorMessage =
        typeof resObj['message'] === 'string'
          ? resObj['message']
          : 'Session expired or authentication token required. Please log in.';
    } else if (response.status === 409 || errorCode === 'SalaryStructureOverlapError') {
      errorMessage =
        'An active salary structure already covers this date range. Please use Revise / Supersede to schedule a revision.';
    } else if (errorCode === 'InvalidPayrollRunStateError') {
      errorMessage =
        errorMessage ||
        'This action cannot be performed because the payroll run is currently in an invalid state for this operation.';
    } else if (response.status === 403 || errorCode === 'ForbiddenError') {
      errorMessage = 'You do not have permission to perform this payroll operation.';
    }

    throw new ApiClientError(errorMessage, errorCode, details, response.status);
  }

  // Handle various successful envelope structures: { data: T }, { success: true, data: T }, or raw T
  if (resObj['data'] !== undefined) {
    return resObj['data'] as T;
  }

  return json as T;
}
