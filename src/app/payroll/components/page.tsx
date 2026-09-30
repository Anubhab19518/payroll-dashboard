'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles, Check, X, Edit2 } from 'lucide-react';
import { Tabs } from '@/components/molecules/tabs';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Modal } from '@/components/molecules/modal';
import { DataTable, type Column } from '@/components/organisms/data-table';
import {
  PayrollComponentService,
  type CreateSalaryComponentInput,
} from '@/features/payroll/services/payroll-component.service';
import type { SalaryComponent, SalaryComponentCategory, CalculationType } from '@/types/payroll';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Components' },
  { id: 'EARNING', label: 'Earnings' },
  { id: 'DEDUCTION', label: 'Deductions' },
  { id: 'EMPLOYER_CONTRIBUTION', label: 'Employer Contributions' },
];

export default function SalaryComponentsPage() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [isSeeding, setIsSeeding] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [formData, setFormData] = useState<CreateSalaryComponentInput>({
    code: '',
    name: '',
    category: 'EARNING',
    calculationType: 'FIXED_AMOUNT',
    percentageOf: null,
    isTaxable: true,
    isPfApplicable: true,
    isEsiApplicable: true,
    isEnabled: true,
    sortOrder: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComponents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await PayrollComponentService.listComponents();
      setComponents(data || []);
    } catch (err) {
      console.warn('Failed to load components:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleSeedStandard = async () => {
    setIsSeeding(true);
    try {
      const seeded = await PayrollComponentService.seedStandardComponents();
      setComponents(seeded || []);
      alert('Standard Indian salary components seeded successfully!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to seed standard components');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingComponent(null);
    setFormData({
      code: '',
      name: '',
      category: 'EARNING',
      calculationType: 'FIXED_AMOUNT',
      percentageOf: null,
      isTaxable: true,
      isPfApplicable: true,
      isEsiApplicable: true,
      isEnabled: true,
      sortOrder: components.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp: SalaryComponent) => {
    setEditingComponent(comp);
    setFormData({
      code: comp.code,
      name: comp.name,
      category: comp.category,
      calculationType: comp.calculationType,
      percentageOf: comp.percentageOf || null,
      isTaxable: comp.isTaxable,
      isPfApplicable: comp.isPfApplicable,
      isEsiApplicable: comp.isEsiApplicable,
      isEnabled: comp.isEnabled,
      sortOrder: comp.sortOrder || 1,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (comp: SalaryComponent) => {
    try {
      const updated = await PayrollComponentService.updateComponent(comp.id, {
        isEnabled: !comp.isEnabled,
      });
      setComponents(components.map((c) => (c.id === comp.id ? updated : c)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update component status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingComponent) {
        const updated = await PayrollComponentService.updateComponent(
          editingComponent.id,
          formData,
        );
        setComponents(components.map((c) => (c.id === editingComponent.id ? updated : c)));
      } else {
        const created = await PayrollComponentService.createComponent(formData);
        setComponents([...components, created]);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save component');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComponents = components.filter((comp) => {
    if (activeTab === 'ALL') return true;
    return comp.category === activeTab;
  });

  const columns: Column<SalaryComponent>[] = [
    {
      key: 'name',
      header: 'Component Name',
      render: (comp) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{comp.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {comp.code}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (comp) => {
        let variant: 'success' | 'danger' | 'purple' = 'purple';
        if (comp.category === 'EARNING') variant = 'success';
        if (comp.category === 'DEDUCTION') variant = 'danger';
        return <Badge variant={variant}>{comp.category.replace('_', ' ')}</Badge>;
      },
    },
    {
      key: 'calculationType',
      header: 'Calculation Type',
      render: (comp) => (
        <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>
          {comp.calculationType.replace('_', ' ')}
          {comp.percentageOf && ` of ${comp.percentageOf}`}
        </span>
      ),
    },
    {
      key: 'isTaxable',
      header: 'Taxable',
      align: 'center',
      render: (comp) =>
        comp.isTaxable ? <Check size={16} color="#059669" /> : <X size={16} color="#94a3b8" />,
    },
    {
      key: 'isPfApplicable',
      header: 'PF Basis',
      align: 'center',
      render: (comp) =>
        comp.isPfApplicable ? <Check size={16} color="#059669" /> : <X size={16} color="#94a3b8" />,
    },
    {
      key: 'isEsiApplicable',
      header: 'ESI Basis',
      align: 'center',
      render: (comp) =>
        comp.isEsiApplicable ? (
          <Check size={16} color="#059669" />
        ) : (
          <X size={16} color="#94a3b8" />
        ),
    },
    {
      key: 'isEnabled',
      header: 'Status',
      align: 'center',
      render: (comp) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStatus(comp);
          }}
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            border: comp.isEnabled ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
            backgroundColor: comp.isEnabled ? '#ecfdf5' : '#f1f5f9',
            color: comp.isEnabled ? '#059669' : '#64748b',
          }}
        >
          {comp.isEnabled ? 'ENABLED' : 'DISABLED'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (comp) => (
        <button
          onClick={() => handleOpenEdit(comp)}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Edit2 size={12} />
          <span>Edit</span>
        </button>
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
            Salary Components Catalog
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.15rem' }}>
            Define company-wide earnings, deductions, and statutory contribution rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={handleSeedStandard} isLoading={isSeeding}>
            <Sparkles size={15} color="#4f46e5" />
            <span>Seed Standard Indian Components</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleOpenCreate}
            style={{ backgroundColor: '#4f46e5' }}
          >
            <Plus size={16} />
            <span>Add Component</span>
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <Tabs
        tabs={CATEGORY_TABS.map((t) => ({
          ...t,
          count:
            t.id === 'ALL'
              ? components.length
              : components.filter((c) => c.category === t.id).length,
        }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Components Table */}
      <DataTable
        columns={columns}
        data={filteredComponents}
        keyExtractor={(comp) => comp.id}
        isLoading={isLoading}
        emptyMessage="No salary components found"
        emptySubtext="Click 'Seed Standard Indian Components' or 'Add Component' to set up catalog."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingComponent ? 'Edit Salary Component' : 'Create Custom Salary Component'}
      >
        <form
          onSubmit={handleSubmit}
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
                Component Code
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MEAL_ALLOWANCE"
                disabled={!!editingComponent}
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
                Display Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Meal Allowance"
                required
              />
            </div>
          </div>

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
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as SalaryComponentCategory,
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="EARNING">Earning (Additive to Gross)</option>
                <option value="DEDUCTION">Deduction (Subtractive from Net)</option>
                <option value="EMPLOYER_CONTRIBUTION">Employer Contribution (CTC only)</option>
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
                Calculation Type
              </label>
              <select
                value={formData.calculationType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    calculationType: e.target.value as CalculationType,
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="FIXED_AMOUNT">Fixed Monthly Amount</option>
                <option value="PERCENTAGE">Percentage of Another Component</option>
                <option value="PER_DAY">Per Day Multiplier</option>
                <option value="PER_HOUR">Per Hour Multiplier</option>
                <option value="MULTIPLIER">Multiplier (e.g. OT Rate)</option>
                <option value="STATUTORY_RULE">Statutory Engine (EPF/ESIC/PT)</option>
              </select>
            </div>
          </div>

          {formData.calculationType === 'PERCENTAGE' && (
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
                Percentage Of (Component Code)
              </label>
              <Input
                value={formData.percentageOf || ''}
                onChange={(e) =>
                  setFormData({ ...formData, percentageOf: e.target.value.toUpperCase() })
                }
                placeholder="e.g. BASIC"
                required
              />
            </div>
          )}

          {/* Statutory Flags */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                color: '#334155',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isTaxable}
                onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
              />
              <span>Is Taxable</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                color: '#334155',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isPfApplicable}
                onChange={(e) => setFormData({ ...formData, isPfApplicable: e.target.checked })}
              />
              <span>Include in PF Wage Basis</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                color: '#334155',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isEsiApplicable}
                onChange={(e) => setFormData({ ...formData, isEsiApplicable: e.target.checked })}
              />
              <span>Include in ESI Gross Basis</span>
            </label>
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
              {editingComponent ? 'Save Changes' : 'Create Component'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
