'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  RefreshCw,
  CheckCircle,
  Lock,
  XCircle,
  Search,
  Edit3,
  CalendarCheck,
} from 'lucide-react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Drawer } from '@/components/molecules/drawer';
import { ConfirmDialog } from '@/components/molecules/confirm-dialog';
import { EmptyState } from '@/components/molecules/empty-state';
import { DataTable, type Column } from '@/components/organisms/data-table';
import { PayrollRunService } from '@/features/payroll/services/payroll-run.service';
import {
  PayrollItemService,
  type CorrectPayrollItemInput,
} from '@/features/payroll/services/payroll-item.service';
import { EmployeeLookupService } from '@/features/employees/services/employee-lookup.service';
import { SalaryStructureService } from '@/features/payroll/services/salary-structure.service';
import type {
  PayrollRun,
  PayrollRunItem,
  EmployeeSummary,
  ItemBreakdownEntry,
} from '@/types/payroll';
import { formatCurrency } from '@/lib/format-currency';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

import { evaluateRunItemWithStructure } from '@/features/payroll/utils/payroll-calculator';

export default function PayrollRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const runId = resolvedParams.runId;

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [isRunLoading, setIsRunLoading] = useState(true);
  const [runNotFound, setRunNotFound] = useState(false);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<
    'calculate' | 'approve' | 'finalize' | 'cancel' | null
  >(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [cancelReason] = useState('');

  // Item Detail & Adjustment Drawer
  const [selectedItem, setSelectedItem] = useState<PayrollRunItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [correctionForm, setCorrectionForm] = useState<CorrectPayrollItemInput>({
    payableDays: 30,
    presentDays: 30,
    lopDays: 0,
    manualEarnings: 0,
    manualDeductions: 0,
    remarks: '',
    notes: '',
  });
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  const periodYear = run?.periodYear || 2026;
  const periodMonth = run?.periodMonth || 9;

  const fetchRun = useCallback(async () => {
    setIsRunLoading(true);
    setRunNotFound(false);
    try {
      const data = await PayrollRunService.getRunById(runId);
      setRun(data);
    } catch (err: unknown) {
      console.warn('Failed to load run details:', err);
      const is404 =
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status?: number }).status === 404;
      if (is404) {
        setRunNotFound(true);
      }
    } finally {
      setIsRunLoading(false);
    }
  }, [runId]);

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const [data, employeesList] = await Promise.all([
        PayrollItemService.listItems(runId, {
          page,
          limit,
          search: searchQuery || undefined,
        }),
        EmployeeLookupService.searchEmployees('', 200).catch(() => []),
      ]);

      const empMap = new Map<string, EmployeeSummary>();
      for (const emp of employeesList) {
        empMap.set(emp.id, emp);
      }

      const rawItems = data.data || [];
      const daysInPeriod = new Date(periodYear, periodMonth, 0).getDate();

      // Fetch active structures for each employee in batch
      const structurePromises = rawItems.map((item) =>
        SalaryStructureService.getActiveStructure(item.employeeId)
          .catch(() => null)
          .then(async (act) => {
            if (act && act.components && act.components.length > 0) return act;
            const hist = await SalaryStructureService.getHistoricalStructures(
              item.employeeId,
            ).catch(() => []);
            return hist.find((s) => s.components && s.components.length > 0) || null;
          }),
      );
      const structures = await Promise.all(structurePromises);

      const enrichedItems = rawItems.map((item, idx) => {
        const emp = empMap.get(item.employeeId);
        const struct = structures[idx] || null;
        const evaluated = evaluateRunItemWithStructure(item, struct, daysInPeriod);

        return {
          ...evaluated,
          employee:
            evaluated.employee ||
            (emp
              ? {
                  firstName: emp.firstName,
                  lastName: emp.lastName,
                  employeeCode: emp.employeeCode,
                  email: emp.email,
                }
              : undefined),
        };
      });

      // Also apply client-side search filtering if searchQuery is provided
      let finalItems = enrichedItems;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        finalItems = enrichedItems.filter((it) => {
          const fn = it.employee?.firstName?.toLowerCase() || '';
          const ln = it.employee?.lastName?.toLowerCase() || '';
          const code = it.employee?.employeeCode?.toLowerCase() || '';
          const email = it.employee?.email?.toLowerCase() || '';
          return (
            fn.includes(q) ||
            ln.includes(q) ||
            code.includes(q) ||
            email.includes(q) ||
            it.employeeId.toLowerCase().includes(q)
          );
        });
      }

      setItems(finalItems);
      setTotal(data.meta?.total || finalItems.length);
    } catch (err) {
      console.warn('Failed to load run items:', err);
    } finally {
      setItemsLoading(false);
    }
  }, [runId, periodYear, periodMonth, page, limit, searchQuery]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setIsActionLoading(true);
    try {
      if (confirmAction === 'calculate') {
        const updated = await PayrollRunService.calculateRun(runId);
        setRun(updated);
        await fetchItems();
      } else if (confirmAction === 'approve') {
        const updated = await PayrollRunService.approveRun(runId);
        setRun(updated);
      } else if (confirmAction === 'finalize') {
        const updated = await PayrollRunService.finalizeRun(runId);
        setRun(updated);
      } else if (confirmAction === 'cancel') {
        const updated = await PayrollRunService.cancelRun(runId, cancelReason);
        setRun(updated);
      }
      setConfirmAction(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenItemDrawer = async (item: PayrollRunItem) => {
    const daysInPeriod = run ? new Date(run.periodYear, run.periodMonth, 0).getDate() : 30;
    const initialLop = item.lopDays !== undefined ? Number(item.lopDays) : 0;
    const initialPresent =
      item.presentDays !== undefined && Number(item.presentDays) > 0
        ? Number(item.presentDays)
        : Math.max(0, daysInPeriod - initialLop);
    const initialPayable =
      item.payableDays !== undefined && Number(item.payableDays) > 0
        ? Number(item.payableDays)
        : Math.max(0, daysInPeriod - initialLop);

    setSelectedItem(item);
    setIsEditing(false);
    setCorrectionForm({
      payableDays: initialPayable,
      presentDays: initialPresent,
      lopDays: initialLop,
      overtimeHours: Number(item.overtimeHours) || 0,
      manualEarnings: 0,
      manualDeductions: 0,
      remarks: item.remarks || '',
      notes: item.notes || '',
    });
    setIsDrawerOpen(true);

    // Fetch freshest single item detail while preserving resolved employee details and structure
    try {
      const [freshItem, actStruct] = await Promise.all([
        PayrollItemService.getItemById(runId, item.id),
        SalaryStructureService.getActiveStructure(item.employeeId).catch(() => null),
      ]);

      const evaluated = evaluateRunItemWithStructure(freshItem, actStruct, daysInPeriod);

      setSelectedItem({
        ...evaluated,
        employee: evaluated.employee || item.employee,
      });

      setCorrectionForm((prev) => ({
        ...prev,
        payableDays: evaluated.payableDays,
        presentDays: evaluated.presentDays,
        lopDays: evaluated.lopDays,
        overtimeHours: Number(freshItem.overtimeHours) || 0,
      }));
    } catch (e) {
      console.warn('Could not fetch fresh item detail:', e);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSavingCorrection(true);
    try {
      const updatedItem = await PayrollItemService.correctItem(
        runId,
        selectedItem.id,
        correctionForm,
      );

      const daysInPeriod = run ? new Date(run.periodYear, run.periodMonth, 0).getDate() : 30;
      const actStruct = await SalaryStructureService.getActiveStructure(
        selectedItem.employeeId,
      ).catch(() => null);
      const evaluated = evaluateRunItemWithStructure(updatedItem, actStruct, daysInPeriod);

      setSelectedItem({
        ...evaluated,
        employee: evaluated.employee || selectedItem.employee,
      });
      setIsEditing(false);
      // Refresh items list and run totals
      await fetchItems();
      await fetchRun();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save correction');
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const isFinalized = run?.status === 'FINALIZED';
  const isCancelled = run?.status === 'CANCELLED';

  const columns: Column<PayrollRunItem>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (item) => {
        const firstName = item.employee?.firstName || 'Employee';
        const lastName = item.employee?.lastName || '';
        const code = item.employee?.employeeCode || item.employeeId.slice(0, 8);
        const email = item.employee?.email || '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {firstName[0] || 'E'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {firstName} {lastName}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                {code} {email && `• ${email}`}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'presentDays',
      header: 'Present / Pay Days',
      align: 'center',
      render: (item) => (
        <div style={{ fontSize: '0.8125rem', color: '#334155' }}>
          <span style={{ fontWeight: 600 }}>{item.presentDays}</span> / {item.payableDays}
        </div>
      ),
    },
    {
      key: 'lopDays',
      header: 'LOP',
      align: 'center',
      render: (item) => (
        <span
          style={{
            fontWeight: item.lopDays > 0 ? 700 : 500,
            color: item.lopDays > 0 ? '#dc2626' : '#64748b',
          }}
        >
          {item.lopDays} d
        </span>
      ),
    },
    {
      key: 'overtimeHours',
      header: 'OT Hours',
      align: 'center',
      render: (item) => (
        <span style={{ color: item.overtimeHours > 0 ? '#2563eb' : '#64748b', fontWeight: 500 }}>
          {item.overtimeHours} hrs
        </span>
      ),
    },
    {
      key: 'grossEarnings',
      header: 'Gross Pay',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontWeight: 500, color: '#0f172a' }}>
          {formatCurrency(item.grossEarnings)}
        </span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontWeight: 500, color: '#dc2626' }}>
          {formatCurrency(item.totalDeductions)}
        </span>
      ),
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: '#059669' }}>
          {formatCurrency(item.netPay)}
        </span>
      ),
    },
    {
      key: 'totalEmployerCost',
      header: 'Employer Cost',
      align: 'right',
      render: (item) => (
        <span className="tabular-nums" style={{ fontWeight: 600, color: '#0f172a' }}>
          {formatCurrency(item.totalEmployerCost)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (item) => <Badge status={item.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenItemDrawer(item);
          }}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          Review
        </button>
      ),
    },
  ];

  if (runNotFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link
          href="/payroll/runs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Payroll Runs</span>
        </Link>
        <EmptyState
          title="Payroll Run Not Found"
          description={`The payroll run with ID "${runId}" does not exist in the active workspace. It may have been deleted, cancelled, or belongs to a different workspace.`}
          actionLabel="View All Payroll Runs"
          onAction={() => router.push('/payroll/runs')}
        />
      </div>
    );
  }

  if (isRunLoading && !run) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link
          href="/payroll/runs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Payroll Runs</span>
        </Link>
        <div
          style={{
            padding: 'var(--space-12) var(--space-6)',
            textAlign: 'center',
            backgroundColor: 'hsl(var(--bg-surface))',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid hsl(var(--border-subtle))',
          }}
        >
          <RefreshCw
            size={28}
            className="animate-spin"
            style={{ margin: '0 auto var(--space-3)', color: '#4f46e5' }}
          />
          <p
            style={{ margin: 0, color: 'hsl(var(--text-muted))', fontSize: 'var(--font-size-sm)' }}
          >
            Loading payroll run details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back link & Top Run Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Link
          href="/payroll/runs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Payroll Runs</span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              {run
                ? `${MONTH_NAMES[run.periodMonth - 1]} ${run.periodYear} Payroll`
                : 'Payroll Run'}
            </h1>
            {run && <Badge status={run.status} />}
          </div>

          {/* Action Buttons governed by lifecycle state */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {run?.status === 'DRAFT' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setConfirmAction('calculate')}
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <Play size={15} fill="#ffffff" />
                  <span>Calculate Payroll</span>
                </Button>
                <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
                  <XCircle size={15} />
                  <span>Cancel Run</span>
                </Button>
              </>
            )}

            {(run?.status === 'CALCULATED' || run?.status === 'UNDER_REVIEW') && (
              <>
                <Button variant="secondary" onClick={() => setConfirmAction('calculate')}>
                  <RefreshCw size={15} />
                  <span>Recalculate</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setConfirmAction('approve')}
                  style={{ backgroundColor: '#059669' }}
                >
                  <CheckCircle size={15} />
                  <span>Approve Run</span>
                </Button>
                <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
                  <XCircle size={15} />
                  <span>Cancel</span>
                </Button>
              </>
            )}

            {run?.status === 'APPROVED' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setConfirmAction('finalize')}
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <Lock size={15} />
                  <span>Finalize & Publish</span>
                </Button>
                <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
                  <span>Cancel Run</span>
                </Button>
              </>
            )}

            {isFinalized && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                  color: '#059669',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <Lock size={15} />
                <span>Finalized & Immutable (Read-Only)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Stats Summary Cards */}
      {run &&
        (() => {
          const liveGross =
            items.length > 0
              ? items.reduce((sum, it) => sum + (parseFloat(String(it.grossEarnings)) || 0), 0)
              : run.totalGross || 0;
          const liveDeductions =
            items.length > 0
              ? items.reduce((sum, it) => sum + (parseFloat(String(it.totalDeductions)) || 0), 0)
              : run.totalDeductions || 0;
          const liveNet =
            items.length > 0
              ? items.reduce((sum, it) => sum + (parseFloat(String(it.netPay)) || 0), 0)
              : run.totalNet || 0;
          const liveCost =
            items.length > 0
              ? items.reduce((sum, it) => sum + (parseFloat(String(it.totalEmployerCost)) || 0), 0)
              : run.totalEmployerCost || 0;

          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
              }}
            >
              <div className="card-base" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  Total Employees
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '0.25rem',
                  }}
                >
                  {run.totalEmployees}
                </div>
              </div>

              <div className="card-base" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  Gross Earnings
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '0.25rem',
                  }}
                >
                  {formatCurrency(liveGross)}
                </div>
              </div>

              <div className="card-base" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  Total Deductions
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    marginTop: '0.25rem',
                  }}
                >
                  {formatCurrency(liveDeductions)}
                </div>
              </div>

              <div className="card-base" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  Total Net Payout
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#059669',
                    marginTop: '0.25rem',
                  }}
                >
                  {formatCurrency(liveNet)}
                </div>
              </div>

              <div className="card-base" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  Total Employer Cost (CTC)
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '0.25rem',
                  }}
                >
                  {formatCurrency(liveCost)}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Items Filter Bar */}
      <div
        className="card-base"
        style={{
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '320px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search employee name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* Items Table */}
      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        isLoading={itemsLoading}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onRowClick={handleOpenItemDrawer}
        emptyMessage="No employee items calculated"
        emptySubtext={
          run?.status === 'DRAFT'
            ? "Click 'Calculate Payroll' to process attendance and generate employee line items."
            : 'No matching items found.'
        }
      />

      {/* Item Breakdown & Manual Adjustment Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          selectedItem
            ? `${selectedItem.employee?.firstName || 'Employee'} ${selectedItem.employee?.lastName || ''}`.trim()
            : 'Employee Payroll Line Item'
        }
        subtitle={
          selectedItem
            ? `${selectedItem.employee?.employeeCode || selectedItem.employeeId}${selectedItem.employee?.email ? ` • ${selectedItem.employee.email}` : ''}`
            : undefined
        }
        width="560px"
        footer={
          !isFinalized && !isCancelled ? (
            isEditing ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveCorrection}
                  isLoading={isSavingCorrection}
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  Save Manual Adjustment
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 size={14} />
                <span>Manual Adjustment / Correction</span>
              </Button>
            )
          ) : undefined
        }
      >
        {selectedItem &&
          (() => {
            const rawSelected = selectedItem as unknown as Record<string, unknown>;
            const earningsList: ItemBreakdownEntry[] = selectedItem.earningsJson?.length
              ? selectedItem.earningsJson
              : Array.isArray(rawSelected.earnings)
                ? (rawSelected.earnings as ItemBreakdownEntry[])
                : Array.isArray(rawSelected.earnings_json)
                  ? (rawSelected.earnings_json as ItemBreakdownEntry[])
                  : [];

            const deductionsList: ItemBreakdownEntry[] = selectedItem.deductionsJson?.length
              ? selectedItem.deductionsJson
              : Array.isArray(rawSelected.deductions)
                ? (rawSelected.deductions as ItemBreakdownEntry[])
                : Array.isArray(rawSelected.deductions_json)
                  ? (rawSelected.deductions_json as ItemBreakdownEntry[])
                  : [];

            const employerContributionsList: ItemBreakdownEntry[] = selectedItem
              .employerContributionsJson?.length
              ? selectedItem.employerContributionsJson
              : Array.isArray(rawSelected.employerContributions)
                ? (rawSelected.employerContributions as ItemBreakdownEntry[])
                : Array.isArray(rawSelected.employer_contributions)
                  ? (rawSelected.employer_contributions as ItemBreakdownEntry[])
                  : Array.isArray(rawSelected.employer_contributions_json)
                    ? (rawSelected.employer_contributions_json as ItemBreakdownEntry[])
                    : [];

            const grossVal =
              parseFloat(String(selectedItem.grossEarnings ?? rawSelected.gross_earnings ?? 0)) ||
              0;
            const dedVal =
              parseFloat(
                String(selectedItem.totalDeductions ?? rawSelected.total_deductions ?? 0),
              ) || 0;
            const netVal =
              parseFloat(String(selectedItem.netPay ?? rawSelected.net_pay ?? grossVal - dedVal)) ||
              0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Attendance Snapshot */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CalendarCheck size={16} color="#4f46e5" />
                    <span>Attendance & Work Days Snapshot</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Payable</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {selectedItem.payableDays}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Present</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                        {selectedItem.presentDays}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>LOP Days</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
                        {selectedItem.lopDays}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>OT Hours</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2563eb' }}>
                        {selectedItem.overtimeHours}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Correction Form if Editing Mode */}
                {isEditing && (
                  <form
                    onSubmit={handleSaveCorrection}
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.875rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>
                        Manual Attendance & Wage Adjustment
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600 }}>
                        Month Cycle:{' '}
                        {run ? new Date(run.periodYear, run.periodMonth, 0).getDate() : 30} Days
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#78350f' }}>
                      Adjusting LOP or Present days automatically updates payable days and
                      recalculates contractual Basic, HRA, and PF upon saving.
                    </p>

                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#78350f',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Override LOP Days
                        </label>
                        <Input
                          type="number"
                          value={correctionForm.lopDays ?? 0}
                          onChange={(e) => {
                            const newLop = parseFloat(e.target.value) || 0;
                            const daysInPeriod = run
                              ? new Date(run.periodYear, run.periodMonth, 0).getDate()
                              : 30;
                            const newPresent = Math.max(0, daysInPeriod - newLop);
                            setCorrectionForm({
                              ...correctionForm,
                              lopDays: newLop,
                              presentDays: newPresent,
                              payableDays: newPresent,
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#78350f',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Present / Payable Days
                        </label>
                        <Input
                          type="number"
                          value={correctionForm.presentDays ?? 0}
                          onChange={(e) => {
                            const newPresent = parseFloat(e.target.value) || 0;
                            const daysInPeriod = run
                              ? new Date(run.periodYear, run.periodMonth, 0).getDate()
                              : 30;
                            const newLop = Math.max(0, daysInPeriod - newPresent);
                            setCorrectionForm({
                              ...correctionForm,
                              presentDays: newPresent,
                              payableDays: newPresent,
                              lopDays: newLop,
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#78350f',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Manual Additional Earnings (₹)
                        </label>
                        <Input
                          type="number"
                          value={correctionForm.manualEarnings || 0}
                          onChange={(e) =>
                            setCorrectionForm({
                              ...correctionForm,
                              manualEarnings: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#78350f',
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Manual Deductions (₹)
                        </label>
                        <Input
                          type="number"
                          value={correctionForm.manualDeductions || 0}
                          onChange={(e) =>
                            setCorrectionForm({
                              ...correctionForm,
                              manualDeductions: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#78350f',
                          display: 'block',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Remarks / Audit Reason
                      </label>
                      <Input
                        placeholder="e.g. Adjusted 10 LOP days and 20 present days"
                        value={correctionForm.remarks || ''}
                        onChange={(e) =>
                          setCorrectionForm({ ...correctionForm, remarks: e.target.value })
                        }
                      />
                    </div>
                  </form>
                )}

                {/* Earnings Breakdown */}
                <div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Earnings Breakdown
                  </div>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                    }}
                  >
                    {earningsList.length > 0 ? (
                      earningsList.map((entry, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.625rem 0.875rem',
                            borderBottom:
                              idx < earningsList.length - 1 ? '1px solid #f1f5f9' : 'none',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <span style={{ color: '#334155' }}>{entry.name}</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: '0.75rem',
                          color: '#94a3b8',
                          fontSize: '0.8125rem',
                          textAlign: 'center',
                        }}
                      >
                        No earnings calculated
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Deductions Breakdown
                  </div>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                    }}
                  >
                    {deductionsList.length > 0 ? (
                      deductionsList.map((entry, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.625rem 0.875rem',
                            borderBottom:
                              idx < deductionsList.length - 1 ? '1px solid #f1f5f9' : 'none',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <span style={{ color: '#334155' }}>
                            {entry.name} {entry.isStatutory && '(Statutory)'}
                          </span>
                          <span style={{ fontWeight: 600, color: '#dc2626' }}>
                            - {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: '0.75rem',
                          color: '#94a3b8',
                          fontSize: '0.8125rem',
                          textAlign: 'center',
                        }}
                      >
                        No deductions
                      </div>
                    )}
                  </div>
                </div>

                {/* Employer Contributions */}
                {employerContributionsList.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Employer Contributions (CTC)
                    </div>
                    <div
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                    >
                      {employerContributionsList.map((entry, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.625rem 0.875rem',
                            borderBottom:
                              idx < employerContributionsList.length - 1
                                ? '1px solid #f1f5f9'
                                : 'none',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <span style={{ color: '#334155' }}>{entry.name}</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Totals Summary Card */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}
                  >
                    <span>Gross Earnings</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {formatCurrency(grossVal)}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}
                  >
                    <span>Total Deductions</span>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      - {formatCurrency(dedVal)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#059669',
                    }}
                  >
                    <span>Net Pay</span>
                    <span>{formatCurrency(netVal)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
      </Drawer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        isLoading={isActionLoading}
        title={
          confirmAction === 'calculate'
            ? 'Calculate Payroll Batch?'
            : confirmAction === 'approve'
              ? 'Approve Payroll Run?'
              : confirmAction === 'finalize'
                ? 'Finalize & Lock Payroll Run?'
                : 'Cancel Payroll Run?'
        }
        description={
          confirmAction === 'calculate'
            ? 'This will fetch attendance records and evaluate contractual salary structures for all eligible employees.'
            : confirmAction === 'approve'
              ? 'This will mark the payroll batch as approved and prepare it for final disbursement.'
              : confirmAction === 'finalize'
                ? 'FINALIZING IS IMMUTABLE. Once finalized, no further edits, calculations, or adjustments can be made. Employee payslips will be generated.'
                : 'Are you sure you want to cancel this payroll batch? You can create a fresh draft run afterwards.'
        }
        confirmLabel={
          confirmAction === 'calculate'
            ? 'Start Calculation'
            : confirmAction === 'approve'
              ? 'Approve Run'
              : confirmAction === 'finalize'
                ? 'Finalize Run'
                : 'Yes, Cancel Run'
        }
        isDestructive={confirmAction === 'cancel' || confirmAction === 'finalize'}
      />
    </div>
  );
}
