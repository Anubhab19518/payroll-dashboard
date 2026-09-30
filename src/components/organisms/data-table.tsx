'use client';

import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptySubtext?: string;
  page?: number;
  limit?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No data available',
  emptySubtext,
  page,
  limit,
  total,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = total && limit ? Math.ceil(total / limit) : 1;

  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border-subtle))',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        width: '100%',
      }}
    >
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'hsl(var(--bg-secondary))',
                borderBottom: '1px solid hsl(var(--border-subtle))',
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    width: col.width,
                    textAlign: col.align || 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: 'var(--space-12) var(--space-4)',
                    textAlign: 'center',
                    color: 'hsl(var(--text-muted))',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      border: '3px solid hsl(var(--border-subtle))',
                      borderTopColor: 'hsl(var(--color-brand-accent))',
                      borderRadius: 'var(--radius-full)',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                    Loading data...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: 'var(--space-12) var(--space-4)',
                    textAlign: 'center',
                    color: 'hsl(var(--text-muted))',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <Inbox size={36} color="hsl(var(--text-muted))" />
                    <span style={{ fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>
                      {emptyMessage}
                    </span>
                    {emptySubtext && (
                      <span
                        style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(var(--text-muted))' }}
                      >
                        {emptySubtext}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={keyExtractor(item, idx)}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={{
                    borderBottom: '1px solid hsl(var(--border-subtle) / 0.5)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color var(--transition-fast)',
                    backgroundColor:
                      idx % 2 === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-secondary) / 0.5)',
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick)
                      e.currentTarget.style.backgroundColor = 'hsl(var(--bg-secondary))';
                  }}
                  onMouseLeave={(e) => {
                    if (onRowClick)
                      e.currentTarget.style.backgroundColor =
                        idx % 2 === 0 ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-secondary) / 0.5)';
                  }}
                >
                  {columns.map((col) => {
                    // Safe property access fallback if render is not provided
                    const cellVal = (item as Record<string, unknown>)[col.key];
                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          color: 'hsl(var(--text-primary))',
                          textAlign: col.align || 'left',
                          verticalAlign: 'middle',
                        }}
                      >
                        {col.render
                          ? col.render(item, idx)
                          : cellVal !== undefined && cellVal !== null
                            ? String(cellVal)
                            : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {page && total !== undefined && limit && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid hsl(var(--border-subtle))',
            backgroundColor: 'hsl(var(--bg-secondary))',
            fontSize: 'var(--font-size-xs)',
            color: 'hsl(var(--text-muted))',
          }}
        >
          <div>
            Showing{' '}
            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              {total === 0 ? 0 : (page - 1) * limit + 1}
            </span>{' '}
            to{' '}
            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              {Math.min(page * limit, total)}
            </span>{' '}
            of <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{total}</span>{' '}
            entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              aria-label="Previous page"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid hsl(var(--border-subtle))',
                backgroundColor: 'hsl(var(--bg-surface))',
                color: page <= 1 ? 'hsl(var(--text-muted) / 0.5)' : 'hsl(var(--text-secondary))',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              aria-label="Next page"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid hsl(var(--border-subtle))',
                backgroundColor: 'hsl(var(--bg-surface))',
                color:
                  page >= totalPages
                    ? 'hsl(var(--text-muted) / 0.5)'
                    : 'hsl(var(--text-secondary))',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
