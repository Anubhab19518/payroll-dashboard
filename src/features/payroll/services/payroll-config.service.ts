import { fetchApi } from '@/lib/client/api-client';
import type { PayrollConfig } from '@/types/payroll';

export interface UpdatePayrollConfigInput {
  lopCalculationBasis?: PayrollConfig['lopCalculationBasis'];
  customLopDivisor?: number | null;
  overtimeCalculationBasis?: string;
  defaultOvertimeMultiplier?: number;
  roundOffNetPay?: boolean;
  payCycleStartDay?: number;
}

export class PayrollConfigService {
  public static async getConfig(): Promise<PayrollConfig> {
    return fetchApi<PayrollConfig>('/api/v1/payroll/config');
  }

  public static async updateConfig(input: UpdatePayrollConfigInput): Promise<PayrollConfig> {
    return fetchApi<PayrollConfig>('/api/v1/payroll/config', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }
}
