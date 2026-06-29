import React from 'react';
import type { RiskCategory } from '../api/types';
import { cn } from '../lib/utils';

interface RiskBadgeProps {
  category: RiskCategory | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category,
  size = 'md',
  className,
  showDot = true,
}) => {
  const cat = category.toLowerCase() as RiskCategory;

  const styles: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
    healthy: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30 dark:border-emerald-500/20',
      dot: 'bg-emerald-500',
      label: 'Healthy',
    },
    watch: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/10',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-500/30 dark:border-sky-500/20',
      dot: 'bg-sky-500',
      label: 'Watch',
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30 dark:border-amber-500/20',
      dot: 'bg-amber-500',
      label: 'Warning',
    },
    critical: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30 dark:border-rose-500/20',
      dot: 'bg-rose-500 animate-pulse',
      label: 'Critical',
    },
  };

  const config = styles[cat] || styles.healthy;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded border transition-all shadow-sm',
        config.bg,
        config.text,
        config.border,
        sizeStyles[size],
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />}
      {config.label}
    </span>
  );
};
