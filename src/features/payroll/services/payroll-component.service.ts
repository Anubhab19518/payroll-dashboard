import { fetchApi } from '@/lib/client/api-client';
import type { SalaryComponent } from '@/types/payroll';

export interface CreateSalaryComponentInput {
  code: string;
  name: string;
  category: SalaryComponent['category'];
  calculationType: SalaryComponent['calculationType'];
  percentageOf?: string | null;
  isTaxable?: boolean;
  isPfApplicable?: boolean;
  isEsiApplicable?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
}

export type UpdateSalaryComponentInput = Partial<CreateSalaryComponentInput>;

export class PayrollComponentService {
  public static async listComponents(isEnabled?: boolean): Promise<SalaryComponent[]> {
    const params = new URLSearchParams();
    if (isEnabled !== undefined) {
      params.append('isEnabled', isEnabled ? 'true' : 'false');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<SalaryComponent[]>(`/api/v1/payroll/components${query}`);
  }

  public static async seedStandardComponents(): Promise<SalaryComponent[]> {
    return fetchApi<SalaryComponent[]>('/api/v1/payroll/components/seed-standard', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public static async createComponent(input: CreateSalaryComponentInput): Promise<SalaryComponent> {
    return fetchApi<SalaryComponent>('/api/v1/payroll/components', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public static async updateComponent(
    id: string,
    input: UpdateSalaryComponentInput,
  ): Promise<SalaryComponent> {
    return fetchApi<SalaryComponent>(`/api/v1/payroll/components/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }
}
