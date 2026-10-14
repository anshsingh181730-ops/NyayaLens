import React from 'react';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ lines = 4, className = '' }) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      <div className="h-4 bg-nyaya-border/50 rounded w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 bg-nyaya-border/40 rounded"
          style={{ width: `${85 - (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
};
