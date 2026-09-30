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
    it('lists components, seeds standard components, creates, and updates a component', async () => {
      const mockComponents = [
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
      ];

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockComponents);
      const list = await PayrollComponentService.listComponents(true);
      expect(list).toHaveLength(1);

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockComponents);
      const seeded = await PayrollComponentService.seedStandardComponents();
      expect(seeded).toHaveLength(1);

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockComponents[0]);
      const created = await PayrollComponentService.createComponent({
        code: 'BASIC',
        name: 'Basic Salary',
        category: 'EARNING',
        calculationType: 'FIXED_AMOUNT',
      });
      expect(created.code).toBe('BASIC');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({
        ...mockComponents[0],
        name: 'Updated Basic',
      });
      const updated = await PayrollComponentService.updateComponent('c1', {
        name: 'Updated Basic',
      });
      expect(updated.name).toBe('Updated Basic');
    });
  });

  describe('PayrollRunService', () => {
    it('handles listing, creating, calculating, approving, finalizing, and cancelling runs', async () => {
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

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce([mockRun]);
      const list = await PayrollRunService.listRuns({
        page: 1,
        limit: 10,
        status: 'DRAFT',
        year: 2026,
        month: 9,
      });
      expect(list.data).toHaveLength(1);

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockRun);
      const created = await PayrollRunService.createRun({ periodYear: 2026, periodMonth: 9 });
      expect(created.id).toBe('run-001');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockRun);
      const single = await PayrollRunService.getRunById('run-001');
      expect(single.id).toBe('run-001');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({
        ...mockRun,
        status: 'CALCULATED' as const,
      });
      const calculated = await PayrollRunService.calculateRun('run-001', ['emp-1']);
      expect(calculated.status).toBe('CALCULATED');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({
        ...mockRun,
        status: 'APPROVED' as const,
      });
      const approved = await PayrollRunService.approveRun('run-001');
      expect(approved.status).toBe('APPROVED');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({
        ...mockRun,
        status: 'FINALIZED' as const,
      });
      const finalized = await PayrollRunService.finalizeRun('run-001');
      expect(finalized.status).toBe('FINALIZED');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({
        ...mockRun,
        status: 'CANCELLED' as const,
      });
      const cancelled = await PayrollRunService.cancelRun('run-001', 'Correction needed');
      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  describe('PayrollItemService', () => {
    it('fetches single item, corrects item, and handles pagination arrays', async () => {
      const mockItem = {
        id: 'item-1',
        payrollRunId: 'run-1',
        employeeId: 'emp-1',
        payableDays: 30,
        presentDays: 30,
        absentDays: 0,
        lopDays: 0,
        halfDays: 0,
        overtimeHours: 0,
        grossEarnings: 30000,
        totalDeductions: 2000,
        netPay: 28000,
        employerContributions: 2500,
        totalEmployerCost: 32500,
        status: 'CALCULATED',
        earningsJson: [],
        deductionsJson: [],
        employerContributionsJson: [],
      };

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce([mockItem]);
      const list = await PayrollItemService.listItems('run-1', {
        page: 1,
        limit: 10,
        search: 'EMP001',
      });
      expect(list.data).toHaveLength(1);

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockItem);
      const item = await PayrollItemService.getItemById('run-1', 'item-1');
      expect(item.id).toBe('item-1');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({ ...mockItem, netPay: 29000 });
      const corrected = await PayrollItemService.correctItem('run-1', 'item-1', {
        manualEarnings: 1000,
      });
      expect(corrected.netPay).toBe(29000);
    });

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
    it('creates, supersedes, retrieves active structure, and retrieves historical structures', async () => {
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

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockStructure);
      const created = await SalaryStructureService.createStructure('emp-1', {
        payBasis: 'MONTHLY',
        effectiveFrom: '2026-04-01',
        components: mockStructure.components,
      });
      expect(created.status).toBe('ACTIVE');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({ ...mockStructure, id: 'str-2' });
      const superseded = await SalaryStructureService.supersedeStructure('emp-1', {
        payBasis: 'MONTHLY',
        effectiveFrom: '2026-05-01',
        components: mockStructure.components,
      });
      expect(superseded.id).toBe('str-2');

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockStructure);
      const active = await SalaryStructureService.getActiveStructure('emp-1');
      expect(active?.id).toBe('str-1');

      // 404 handler returns null
      vi.spyOn(apiClient, 'fetchApi').mockRejectedValueOnce({ status: 404 });
      const notFound = await SalaryStructureService.getActiveStructure('emp-unknown');
      expect(notFound).toBeNull();

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce([mockStructure]);
      const history = await SalaryStructureService.getHistoricalStructures('emp-1');
      expect(history).toHaveLength(1);
    });
  });

  describe('PayslipService', () => {
    it('fetches self-service payslips and handles company-wide payslips', async () => {
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

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockPayslips);
      const data = await PayslipService.getMyPayslips(2026, 9);
      expect(data).toHaveLength(1);
      expect(data[0]?.netPay).toBe(46000);

      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce(mockPayslips);
      const all = await PayslipService.getEmployeePayslips('emp-1', 2026);
      expect(all).toHaveLength(1);
    });
  });
});
