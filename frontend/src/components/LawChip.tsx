import React from 'react';
import { BookOpen } from 'lucide-react';

interface LawChipProps {
  label: string;
  onClick: (provision: string) => void;
}

export const LawChip: React.FC<LawChipProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={() => onClick(label)}
      className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 mx-1 font-mono text-xs font-medium text-nyaya-navy900 bg-nyaya-ivory hover:bg-nyaya-highlight/50 border border-nyaya-border rounded-md shadow-sm transition-all hover:border-nyaya-gold/60 focus:outline-none"
      title={`Open AI Law Agent inquiry for ${label}`}
    >
      <BookOpen className="w-3 h-3 text-nyaya-gold" />
      <span>{label}</span>
    </button>
  );
};
