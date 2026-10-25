import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
  variant?: 'lime' | 'coral' | 'amber' | 'slate' | 'info' | 'emerald' | 'cyan' | 'purple';
  trend?: {
    text: string;
    positive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  caption,
  icon: Icon,
  variant = 'lime',
  trend,
  className = '',
  onClick,
}) => {
  const variantStyles = {
    lime: {
      border: 'border-[#363B30] hover:border-[#C7F36B]/40',
      iconBg: 'bg-[#202A16] text-[#C7F36B] border-[#C7F36B]/20',
      valColor: 'text-[#C7F36B]',
    },
    emerald: {
      border: 'border-[#363B30] hover:border-[#C7F36B]/40',
      iconBg: 'bg-[#202A16] text-[#C7F36B] border-[#C7F36B]/20',
      valColor: 'text-[#C7F36B]',
    },
    coral: {
      border: 'border-[#363B30] hover:border-[#FF6B55]/40',
      iconBg: 'bg-[#321D19] text-[#FF6B55] border-[#FF6B55]/20',
      valColor: 'text-[#FF6B55]',
    },
    amber: {
      border: 'border-[#363B30] hover:border-[#FFC66D]/40',
      iconBg: 'bg-[#302718] text-[#FFC66D] border-[#FFC66D]/20',
      valColor: 'text-[#F3F0E7]',
    },
    info: {
      border: 'border-[#363B30] hover:border-[#86B7FF]/40',
      iconBg: 'bg-[#1D2735] text-[#86B7FF] border-[#86B7FF]/20',
      valColor: 'text-[#F3F0E7]',
    },
    cyan: {
      border: 'border-[#363B30] hover:border-[#86B7FF]/40',
      iconBg: 'bg-[#1D2735] text-[#86B7FF] border-[#86B7FF]/20',
      valColor: 'text-[#F3F0E7]',
    },
    purple: {
      border: 'border-[#363B30] hover:border-[#505745]',
      iconBg: 'bg-[#22261F] text-[#C7F36B] border-[#363B30]',
      valColor: 'text-[#F3F0E7]',
    },
    slate: {
      border: 'border-[#363B30] hover:border-[#505745]',
      iconBg: 'bg-[#191C17] text-[#85897D] border-[#363B30]',
      valColor: 'text-[#F3F0E7]',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`bento-card rounded-xl p-5 flex flex-col justify-between transition-all duration-200 ${variantStyles.border} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#85897D]">
          {label}
        </span>
        <div className={`p-2 rounded-lg border ${variantStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${variantStyles.valColor}`}>
          {value}
        </div>
        
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-[#363B30]/50 text-xs font-mono">
          {caption && <span className="text-[11px] text-[#85897D]">{caption}</span>}
          {trend && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                trend.positive
                  ? 'bg-[#202A16] text-[#C7F36B]'
                  : 'bg-[#191C17] text-[#85897D]'
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
