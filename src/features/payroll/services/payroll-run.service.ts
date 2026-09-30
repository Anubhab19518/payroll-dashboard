import { fetchApi } from '@/lib/client/api-client';
import type { PayrollRun, PayrollRunStatus } from '@/types/payroll';

export interface CreatePayrollRunInput {
  periodYear: number;
  periodMonth: number;
  notes?: string;
}

export interface ListPayrollRunsParams {
  page?: number;
  limit?: number;
  status?: PayrollRunStatus;
  year?: number;
  month?: number;
}

export interface ListPayrollRunsResponse {
  data: PayrollRun[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export class PayrollRunService {
  /**
   * List all payroll runs with pagination & filtering
   */
  public static async listRuns(
    params: ListPayrollRunsParams = {},
  ): Promise<ListPayrollRunsResponse> {
    const search = new URLSearchParams();
    if (params.page) search.append('page', params.page.toString());
    if (params.limit) search.append('limit', params.limit.toString());
    if (params.status) search.append('status', params.status);
    if (params.year) search.append('year', params.year.toString());
    if (params.month) search.append('month', params.month.toString());

    const query = search.toString() ? `?${search.toString()}` : '';
    const result = await fetchApi<PayrollRun[] | ListPayrollRunsResponse>(
      `/api/v1/payroll/runs${query}`,
    );

    if (Array.isArray(result)) {
      return {
        data: result,
        meta: { page: params.page || 1, limit: params.limit || 20, total: result.length },
      };
    }
    return result;
  }

  /**
   * Create a new draft payroll run
   */
  public static async createRun(input: CreatePayrollRunInput): Promise<PayrollRun> {
    return fetchApi<PayrollRun>('/api/v1/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get single payroll run by ID
   */
  public static async getRunById(runId: string): Promise<PayrollRun> {
    return fetchApi<PayrollRun>(`/api/v1/payroll/runs/${runId}`);
  }

  /**
   * Calculate or recalculate payroll run
   */
  public static async calculateRun(runId: string, employeeIds?: string[]): Promise<PayrollRun> {
    const body = employeeIds && employeeIds.length > 0 ? { employeeIds } : {};
    return fetchApi<PayrollRun>(`/api/v1/payroll/runs/${runId}/calculate`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Approve payroll run
   */
  public static async approveRun(runId: string): Promise<PayrollRun> {
    return fetchApi<PayrollRun>(`/api/v1/payroll/runs/${runId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Finalize payroll run (Locks the run and publishes payslips)
   */
  public static async finalizeRun(runId: string): Promise<PayrollRun> {
    return fetchApi<PayrollRun>(`/api/v1/payroll/runs/${runId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Cancel payroll run
   */
  public static async cancelRun(runId: string, reason?: string): Promise<PayrollRun> {
    return fetchApi<PayrollRun>(`/api/v1/payroll/runs/${runId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  }
}
