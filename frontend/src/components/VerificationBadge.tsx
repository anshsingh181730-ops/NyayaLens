import React from 'react';
import { SupportStatus, CitationStatus } from '../lib/types';

interface VerificationBadgeProps {
  status: SupportStatus | CitationStatus | string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  showDot?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  size = 'md',
  onClick,
  showDot = true,
}) => {
  let bgClass = 'bg-nyaya-infoBg text-nyaya-info border-nyaya-info/20';
  let dotClass = 'bg-nyaya-info';

  if (status === 'Supported' || status === 'Verified') {
    bgClass = 'bg-nyaya-supportedBg text-nyaya-supported border-nyaya-supported/20';
    dotClass = 'bg-nyaya-supported';
  } else if (status === 'Partly supported' || status === 'Found in document only') {
    bgClass = 'bg-nyaya-partlyBg text-nyaya-partly border-nyaya-partly/20';
    dotClass = 'bg-nyaya-partly';
  } else if (status === 'Not supported' || status === 'Could not verify') {
    bgClass = 'bg-nyaya-notSupportedBg text-nyaya-notSupported border-nyaya-notSupported/20';
    dotClass = 'bg-nyaya-notSupported';
  }

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-all ${bgClass} ${sizeClass} ${
        onClick ? 'cursor-pointer hover:opacity-85' : ''
      }`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      <span>{status}</span>
    </span>
  );
};
