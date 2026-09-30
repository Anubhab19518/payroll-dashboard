import { fetchApi } from '@/lib/client/api-client';
import type { SalaryStructure, SalaryStructureComponent, PayBasis } from '@/types/payroll';

export interface AssignSalaryStructureInput {
  payBasis: PayBasis;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
  components: SalaryStructureComponent[];
}

export class SalaryStructureService {
  /**
   * Assign an initial salary structure to an employee
   */
  public static async createStructure(
    employeeId: string,
    input: AssignSalaryStructureInput,
  ): Promise<SalaryStructure> {
    return fetchApi<SalaryStructure>(`/api/v1/payroll/employees/${employeeId}/salary-structures`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Supersede (revise/promote) an employee's salary structure safely
   */
  public static async supersedeStructure(
    employeeId: string,
    input: AssignSalaryStructureInput,
  ): Promise<SalaryStructure> {
    return fetchApi<SalaryStructure>(
      `/api/v1/payroll/employees/${employeeId}/salary-structures/supersede`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  /**
   * Get the active structure currently in effect
   */
  public static async getActiveStructure(employeeId: string): Promise<SalaryStructure | null> {
    try {
      return await fetchApi<SalaryStructure>(
        `/api/v1/payroll/employees/${employeeId}/salary-structures/active`,
      );
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Get all historical structures for an employee
   */
  public static async getHistoricalStructures(employeeId: string): Promise<SalaryStructure[]> {
    return fetchApi<SalaryStructure[]>(`/api/v1/payroll/employees/${employeeId}/salary-structures`);
  }
}
