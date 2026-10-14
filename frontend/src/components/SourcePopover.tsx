import React from 'react';
import { VerificationBadge } from './VerificationBadge';
import { SupportStatus } from '../lib/types';
import { Info, X } from 'lucide-react';

interface SourcePopoverProps {
  status: SupportStatus;
  reason?: string;
  paraIds: string[];
  onClose: () => void;
  onScrollToPara?: (paraId: string) => void;
}

export const SourcePopover: React.FC<SourcePopoverProps> = ({
  status,
  reason,
  paraIds,
  onClose,
  onScrollToPara,
}) => {
  return (
    <div className="absolute z-30 w-80 p-3.5 bg-white rounded-card shadow-elevated border border-nyaya-border text-nyaya-text text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-nyaya-border/50 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-nyaya-navy900">
          <Info className="w-3.5 h-3.5 text-nyaya-gold" />
          <span>Factual Verification Status</span>
        </div>
        <button
          onClick={onClose}
          className="text-nyaya-muted hover:text-nyaya-navy900 p-0.5 rounded focus:outline-none"
          aria-label="Close popover"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-nyaya-muted">Support Level:</span>
        <VerificationBadge status={status} size="sm" />
      </div>

      <div>
        <span className="font-medium text-nyaya-navy900 block mb-1">Why this status?</span>
        <p className="text-nyaya-muted leading-relaxed bg-nyaya-ivory/60 p-2 rounded border border-nyaya-border/40">
          {reason || (status === 'Supported'
            ? 'Direct factual concordance confirmed with cited source paragraph.'
            : status === 'Partly supported'
            ? 'Core assertion is consistent, but minor nuances or inferences require cross-checking.'
            : 'Insufficient textual evidence located in the cited paragraphs.')}
        </p>
      </div>

      {paraIds.length > 0 && (
        <div className="pt-1 flex items-center justify-between text-nyaya-muted border-t border-nyaya-border/50">
          <span>Cited Sources:</span>
          <div className="flex gap-1.5 flex-wrap">
            {paraIds.map((pid) => (
              <button
                key={pid}
                onClick={() => onScrollToPara && onScrollToPara(pid)}
                className="font-mono text-xs text-nyaya-navy900 bg-nyaya-ivory hover:bg-nyaya-highlight/60 px-1.5 py-0.5 rounded border border-nyaya-border transition-colors"
                title={`Click to scroll to ${pid}`}
              >
                {pid}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
