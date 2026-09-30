import { fetchApi } from '@/lib/client/api-client';
import type { Payslip } from '@/types/payroll';

export class PayslipService {
  /**
   * Get logged-in user's self-service payslips
   */
  public static async getMyPayslips(year?: number, month?: number): Promise<Payslip[]> {
    const search = new URLSearchParams();
    if (year) search.append('year', year.toString());
    if (month) search.append('month', month.toString());

    const query = search.toString() ? `?${search.toString()}` : '';
    return fetchApi<Payslip[]>(`/api/v1/payroll/me/payslips${query}`);
  }

  /**
   * Get specific employee's historical payslips (Admin/HR view)
   */
  public static async getEmployeePayslips(employeeId: string, year?: number): Promise<Payslip[]> {
    const search = new URLSearchParams();
    if (year) search.append('year', year.toString());

    const query = search.toString() ? `?${search.toString()}` : '';
    return fetchApi<Payslip[]>(`/api/v1/payroll/employees/${employeeId}/payslips${query}`);
  }
}
