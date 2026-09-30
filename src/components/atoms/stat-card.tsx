import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export type StatTheme = 'green' | 'blue' | 'red' | 'amber' | 'cyan' | 'purple';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  theme?: StatTheme;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtext?: string;
}

const themeStyles: Record<StatTheme, { iconBg: string; iconColor: string; trendColor: string }> = {
  green: {
    iconBg: 'hsl(var(--color-success-bg))',
    iconColor: 'hsl(var(--color-success))',
    trendColor: 'hsl(var(--color-success))',
  },
  blue: {
    iconBg: 'hsl(var(--color-info-bg))',
    iconColor: 'hsl(var(--color-info))',
    trendColor: 'hsl(var(--color-info))',
  },
  red: {
    iconBg: 'hsl(var(--color-danger-bg))',
    iconColor: 'hsl(var(--color-danger))',
    trendColor: 'hsl(var(--color-danger))',
  },
  amber: {
    iconBg: 'hsl(var(--color-warning-bg))',
    iconColor: 'hsl(var(--color-warning))',
    trendColor: 'hsl(var(--color-warning))',
  },
  cyan: {
    iconBg: 'hsl(var(--color-cyan-bg))',
    iconColor: 'hsl(var(--color-cyan))',
    trendColor: 'hsl(var(--color-cyan))',
  },
  purple: {
    iconBg: 'hsl(var(--color-purple-bg))',
    iconColor: 'hsl(var(--color-purple))',
    trendColor: 'hsl(var(--color-purple))',
  },
};

export function StatCard({ title, value, icon, theme = 'blue', trend, subtext }: StatCardProps) {
  const currentTheme = themeStyles[theme];

  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--bg-primary))',
        border: '1px solid hsl(var(--border-subtle))',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div
          style={{
            width: 'var(--space-10)',
            height: 'var(--space-10)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: currentTheme.iconBg,
            color: currentTheme.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'hsl(var(--text-muted))',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 700,
              color: 'hsl(var(--text-primary))',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </span>
        </div>
      </div>

      {(trend || subtext) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontSize: 'var(--font-size-xs)',
            paddingTop: 'var(--space-1)',
            borderTop: '1px solid hsl(var(--border-subtle))',
          }}
        >
          {trend && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: 600,
                  color:
                    trend.isPositive !== false
                      ? 'hsl(var(--color-success))'
                      : 'hsl(var(--color-danger))',
                  gap: 'var(--space-1)',
                }}
              >
                {trend.isPositive !== false ? (
                  <ArrowUpRight size={13} strokeWidth={2.5} />
                ) : (
                  <ArrowDownRight size={13} strokeWidth={2.5} />
                )}
                {trend.value}
              </span>
              {trend.label && (
                <span style={{ color: 'hsl(var(--text-muted))' }}>{trend.label}</span>
              )}
            </>
          )}
          {subtext && !trend && (
            <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}
