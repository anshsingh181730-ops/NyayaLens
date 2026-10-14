import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-card border border-nyaya-border shadow-subtle my-4">
      <div className="w-12 h-12 rounded-full bg-nyaya-ivory flex items-center justify-center text-nyaya-gold mb-3 border border-nyaya-border/40">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-serif text-base font-semibold text-nyaya-navy900 mb-1">{title}</h3>
      <p className="text-sm text-nyaya-muted max-w-md mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold text-white bg-nyaya-navy900 hover:bg-nyaya-navy700 rounded-md transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
