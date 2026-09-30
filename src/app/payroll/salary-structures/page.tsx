'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, History, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal } from '@/components/molecules/modal';
import { EmployeeLookupService } from '@/features/employees/services/employee-lookup.service';
import { SalaryStructureService } from '@/features/payroll/services/salary-structure.service';
import { PayrollComponentService } from '@/features/payroll/services/payroll-component.service';
import type {
  SalaryStructure,
  SalaryStructureComponent,
  SalaryComponent,
  EmployeeSummary,
  PayBasis,
} from '@/types/payroll';
import { formatCurrency } from '@/lib/format-currency';

export default function SalaryStructuresPage() {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [activeStructure, setActiveStructure] = useState<SalaryStructure | null>(null);
  const [historyStructures, setHistoryStructures] = useState<SalaryStructure[]>([]);
  const [structureLoading, setStructureLoading] = useState(false);

  const [catalogComponents, setCatalogComponents] = useState<SalaryComponent[]>([]);

  // Supersede / Revise Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payBasis, setPayBasis] = useState<PayBasis>('MONTHLY');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-10-01');
  const [notes, setNotes] = useState('');
  const [formComponents, setFormComponents] = useState<SalaryStructureComponent[]>([]);

  // Initial search for default employees
  const searchEmployees = useCallback(
    async (query: string = '') => {
      setIsSearching(true);
      try {
        const results = await EmployeeLookupService.searchEmployees(query);
        setEmployees(results || []);
        if (results && results.length > 0 && !selectedEmployee) {
          setSelectedEmployee(results[0] || null);
        }
      } catch (err) {
        console.warn('Failed to load HR employees:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [selectedEmployee],
  );

  useEffect(() => {
    searchEmployees();
    PayrollComponentService.listComponents(true).then((comps) => {
      setCatalogComponents(comps || []);
    });
  }, [searchEmployees]);

  // Load selected employee salary structure
  useEffect(() => {
    if (!selectedEmployee) return;

    setStructureLoading(true);
    Promise.all([
      SalaryStructureService.getActiveStructure(selectedEmployee.id),
      SalaryStructureService.getHistoricalStructures(selectedEmployee.id),
    ])
      .then(([active, history]) => {
        const list = history || [];
        // Resolve the active structure with valid components
        const resolved =
          active && active.components && active.components.length > 0
            ? active
            : list.find((s) => s.status === 'ACTIVE' && s.components && s.components.length > 0) ||
              list.find((s) => s.components && s.components.length > 0) ||
              active ||
              list[0] ||
              null;

        setActiveStructure(resolved);
        setHistoryStructures(list);
      })
      .catch((err) => {
        console.warn('Failed to load employee structure:', err);
      })
      .finally(() => {
        setStructureLoading(false);
      });
  }, [selectedEmployee]);

  const [modalError, setModalError] = useState<string | null>(null);

  const handleOpenRevise = () => {
    setModalError(null);
    setPayBasis(activeStructure?.payBasis || 'MONTHLY');

    // Determine safe next effective date after active structure start date
    let nextEffectiveDate = new Date().toISOString().split('T')[0] || '2026-10-01';
    if (activeStructure?.effectiveFrom) {
      const activeDate = new Date(activeStructure.effectiveFrom);
      const nextDay = new Date(activeDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (nextDayStr && (!todayStr || nextDayStr > todayStr)) {
        nextEffectiveDate = nextDayStr;
      }
    }
    setEffectiveFrom(nextEffectiveDate);
    setNotes(`Annual Revision FY 2026-27 for ${selectedEmployee?.firstName || 'Employee'}`);

    // Pre-populate component rows from catalog with existing active values or standard defaults
    const baseStructure =
      activeStructure || historyStructures.find((s) => s.components && s.components.length > 0);
    const rows: SalaryStructureComponent[] = catalogComponents.map((cat) => {
      const existing = baseStructure?.components?.find((c) => c.componentCode === cat.code);
      return {
        componentCode: cat.code,
        category: cat.category,
        calculationType: cat.calculationType,
        amount:
          existing?.amount !== undefined
            ? Number(existing.amount)
            : cat.code === 'BASIC'
              ? 25000
              : cat.code === 'SPECIAL_ALLOWANCE'
                ? 5000
                : 0,
        percentage:
          existing?.percentage !== undefined && existing.percentage !== null
            ? Number(existing.percentage)
            : cat.code === 'HRA'
              ? 40
              : undefined,
        percentageOf: cat.percentageOf || (cat.code === 'HRA' ? 'BASIC' : undefined),
        isActive: existing ? existing.isActive : true,
      };
    });

    setFormComponents(rows);
    setIsModalOpen(true);
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        payBasis,
        effectiveFrom,
        notes,
        components: formComponents
          .filter((c) => c.isActive)
          .map((c) => ({
            ...c,
            amount: Number(c.amount) || 0,
            percentage:
              c.percentage !== undefined && c.percentage !== null
                ? Number(c.percentage)
                : undefined,
          })),
      };

      if (activeStructure) {
        await SalaryStructureService.supersedeStructure(selectedEmployee.id, payload);
      } else {
        await SalaryStructureService.createStructure(selectedEmployee.id, payload);
      }

      setIsModalOpen(false);
      // Reload structure
      const updated = await SalaryStructureService.getActiveStructure(selectedEmployee.id);
      const updatedHist = await SalaryStructureService.getHistoricalStructures(selectedEmployee.id);
      const list = updatedHist || [];
      const resolved =
        updated && updated.components && updated.components.length > 0
          ? updated
          : list.find((s) => s.status === 'ACTIVE' && s.components && s.components.length > 0) ||
            list.find((s) => s.components && s.components.length > 0) ||
            updated ||
            list[0] ||
            null;
      setActiveStructure(resolved);
      setHistoryStructures(list);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save salary structure');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute live totals for active structure with string-to-number safe parsing
  const activeBasic =
    parseFloat(
      String(activeStructure?.components?.find((c) => c.componentCode === 'BASIC')?.amount || 0),
    ) || 0;
  const earningsSum =
    (activeStructure?.components || [])
      .filter((c) => c.category === 'EARNING' && c.isActive)
      .reduce((sum, c) => {
        if (c.calculationType === 'PERCENTAGE' && c.percentage) {
          return sum + (activeBasic * (parseFloat(String(c.percentage)) || 0)) / 100;
        }
        return sum + (parseFloat(String(c.amount)) || 0);
      }, 0) || 0;

  const deductionsSum =
    (activeStructure?.components || [])
      .filter((c) => c.category === 'DEDUCTION' && c.isActive)
      .reduce((sum, c) => {
        if (c.calculationType === 'STATUTORY_RULE') {
          return sum + Math.round(activeBasic * 0.12);
        }
        return sum + (parseFloat(String(c.amount)) || 0);
      }, 0) || 0;

  const netPayPreview = earningsSum - deductionsSum;

  // Live modal computations for real-time preview during revision
  const modalBasic =
    parseFloat(
      String(formComponents.find((c) => c.componentCode === 'BASIC' && c.isActive)?.amount || 0),
    ) || 0;
  const modalGross = formComponents
    .filter((c) => c.category === 'EARNING' && c.isActive)
    .reduce((sum, c) => {
      if (c.calculationType === 'PERCENTAGE' && c.percentage) {
        return sum + (modalBasic * (parseFloat(String(c.percentage)) || 0)) / 100;
      }
      return sum + (parseFloat(String(c.amount)) || 0);
    }, 0);

  const modalDeductions = formComponents
    .filter((c) => c.category === 'DEDUCTION' && c.isActive)
    .reduce((sum, c) => {
      if (c.calculationType === 'STATUTORY_RULE') {
        return sum + Math.round(modalBasic * 0.12);
      }
      return sum + (parseFloat(String(c.amount)) || 0);
    }, 0);

  const modalNet = modalGross - modalDeductions;

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
            Employee Salary Structures
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
            Assign contractual wage agreements, revise allowances, and track historical supersedes.
          </p>
        </div>

        {selectedEmployee && (
          <Button
            variant="primary"
            onClick={handleOpenRevise}
            style={{ backgroundColor: '#4f46e5' }}
          >
            <Plus size={16} />
            <span>
              {activeStructure ? 'Revise / Supersede Salary' : 'Assign Initial Structure'}
            </span>
          </Button>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '1.5rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Left Column: HR Employee Directory Selector */}
        <div
          className="card-base"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
            Employee Directory
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <Input
              placeholder="Search HR employee..."
              value={employeeQuery}
              onChange={(e) => {
                setEmployeeQuery(e.target.value);
                searchEmployees(e.target.value);
              }}
              style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            {isSearching ? (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: '#94a3b8',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                Searching employees...
              </div>
            ) : employees.length === 0 ? (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: '#94a3b8',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                No active HR employees found
              </div>
            ) : (
              employees.map((emp) => {
                const isSelected = selectedEmployee?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                      border: isSelected ? '1px solid #c7d2fe' : '1px solid transparent',
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#4f46e5' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {emp.firstName?.[0] || 'E'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: isSelected ? '#4f46e5' : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        {emp.employeeCode}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Salary Structure & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {selectedEmployee && (
            <>
              {/* Employee Summary Card */}
              <div
                className="card-base"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#eef2ff',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.125rem',
                      fontWeight: 700,
                    }}
                  >
                    {selectedEmployee.firstName?.[0]}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {selectedEmployee.employeeCode} • {selectedEmployee.email} •{' '}
                      {selectedEmployee.designation || 'Staff'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Contract Basis</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      {activeStructure?.payBasis || 'MONTHLY'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Structure Status</div>
                    <Badge status={activeStructure ? 'ACTIVE' : 'DRAFT'} />
                  </div>
                </div>
              </div>

              {/* Active Structure Breakdown */}
              <div
                className="card-base"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                      Active Salary Structure
                    </h3>
                    {activeStructure && (
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Effective from{' '}
                        {new Date(activeStructure.effectiveFrom).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        {activeStructure.notes && `• ${activeStructure.notes}`}
                      </p>
                    )}
                  </div>

                  {activeStructure && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Est. Gross: </span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(earningsSum)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Est. Net: </span>
                        <span style={{ fontWeight: 700, color: '#059669' }}>
                          {formatCurrency(netPayPreview)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {structureLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Loading salary structure...
                  </div>
                ) : !activeStructure ? (
                  <div
                    style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 600, color: '#334155' }}>
                      No active salary structure assigned
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Click below to assign an initial contractual wage agreement for this employee.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleOpenRevise}
                      style={{ marginTop: '1rem', backgroundColor: '#4f46e5' }}
                    >
                      Assign Salary Structure
                    </Button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            color: '#64748b',
                            fontSize: '0.6875rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <th style={{ padding: '0.5rem 0.5rem 0.5rem 0', textAlign: 'left' }}>
                            Component
                          </th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Calculation Rule</th>
                          <th style={{ padding: '0.5rem 0 0.5rem 0.5rem', textAlign: 'right' }}>
                            Assigned Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeStructure.components.map((comp, idx) => {
                          let computedAmount = parseFloat(String(comp.amount)) || 0;
                          let ruleDisplay = 'Fixed';

                          if (comp.calculationType === 'PERCENTAGE') {
                            const pct =
                              comp.percentage !== null && comp.percentage !== undefined
                                ? parseFloat(String(comp.percentage))
                                : 0;
                            computedAmount = (activeBasic * pct) / 100;
                            ruleDisplay = pct > 0 ? `${pct}% of Basic` : 'Percentage of Basic';
                          } else if (comp.calculationType === 'STATUTORY_RULE') {
                            if (comp.componentCode === 'PF') {
                              computedAmount = Math.round(activeBasic * 0.12);
                              ruleDisplay = 'Statutory Slabs (12% PF)';
                            } else {
                              computedAmount =
                                parseFloat(String(comp.amount)) || Math.round(activeBasic * 0.12);
                              ruleDisplay = 'Statutory Slabs';
                            }
                          } else {
                            computedAmount = parseFloat(String(comp.amount)) || 0;
                            ruleDisplay = 'Fixed';
                          }

                          const isDeduction = comp.category === 'DEDUCTION';

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td
                                style={{
                                  padding: '0.625rem 0.5rem 0.625rem 0',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                }}
                              >
                                {comp.componentCode.replace(/_/g, ' ')}
                              </td>
                              <td style={{ padding: '0.625rem 0.5rem' }}>
                                <Badge
                                  variant={
                                    comp.category === 'EARNING'
                                      ? 'success'
                                      : comp.category === 'DEDUCTION'
                                        ? 'danger'
                                        : 'purple'
                                  }
                                >
                                  {comp.category}
                                </Badge>
                              </td>
                              <td style={{ padding: '0.625rem 0.5rem', color: '#64748b' }}>
                                {ruleDisplay}
                              </td>
                              <td
                                style={{
                                  padding: '0.625rem 0 0.625rem 0.5rem',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: isDeduction ? '#dc2626' : '#0f172a',
                                }}
                              >
                                {isDeduction && computedAmount > 0
                                  ? `- ${formatCurrency(computedAmount)}`
                                  : formatCurrency(computedAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Historical Revisions */}
              {historyStructures.length > 0 && (
                <div
                  className="card-base"
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <History size={16} color="#64748b" />
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
                      Historical Revisions ({historyStructures.length})
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {historyStructures.map((hist) => {
                      const isSelected = activeStructure?.id === hist.id;
                      return (
                        <div
                          key={hist.id}
                          onClick={() => setActiveStructure(hist)}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: isSelected
                              ? 'hsl(var(--color-brand-accent-subtle))'
                              : '#f8fafc',
                            border: isSelected
                              ? '1px solid hsl(var(--color-brand-accent))'
                              : '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: isSelected ? 'hsl(var(--color-brand-accent))' : '#0f172a',
                              }}
                            >
                              Effective From:{' '}
                              {new Date(hist.effectiveFrom).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {hist.notes || 'Previous Revision'}
                            </div>
                          </div>
                          <Badge status={hist.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Revise / Supersede Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          activeStructure
            ? 'Revise / Supersede Salary Structure'
            : 'Assign Initial Salary Structure'
        }
      >
        <form
          onSubmit={handleSaveStructure}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Superseding creates a new effective-dated structure and marks the existing structure as
            REVISED on the previous day.
          </p>

          {modalError && (
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'hsl(var(--color-danger-bg))',
                border: '1px solid hsl(var(--color-danger) / 0.3)',
                color: 'hsl(var(--color-danger))',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              {modalError}
            </div>
          )}

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
                Pay Basis
              </label>
              <select
                value={payBasis}
                onChange={(e) => setPayBasis(e.target.value as PayBasis)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="MONTHLY">MONTHLY (Fixed monthly wage)</option>
                <option value="DAILY">DAILY (Per-day attendance wage)</option>
                <option value="HOURLY">HOURLY (Gig / Hourly rate)</option>
              </select>
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
                Effective From Date
              </label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
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
              Notes / Revision Justification
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Annual Promotion & Appraisal FY 2026-27"
            />
          </div>

          {/* Dynamic Component Rows */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                Component Breakdown & Wage Rates
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Est. Gross:{' '}
                <strong style={{ color: '#0f172a' }}>{formatCurrency(modalGross)}</strong> • Est.
                Net: <strong style={{ color: '#059669' }}>{formatCurrency(modalNet)}</strong>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}
            >
              {formComponents.map((row, idx) => {
                const isPercentage = row.calculationType === 'PERCENTAGE';
                const isStatutory = row.calculationType === 'STATUTORY_RULE';
                const pct = isPercentage ? parseFloat(String(row.percentage)) || 0 : 0;
                const computedPctAmount = (modalBasic * pct) / 100;
                const computedStatutoryAmount = Math.round(modalBasic * 0.12);

                return (
                  <div
                    key={row.componentCode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--radius-md)',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '160px',
                        flexShrink: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => {
                          const copy = [...formComponents];
                          const target = copy[idx];
                          if (target) {
                            target.isActive = e.target.checked;
                            setFormComponents(copy);
                          }
                        }}
                      />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        {row.componentCode.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                      }}
                    >
                      {isPercentage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Input
                              type="number"
                              style={{
                                width: '70px',
                                padding: '0.35rem 0.5rem',
                                fontSize: '0.8125rem',
                              }}
                              value={
                                row.percentage !== undefined && row.percentage !== null
                                  ? row.percentage
                                  : 0
                              }
                              onChange={(e) => {
                                const copy = [...formComponents];
                                const target = copy[idx];
                                if (target) {
                                  target.percentage = parseFloat(e.target.value) || 0;
                                  setFormComponents(copy);
                                }
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>%</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#4f46e5',
                              minWidth: '70px',
                              textAlign: 'right',
                            }}
                          >
                            ≈ {formatCurrency(computedPctAmount)}
                          </span>
                        </div>
                      ) : isStatutory ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            Automated (12% of Basic)
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#dc2626',
                              minWidth: '70px',
                              textAlign: 'right',
                            }}
                          >
                            ≈ -{formatCurrency(computedStatutoryAmount)}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>₹</span>
                          <Input
                            type="number"
                            style={{
                              width: '110px',
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8125rem',
                            }}
                            value={row.amount || 0}
                            onChange={(e) => {
                              const copy = [...formComponents];
                              const target = copy[idx];
                              if (target) {
                                target.amount = parseFloat(e.target.value) || 0;
                                setFormComponents(copy);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              style={{ backgroundColor: '#4f46e5' }}
            >
              Save Structure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
