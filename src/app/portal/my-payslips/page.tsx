'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { PayslipService } from '@/features/payroll/services/payslip.service';
import type { Payslip } from '@/types/payroll';
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

export default function MyPayslipsPortalPage() {
  const [year, setYear] = useState(2026);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const fetchMyPayslips = useCallback(async () => {
    try {
      const data = await PayslipService.getMyPayslips(year);
      if (data && data.length > 0) {
        setSelectedPayslip(data[0] || null);
      } else {
        setSelectedPayslip(null);
      }
    } catch (err) {
      console.warn('Failed to load self-service payslips:', err);
    }
  }, [year]);

  useEffect(() => {
    fetchMyPayslips();
  }, [fetchMyPayslips]);

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            My Payslips & Tax Statements
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Employee Self-Service: View and download your monthly salary slips.
          </p>
        </div>

        {selectedPayslip && (
          <Button
            variant="primary"
            onClick={() => window.print()}
            style={{ backgroundColor: '#4f46e5' }}
          >
            <Download size={15} />
            <span>Download PDF</span>
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Year:</span>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff',
          }}
        >
          <option value={2026}>2026</option>
          <option value={2025}>2025</option>
        </select>
      </div>

      {selectedPayslip ? (
        <div
          className="card-base"
          style={{
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            border: '1px solid #cbd5e1',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedPayslip.companySnapshot?.name || 'Urgent Manpower Services Ltd'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                HQ Tech Park, Sector V, Kolkata
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#4f46e5' }}>
                {MONTH_NAMES[selectedPayslip.periodMonth - 1]} {selectedPayslip.periodYear}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Payable Days: {selectedPayslip.payableDays}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.625rem 0.875rem',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                }}
              >
                Earnings
              </div>
              {selectedPayslip.earningsJson?.map((e, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8125rem',
                    borderBottom: '1px solid #f8fafc',
                  }}
                >
                  <span>{e.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(e.amount)}</span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  backgroundColor: '#f8fafc',
                  fontWeight: 700,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <span>Gross Total</span>
                <span>{formatCurrency(selectedPayslip.grossEarnings)}</span>
              </div>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.625rem 0.875rem',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                }}
              >
                Deductions
              </div>
              {selectedPayslip.deductionsJson?.map((d, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8125rem',
                    borderBottom: '1px solid #f8fafc',
                  }}
                >
                  <span>{d.name}</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>
                    {formatCurrency(d.amount)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  backgroundColor: '#f8fafc',
                  fontWeight: 700,
                  color: '#dc2626',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <span>Total Deductions</span>
                <span>{formatCurrency(selectedPayslip.totalDeductions)}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#ecfdf5',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 700, color: '#065f46' }}>Net Take-Home Salary</span>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#065f46' }}>
              {formatCurrency(selectedPayslip.netPay)}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="card-base"
          style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}
        >
          <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <div>No payslips available for this year.</div>
        </div>
      )}
    </div>
  );
}
