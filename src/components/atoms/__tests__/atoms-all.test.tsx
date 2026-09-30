import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from '../select';
import { StatCard } from '../stat-card';
import { Stepper } from '../stepper';
import { Badge, getStatusBadgeVariant } from '../badge';

describe('Atoms UI Primitives Comprehensive Suite', () => {
  describe('Select Atom', () => {
    it('renders with label, options, and error state', () => {
      const options = [
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'DAILY', label: 'Daily' },
      ];

      render(
        <Select
          label="Pay Basis"
          options={options}
          error="Field is required"
          defaultValue="MONTHLY"
        />,
      );

      expect(screen.getByLabelText('Pay Basis')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });
  });

  describe('StatCard Atom', () => {
    it('renders title, value, subtext, and trends for all themes', () => {
      const { rerender } = render(
        <StatCard
          title="Total Gross"
          value="₹1,50,000"
          icon={<span data-testid="icon">ICON</span>}
          theme="green"
          trend={{ value: '+12%', isPositive: true, label: 'vs last month' }}
          subtext="Processed"
        />,
      );

      expect(screen.getByText('Total Gross')).toBeInTheDocument();
      expect(screen.getByText('₹1,50,000')).toBeInTheDocument();
      expect(screen.getByText('+12%')).toBeInTheDocument();
      expect(screen.getByText('vs last month')).toBeInTheDocument();

      // Test negative trend with cyan theme
      rerender(
        <StatCard
          title="Total Deductions"
          value="₹10,000"
          icon={<span data-testid="icon">ICON</span>}
          theme="cyan"
          trend={{ value: '-5%', isPositive: false }}
        />,
      );
      expect(screen.getByText('Total Deductions')).toBeInTheDocument();
      expect(screen.getByText('-5%')).toBeInTheDocument();

      // Test subtext without trend
      rerender(
        <StatCard
          title="Net Pay"
          value="₹1,40,000"
          icon={<span data-testid="icon">ICON</span>}
          theme="purple"
          subtext="Processed"
        />,
      );
      expect(screen.getByText('Net Pay')).toBeInTheDocument();
      expect(screen.getByText('Processed')).toBeInTheDocument();
    });
  });

  describe('Stepper Atom', () => {
    it('renders active, completed, and pending steps correctly', () => {
      const { rerender } = render(
        <Stepper
          currentStatus="CALCULATED"
          createdAt="2026-09-01T00:00:00Z"
          processedAt="2026-09-02T00:00:00Z"
        />,
      );

      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Calculated')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Finalized')).toBeInTheDocument();

      rerender(<Stepper currentStatus="FINALIZED" />);
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });
  });

  describe('Badge status variant resolution', () => {
    it('resolves correct badge variant based on status string', () => {
      expect(getStatusBadgeVariant('FINALIZED')).toBe('success');
      expect(getStatusBadgeVariant('APPROVED')).toBe('success');
      expect(getStatusBadgeVariant('CALCULATED')).toBe('info');
      expect(getStatusBadgeVariant('DRAFT')).toBe('warning');
      expect(getStatusBadgeVariant('CANCELLED')).toBe('danger');
      expect(getStatusBadgeVariant('UNKNOWN')).toBe('default');

      render(<Badge status="FINALIZED">Finalized</Badge>);
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });
  });
});
