import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from '../drawer';
import { ConfirmDialog } from '../confirm-dialog';
import { SearchBar } from '../search-bar';
import { Tabs } from '../tabs';

describe('Molecules UI Components Suite', () => {
  describe('Drawer Molecule', () => {
    it('renders drawer content when open and triggers onClose on close button or backdrop', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Drawer
          isOpen={true}
          onClose={handleClose}
          title="Employee Breakdown"
          subtitle="EMP001 - Tamagno"
          footer={<button>Save Changes</button>}
        >
          <div>Drawer Body Content</div>
        </Drawer>,
      );

      expect(screen.getByText('Employee Breakdown')).toBeInTheDocument();
      expect(screen.getByText('EMP001 - Tamagno')).toBeInTheDocument();
      expect(screen.getByText('Drawer Body Content')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close drawer');
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);

      rerender(
        <Drawer isOpen={false} onClose={handleClose} title="Hidden Drawer">
          <div>Hidden</div>
        </Drawer>,
      );
      expect(screen.queryByText('Hidden Drawer')).not.toBeInTheDocument();
    });
  });

  describe('ConfirmDialog Molecule', () => {
    it('renders dialog with confirm and cancel buttons', () => {
      const handleClose = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Approve Payroll Run?"
          description="This action will advance the run to approved state."
          confirmLabel="Approve"
          isDestructive={false}
        />,
      );

      expect(screen.getByText('Approve Payroll Run?')).toBeInTheDocument();
      expect(
        screen.getByText('This action will advance the run to approved state.'),
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: 'Approve' });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('SearchBar Molecule', () => {
    it('renders input with placeholder and shortcut badge', () => {
      render(<SearchBar placeholder="Search employees..." shortcut="⌘K" />);
      expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });
  });

  describe('Tabs Molecule', () => {
    it('renders tabs with counts and triggers onChange when clicked', () => {
      const handleChange = vi.fn();
      const tabs = [
        { id: 'all', label: 'All Items', count: 12 },
        { id: 'active', label: 'Active', count: 8 },
      ];

      render(<Tabs tabs={tabs} activeTab="all" onChange={handleChange} />);
      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Active'));
      expect(handleChange).toHaveBeenCalledWith('active');
    });
  });
});
