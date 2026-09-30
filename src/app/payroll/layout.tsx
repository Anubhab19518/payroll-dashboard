import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PayrollLayoutTemplate } from '@/components/templates/payroll-layout-template';

export const metadata: Metadata = {
  title: 'Payroll Control Center',
  description: 'Manage multi-tenant payroll runs, salary structures, components, and compliance.',
};

export default function PayrollLayout({ children }: { children: ReactNode }) {
  return <PayrollLayoutTemplate>{children}</PayrollLayoutTemplate>;
}
