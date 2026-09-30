import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Option[];
  error?: string;
}

export function Select({ label, options = [], error, style, id, children, ...props }: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            color: 'hsl(var(--text-secondary))',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <select
          id={selectId}
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-8) var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: error
              ? '1px solid hsl(var(--color-danger))'
              : '1px solid hsl(var(--border-subtle))',
            backgroundColor: 'hsl(var(--bg-surface))',
            color: 'hsl(var(--text-primary))',
            fontSize: 'var(--font-size-sm)',
            appearance: 'none',
            outline: 'none',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            ...style,
          }}
          {...props}
        >
          {children ||
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: 'var(--space-3)',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'hsl(var(--text-muted))',
          }}
        />
      </div>
      {error && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'hsl(var(--color-danger))' }}>
          {error}
        </span>
      )}
    </div>
  );
}
