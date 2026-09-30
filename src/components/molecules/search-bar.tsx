import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

export interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  shortcut?: string;
}

export function SearchBar({
  shortcut = '⌘K',
  placeholder = 'Search...',
  style,
  ...props
}: SearchBarProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: 'var(--space-3)',
          color: 'hsl(var(--text-muted))',
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: 'var(--space-2) var(--space-12) var(--space-2) var(--space-8)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid hsl(var(--border-subtle))',
          backgroundColor: 'hsl(var(--bg-secondary))',
          color: 'hsl(var(--text-primary))',
          fontSize: 'var(--font-size-sm)',
          outline: 'none',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
          ...style,
        }}
        {...props}
      />
      {shortcut && (
        <span
          style={{
            position: 'absolute',
            right: 'var(--space-3)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-subtle))',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: 'hsl(var(--text-muted))',
            pointerEvents: 'none',
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}
