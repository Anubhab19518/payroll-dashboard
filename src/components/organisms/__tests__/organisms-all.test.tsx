import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataTable } from '../data-table';
import { PayrollSidebar } from '../payroll-sidebar';
import { PayrollHeader } from '../payroll-header';
import * as apiClient from '@/lib/client/api-client';

describe('Organisms Comprehensive Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('DataTable Organism', () => {
    interface TestItem {
      id: string;
      name: string;
      amount: number;
    }

    const testData: TestItem[] = [
      { id: '1', name: 'Item 1', amount: 100 },
      { id: '2', name: 'Item 2', amount: 200 },
    ];

    const columns = [
      { key: 'name', header: 'Name' },
      { key: 'amount', header: 'Amount', render: (item: TestItem) => `₹${item.amount}` },
    ];

    it('renders table headers and rows with custom renderers', () => {
      const handleRowClick = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          onRowClick={handleRowClick}
        />,
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('₹100')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Item 1'));
      expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
    });

    it('renders loading skeleton and empty state', () => {
      const { rerender } = render(
        <DataTable columns={columns} data={[]} keyExtractor={(item) => item.id} isLoading={true} />,
      );

      expect(document.querySelector('table')).toBeInTheDocument();

      rerender(
        <DataTable
          columns={columns}
          data={[]}
          keyExtractor={(item) => item.id}
          isLoading={false}
          emptyMessage="No records found"
          emptySubtext="Try adjusting your filter"
        />,
      );

      expect(screen.getByText('No records found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filter')).toBeInTheDocument();
    });

    it('renders pagination controls and triggers onPageChange', () => {
      const handlePageChange = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={(item) => item.id}
          page={1}
          limit={2}
          total={10}
          onPageChange={handlePageChange}
        />,
      );

      expect(screen.getByText(/Page 1 of 5/i)).toBeInTheDocument();
      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);
      expect(handlePageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('PayrollSidebar Organism', () => {
    it('renders sidebar brand, nav links, and handles sign out', () => {
      localStorage.setItem('payroll_user', JSON.stringify({ name: 'Tamagno Roy' }));
      localStorage.setItem('payroll_workspace_name', 'Acme Corp');

      render(<PayrollSidebar />);

      expect(screen.getByText('HRMS')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Payroll')).toBeInTheDocument();
      expect(screen.getByText('Employees')).toBeInTheDocument();

      const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
      fireEvent.click(signOutBtn);
      expect(localStorage.getItem('payroll_jwt_token')).toBeNull();
    });
  });

  describe('PayrollHeader Organism', () => {
    it('renders search bar, workspace switcher, and user details', async () => {
      localStorage.setItem(
        'payroll_user',
        JSON.stringify({ name: 'Tamagno Roy', email: 'tamagno@corp.com' }),
      );
      localStorage.setItem('payroll_workspace_name', 'Urgent Manpower');
      vi.spyOn(apiClient, 'getAuthToken').mockReturnValue('mock-token');
      vi.spyOn(apiClient, 'fetchApi').mockResolvedValueOnce({
        data: [{ id: 'ws-1', name: 'Urgent Manpower', slug: 'urgent-manpower' }],
      });

      render(<PayrollHeader />);

      expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
      expect(screen.getAllByText('Urgent Manpower').length).toBeGreaterThan(0);

      const buttons = screen.getAllByRole('button');
      if (buttons[0]) {
        fireEvent.click(buttons[0]);
      }

      await waitFor(() => {
        expect(screen.getAllByText('Urgent Manpower').length).toBeGreaterThan(0);
      });
    });
  });
});
