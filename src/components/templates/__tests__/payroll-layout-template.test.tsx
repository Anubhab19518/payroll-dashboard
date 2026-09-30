import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PayrollLayoutTemplate } from '../payroll-layout-template';
import * as apiClient from '@/lib/client/api-client';
import * as authGuard from '@/lib/client/auth-guard';

describe('PayrollLayoutTemplate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders payroll layout with navigation tabs and children slot', () => {
    vi.spyOn(apiClient, 'getAuthToken').mockReturnValue('valid-token');
    vi.spyOn(authGuard, 'verifyPayrollAccess').mockResolvedValue(true);

    render(
      <PayrollLayoutTemplate>
        <div>Payroll Dashboard Content</div>
      </PayrollLayoutTemplate>,
    );

    expect(screen.getByText('Payroll Dashboard Content')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Payroll Runs')).toBeInTheDocument();
    expect(screen.getByText('Salary Structures')).toBeInTheDocument();
    expect(screen.getByText('Salary Components')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Payslips')).toBeInTheDocument();
  });
});
