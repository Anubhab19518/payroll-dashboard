'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Filter, Eye } from 'lucide-react';
import { DataTable, type Column } from '@/components/organisms/data-table';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal } from '@/components/molecules/modal';
import { PayrollRunService } from '@/features/payroll/services/payroll-run.service';
import { PayrollItemService } from '@/features/payroll/services/payroll-item.service';
import {
  evaluateRunItems,
  enrichRunWithItemAggregates,
} from '@/features/payroll/utils/payroll-calculator';
import type { PayrollRun, PayrollRunStatus } from '@/types/payroll';
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

export default function PayrollRunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<number>(2026);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newYear, setNewYear] = useState(2026);
  const [newMonth, setNewMonth] = useState(9);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await PayrollRunService.listRuns({
        page,
        limit,
        status: statusFilter !== 'ALL' ? (statusFilter as PayrollRunStatus) : undefined,
        year: yearFilter || undefined,
      });
      const rawRuns = response.data || [];
      const enrichedRuns = await Promise.all(
        rawRuns.map(async (run) => {
          if (run.status === 'DRAFT') return run;
          try {
            const items = await PayrollItemService.fetchAllItems(run.id);
            if (!items || items.length === 0) return run;
            const evaluated = await evaluateRunItems(items, run.periodYear, run.periodMonth);
            return enrichRunWithItemAggregates(run, evaluated);
          } catch {
            return run;
          }
        }),
      );
      setRuns(enrichedRuns);
      setTotal(response.meta?.total || rawRuns.length);
    } catch (err) {
      console.warn('Failed to load payroll runs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, yearFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await PayrollRunService.createRun({
        periodYear: newYear,
        periodMonth: newMonth,
        notes: newNotes,
      });
      setIsCreateOpen(false);
      router.push(`/payroll/runs/${created.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create payroll run');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PayrollRun>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (run) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {MONTH_NAMES[run.periodMonth - 1]} {run.periodYear}
          </span>
          {run.notes && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
              {run.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'totalEmployees',
      header: 'Employees',
      align: 'center',
      render: (run) => (
        <span style={{ fontWeight: 500, color: '#334155' }}>{run.totalEmployees}</span>
      ),
    },
    {
      key: 'totalGross',
      header: 'Gross Pay',
      align: 'right',
      render: (run) => (
        <span className="tabular-nums" style={{ fontWeight: 500, color: '#0f172a' }}>
          {formatCurrency(run.totalGross)}
        </span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      render: (run) => (
        <span className="tabular-nums" style={{ fontWeight: 500, color: '#dc2626' }}>
          {formatCurrency(run.totalDeductions)}
        </span>
      ),
    },
    {
      key: 'totalNet',
      header: 'Net Payout',
      align: 'right',
      render: (run) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: '#059669' }}>
          {formatCurrency(run.totalNet)}
        </span>
      ),
    },
    {
      key: 'totalEmployerCost',
      header: 'Employer Cost',
      align: 'right',
      render: (run) => (
        <span className="tabular-nums" style={{ fontWeight: 600, color: '#0f172a' }}>
          {formatCurrency(run.totalEmployerCost)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (run) => <Badge status={run.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (run) => (
        <Link
          href={`/payroll/runs/${run.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <Eye size={13} />
          <span>View Run</span>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            Payroll Runs
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
            Process monthly payroll batches, track lifecycle approvals, and generate payslips.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary"
          style={{ backgroundColor: '#4f46e5' }}
        >
          <Plus size={16} />
          <span>New Payroll Run</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div
        className="card-base"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="#64748b" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #cbd5e1',
                fontSize: '0.8125rem',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CALCULATED">Calculated</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="FINALIZED">Finalized</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(parseInt(e.target.value, 10));
                setPage(1);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #cbd5e1',
                fontSize: '0.8125rem',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Runs Table */}
      <DataTable
        columns={columns}
        data={runs}
        keyExtractor={(run) => run.id}
        isLoading={isLoading}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onRowClick={(run) => router.push(`/payroll/runs/${run.id}`)}
        emptyMessage="No payroll runs found"
        emptySubtext="Create a new payroll run batch to start monthly calculation"
      />

      {/* Create Run Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Payroll Run Batch"
      >
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#334155',
                  display: 'block',
                  marginBottom: '0.375rem',
                }}
              >
                Period Year
              </label>
              <Input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value, 10))}
                required
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#334155',
                  display: 'block',
                  marginBottom: '0.375rem',
                }}
              >
                Period Month
              </label>
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name} ({i + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#334155',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              Notes / Description (Optional)
            </label>
            <Input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. September 2026 Regular Batch"
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Batch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
