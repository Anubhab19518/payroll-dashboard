'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import {
  PayrollConfigService,
  type UpdatePayrollConfigInput,
} from '@/features/payroll/services/payroll-config.service';
import type { LopCalculationBasis } from '@/types/payroll';

export default function PayrollConfigurationPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdatePayrollConfigInput>({
    lopCalculationBasis: 'CALENDAR_DAYS',
    customLopDivisor: null,
    overtimeCalculationBasis: 'PER_HOUR',
    defaultOvertimeMultiplier: 1.5,
    roundOffNetPay: true,
    payCycleStartDay: 1,
  });

  const fetchConfig = useCallback(async () => {
    try {
      const data = await PayrollConfigService.getConfig();
      setFormData({
        lopCalculationBasis: data.lopCalculationBasis || 'CALENDAR_DAYS',
        customLopDivisor: data.customLopDivisor,
        overtimeCalculationBasis: data.overtimeCalculationBasis || 'PER_HOUR',
        defaultOvertimeMultiplier: data.defaultOvertimeMultiplier || 1.5,
        roundOffNetPay: data.roundOffNetPay !== undefined ? data.roundOffNetPay : true,
        payCycleStartDay: data.payCycleStartDay || 1,
      });
    } catch (err) {
      console.warn('Failed to load payroll configuration:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await PayrollConfigService.updateConfig(formData);
      setSuccessMessage('Payroll configuration saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          Payroll Policy Configuration
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
          Configure company-wide Loss of Pay (LOP), overtime multipliers, rounding, and pay cycle
          dates.
        </p>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration Form Card */}
      <div className="card-base" style={{ padding: '1.75rem' }}>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Section: LOP Settings */}
          <div>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '0.25rem',
              }}
            >
              Loss of Pay (LOP) & Proration Divisor
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
              Determines how daily wage is derived for leave deductions: Daily Basic = Monthly Basic
              ÷ Divisor.
            </p>

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
                  LOP Calculation Basis
                </label>
                <select
                  value={formData.lopCalculationBasis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lopCalculationBasis: e.target.value as LopCalculationBasis,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="CALENDAR_DAYS">CALENDAR_DAYS (28, 29, 30, or 31 days)</option>
                  <option value="FIXED_26">
                    FIXED_26 (Standard Indian industrial 26-day basis)
                  </option>
                  <option value="WORKING_DAYS">
                    WORKING_DAYS (Roster days excluding holidays)
                  </option>
                  <option value="CUSTOM_DAYS">CUSTOM_DAYS (Fixed custom divisor)</option>
                </select>
              </div>

              {formData.lopCalculationBasis === 'CUSTOM_DAYS' && (
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
                    Custom Divisor (Days)
                  </label>
                  <Input
                    type="number"
                    value={formData.customLopDivisor || 30}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customLopDivisor: parseInt(e.target.value, 10),
                      })
                    }
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* Section: Overtime Settings */}
          <div>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '0.25rem',
              }}
            >
              Overtime (OT) Multiplier & Calculation
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
              Formula: OT Pay = Hours Worked × (Monthly Basic ÷ 208) × Multiplier.
            </p>

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
                  Default Overtime Multiplier
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.defaultOvertimeMultiplier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultOvertimeMultiplier: parseFloat(e.target.value) || 1.5,
                    })
                  }
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
                  Overtime Calculation Basis
                </label>
                <Input
                  value={formData.overtimeCalculationBasis || 'PER_HOUR'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overtimeCalculationBasis: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9' }} />

          {/* Section: Cycle & Rounding */}
          <div>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '0.25rem',
              }}
            >
              Pay Cycle & Disbursal Rules
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1rem',
              }}
            >
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
                  Pay Cycle Start Day
                </label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={formData.payCycleStartDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payCycleStartDay: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Day 1 starts cycle from 1st to last day of the calendar month.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.roundOffNetPay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roundOffNetPay: e.target.checked,
                      })
                    }
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                      Round Off Net Pay
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Rounds net salary payout to nearest whole rupee.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1rem',
            }}
          >
            <Button
              variant="primary"
              type="submit"
              isLoading={isSaving}
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Save size={16} />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
