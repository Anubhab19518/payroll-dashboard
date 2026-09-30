'use client';

import { useState, useEffect, useCallback } from 'react';
import { Printer, Download, Search, FileText } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { EmployeeLookupService } from '@/features/employees/services/employee-lookup.service';
import { PayslipService } from '@/features/payroll/services/payslip.service';
import { SalaryStructureService } from '@/features/payroll/services/salary-structure.service';
import { evaluatePayslipWithStructure } from '@/features/payroll/utils/payroll-calculator';
import type { Payslip, EmployeeSummary } from '@/types/payroll';
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

export default function AdminPayslipsPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Load employees list
  const searchEmployees = useCallback(
    async (q: string = '') => {
      try {
        const results = await EmployeeLookupService.searchEmployees(q);
        setEmployees(results || []);
        if (results && results.length > 0 && !selectedEmployee) {
          setSelectedEmployee(results[0] || null);
        }
      } catch (err) {
        console.warn('Failed to load employees for payslips:', err);
      }
    },
    [selectedEmployee],
  );

  useEffect(() => {
    searchEmployees();
  }, [searchEmployees]);

  // Load payslips and evaluate dynamic salary structure for selected employee
  useEffect(() => {
    if (!selectedEmployee) return;

    Promise.all([
      PayslipService.getEmployeePayslips(selectedEmployee.id, selectedYear).catch(() => []),
      SalaryStructureService.getActiveStructure(selectedEmployee.id)
        .catch(() => null)
        .then(async (act) => {
          if (act && act.components && act.components.length > 0) return act;
          const hist = await SalaryStructureService.getHistoricalStructures(
            selectedEmployee.id,
          ).catch(() => []);
          return hist.find((s) => s.components && s.components.length > 0) || null;
        }),
    ])
      .then(([payslipsList, struct]) => {
        if (payslipsList && payslipsList.length > 0) {
          const rawPayslip = payslipsList[0]!;
          const daysInPeriod = new Date(
            rawPayslip.periodYear || selectedYear,
            rawPayslip.periodMonth || 9,
            0,
          ).getDate();
          const evaluated = evaluatePayslipWithStructure(rawPayslip, struct, daysInPeriod);
          setSelectedPayslip(evaluated);
        } else if (struct && struct.components && struct.components.length > 0) {
          // Construct fallback/preview payslip for active employee structure
          const daysInPeriod = new Date(selectedYear, 9, 0).getDate();
          const evaluated = evaluatePayslipWithStructure(
            {
              id: `preview-${selectedEmployee.id}`,
              periodYear: selectedYear,
              periodMonth: 9,
              payableDays: daysInPeriod,
              employee: {
                firstName: selectedEmployee.firstName,
                lastName: selectedEmployee.lastName,
                employeeCode: selectedEmployee.employeeCode,
                email: selectedEmployee.email,
              },
            },
            struct,
            daysInPeriod,
          );
          setSelectedPayslip(evaluated);
        } else {
          setSelectedPayslip(null);
        }
      })
      .catch((err) => {
        console.warn('Failed to load payslip:', err);
      });
  }, [selectedEmployee, selectedYear]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        className="no-print"
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
            Employee Payslips Viewer
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
            Inspect finalized pay slips, verify statutory breakdowns, and export payslip PDFs.
          </p>
        </div>

        {selectedPayslip && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} />
              <span>Print</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => window.print()}
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '1.5rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Left: Employee and Period Picker */}
        <div
          className="card-base no-print"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>
            Select Employee
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
              maxHeight: '380px',
              overflowY: 'auto',
            }}
          >
            {employees.map((emp) => {
              const isSelected = selectedEmployee?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.625rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                    border: isSelected ? '1px solid #c7d2fe' : '1px solid transparent',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#4f46e5' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {emp.firstName?.[0]}
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
            })}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
            <label
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#334155',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '0.45rem 0.625rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #cbd5e1',
                fontSize: '0.8125rem',
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        {/* Right: Realistic Printable Payslip Sheet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedPayslip ? (
            <div
              id="payslip-print-area"
              className="card-base"
              style={{
                padding: '2.5rem',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.75rem',
                border: '1px solid #cbd5e1',
              }}
            >
              {/* Company Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '1.25rem',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '1.375rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {selectedPayslip.companySnapshot?.name || 'Urgent Manpower Services Ltd'}
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {selectedPayslip.companySnapshot?.address ||
                      'HQ Tech Park, Sector V, Bidhannagar, Kolkata - 700091'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    CIN: U74999WB2020PTC239841 • PAN: AABCU1234F
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#eef2ff',
                      color: '#4f46e5',
                      padding: '0.35rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                    }}
                  >
                    PAYSLIP
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginTop: '0.35rem',
                    }}
                  >
                    {MONTH_NAMES[selectedPayslip.periodMonth - 1]} {selectedPayslip.periodYear}
                  </div>
                </div>
              </div>

              {/* Employee Summary 2-Column Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  backgroundColor: '#f8fafc',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Employee Name: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Employee Code: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedEmployee?.employeeCode}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Designation: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedEmployee?.designation || 'Staff'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Payable Days: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedPayslip.payableDays}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Bank Account: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>XXXX-XXXX-8910</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>UAN / PF No: </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>101928374652</span>
                  </div>
                </div>
              </div>

              {/* Earnings vs Deductions Dual-Column Table */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                }}
              >
                {/* Left: Earnings */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#f1f5f9',
                      padding: '0.625rem 0.875rem',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: '#0f172a',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    Earnings
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {selectedPayslip.earningsJson?.map((e, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.875rem',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <span style={{ color: '#334155' }}>{e.name}</span>
                        <span
                          className="tabular-nums"
                          style={{ fontWeight: 600, color: '#0f172a' }}
                        >
                          {formatCurrency(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem',
                      backgroundColor: '#f8fafc',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: '#0f172a',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <span>Total Gross Earnings</span>
                    <span>{formatCurrency(selectedPayslip.grossEarnings)}</span>
                  </div>
                </div>

                {/* Right: Deductions */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#f1f5f9',
                      padding: '0.625rem 0.875rem',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: '#0f172a',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    Deductions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {selectedPayslip.deductionsJson?.map((d, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.875rem',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <span style={{ color: '#334155' }}>{d.name}</span>
                        <span
                          className="tabular-nums"
                          style={{ fontWeight: 600, color: '#dc2626' }}
                        >
                          {formatCurrency(d.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem',
                      backgroundColor: '#f8fafc',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: '#dc2626',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <span>Total Deductions</span>
                    <span>{formatCurrency(selectedPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#065f46',
                      textTransform: 'uppercase',
                    }}
                  >
                    Net Salary Payable
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#047857', marginTop: '0.1rem' }}>
                    Direct Bank Transfer via NEFT / RTGS
                  </div>
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#065f46',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatCurrency(selectedPayslip.netPay)}
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.6875rem',
                  color: '#94a3b8',
                  textAlign: 'center',
                  marginTop: '1rem',
                }}
              >
                This is a computer-generated document and does not require a physical signature.
              </div>
            </div>
          ) : (
            <div
              className="card-base"
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                color: '#64748b',
              }}
            >
              <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: '#334155' }}>
                No finalized payslip for selected period
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                Payslips are generated and published once the monthly payroll run is Finalized.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
