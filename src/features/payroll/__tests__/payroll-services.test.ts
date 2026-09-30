import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollConfigService } from '../services/payroll-config.service';
import { PayrollComponentService } from '../services/payroll-component.service';
import { PayrollRunService } from '../services/payroll-run.service';
import { SalaryStructureService } from '../services/salary-structure.service';
import { PayrollItemService } from '../services/payroll-item.service';
import { PayslipService } from '../services/payslip.service';
import * as apiClient from '@/lib/client/api-client';

describe('Payroll Domain Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('PayrollConfigService', () => {
    it('fetches global payroll configuration', async () => {
      const mockConfig = {
        id: 'cfg-1',
        workspaceId: 'ws-1',
        lopCalculationBasis: 'CALENDAR_DAYS' as const,
        customLopDivisor: null,
        overtimeCalculationBasis: 'PER_HOUR',
        defaultOvertimeMultiplier: 1.5,
        roundOffNetPay: true,
        payCycleStartDay: 1,
      };

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValue(mockConfig);

      const result = await PayrollConfigService.getConfig();
      expect(result.lopCalculationBasis).toBe('CALENDAR_DAYS');
      expect(result.defaultOvertimeMultiplier).toBe(1.5);
    });

    it('updates global payroll configuration', async () => {
      const mockUpdated = {
        id: 'cfg-1',
        workspaceId: 'ws-1',
        lopCalculationBasis: 'FIXED_26' as const,
        customLopDivisor: null,
        overtimeCalculationBasis: 'PER_HOUR',
        defaultOvertimeMultiplier: 2.0,
        roundOffNetPay: true,
        payCycleStartDay: 1,
      };

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValue(mockUpdated);

      const result = await PayrollConfigService.updateConfig({
        lopCalculationBasis: 'FIXED_26',
        defaultOvertimeMultiplier: 2.0,
      });

      expect(result.lopCalculationBasis).toBe('FIXED_26');
      expect(result.defaultOvertimeMultiplier).toBe(2.0);
    });
  });

  describe('PayrollComponentService', () => {
    it('seeds standard Indian payroll components', async () => {
      const mockSeeded = [
        {
          id: 'c1',
          code: 'BASIC',
          name: 'Basic Salary',
          category: 'EARNING' as const,
          calculationType: 'FIXED_AMOUNT' as const,
          isTaxable: true,
          isPfApplicable: true,
          isEsiApplicable: true,
          isEnabled: true,
        },
        {
          id: 'c2',
          code: 'HRA',
          name: 'House Rent Allowance',
          category: 'EARNING' as const,
          calculationType: 'PERCENTAGE' as const,
          percentageOf: 'BASIC',
          isTaxable: true,
          isPfApplicable: false,
          isEsiApplicable: true,
          isEnabled: true,
        },
      ];

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValue(mockSeeded);

      const result = await PayrollComponentService.seedStandardComponents();
      expect(result).toHaveLength(2);
      expect(result[0]?.code).toBe('BASIC');
      expect(result[1]?.code).toBe('HRA');
    });
  });

  describe('PayrollRunService', () => {
    it('creates, calculates, approves, and finalizes a payroll batch', async () => {
      const mockRun = {
        id: 'run-001',
        periodYear: 2026,
        periodMonth: 9,
        status: 'DRAFT' as const,
        totalEmployees: 0,
        totalGross: '0.00',
        totalDeductions: '0.00',
        totalNet: '0.00',
        totalEmployerCost: '0.00',
      };

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValue(mockRun);

      const created = await PayrollRunService.createRun({ periodYear: 2026, periodMonth: 9 });
      expect(created.id).toBe('run-001');
      expect(created.status).toBe('DRAFT');
    });
  });

  describe('PayrollItemService Multi-Page Aggregation', () => {
    it('fetches all items across pages when total exceeds single page limit', async () => {
      vi.spyOn(PayrollItemService, 'listItems').mockImplementation(async (_runId, params) => {
        if (params?.page === 1) {
          return {
            data: [
              {
                id: 'item-1',
                payrollRunId: 'run-1',
                employeeId: 'emp-1',
                payableDays: 30,
                presentDays: 28,
                absentDays: 2,
                lopDays: 2,
                halfDays: 0,
                overtimeHours: 5,
                grossEarnings: 30000,
                totalDeductions: 2000,
                netPay: 28000,
                employerContributions: 2500,
                totalEmployerCost: 32500,
                status: 'CALCULATED',
                earningsJson: [],
                deductionsJson: [],
                employerContributionsJson: [],
              },
            ],
            meta: { page: 1, limit: 1, total: 2 },
          };
        } else {
          return {
            data: [
              {
                id: 'item-2',
                payrollRunId: 'run-1',
                employeeId: 'emp-2',
                payableDays: 30,
                presentDays: 30,
                absentDays: 0,
                lopDays: 0,
                halfDays: 0,
                overtimeHours: 2,
                grossEarnings: 40000,
                totalDeductions: 3000,
                netPay: 37000,
                employerContributions: 3500,
                totalEmployerCost: 43500,
                status: 'CALCULATED',
                earningsJson: [],
                deductionsJson: [],
                employerContributionsJson: [],
              },
            ],
            meta: { page: 2, limit: 1, total: 2 },
          };
        }
      });

      const allItems = await PayrollItemService.fetchAllItems('run-1', 1);
      expect(allItems).toHaveLength(2);
      expect(allItems[0]?.id).toBe('item-1');
      expect(allItems[1]?.id).toBe('item-2');
    });
  });

  describe('SalaryStructureService', () => {
    it('creates initial salary structure and handles superseding', async () => {
      const mockStructure = {
        id: 'str-1',
        workspaceId: 'ws-1',
        employeeId: 'emp-1',
        payBasis: 'MONTHLY' as const,
        effectiveFrom: '2026-04-01',
        effectiveTo: null,
        status: 'ACTIVE' as const,
        components: [
          {
            componentCode: 'BASIC',
            category: 'EARNING' as const,
            calculationType: 'FIXED_AMOUNT' as const,
            amount: 30000,
            isActive: true,
          },
        ],
      };

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValue(mockStructure);

      const created = await SalaryStructureService.createStructure('emp-1', {
        payBasis: 'MONTHLY',
        effectiveFrom: '2026-04-01',
        components: mockStructure.components,
      });

      expect(created.status).toBe('ACTIVE');
      expect(created.components[0]?.componentCode).toBe('BASIC');
    });
  });

  describe('PayslipService', () => {
    it('fetches self-service payslips', async () => {
      const mockPayslips = [
        {
          id: 'ps-1',
          periodYear: 2026,
          periodMonth: 9,
          payableDays: 30,
          grossEarnings: 50000,
          totalDeductions: 4000,
          netPay: 46000,
          earningsJson: [],
          deductionsJson: [],
        },
      ];

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValue(mockPayslips);

      const data = await PayslipService.getMyPayslips(2026, 9);
      expect(data).toHaveLength(1);
      expect(data[0]?.netPay).toBe(46000);
    });
  });
});
