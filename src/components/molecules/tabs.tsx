export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        width: '100%',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              borderBottom: isActive
                ? '2px solid hsl(var(--color-brand-accent))'
                : '2px solid transparent',
              color: isActive ? 'hsl(var(--color-brand-accent))' : 'hsl(var(--text-muted))',
              fontWeight: isActive ? 600 : 500,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              marginBottom: '-1px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive
                    ? 'hsl(var(--color-brand-accent-subtle))'
                    : 'hsl(var(--bg-secondary))',
                  color: isActive ? 'hsl(var(--color-brand-accent))' : 'hsl(var(--text-muted))',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
