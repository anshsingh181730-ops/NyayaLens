import React from 'react';
import { Check, Loader2 } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: 'Reading' | 'Splitting' | 'Summarizing' | 'Verifying' | 'Done';
  percent?: number;
  message?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  currentStep,
  percent = 0,
  message,
}) => {
  const steps = [
    { id: 'Reading', label: '1. Reading & OCR' },
    { id: 'Splitting', label: '2. Paragraph Splitting' },
    { id: 'Summarizing', label: '3. Map-Reduce Summary' },
    { id: 'Verifying', label: '4. Support Verification' },
    { id: 'Done', label: '5. Ready' },
  ];

  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-white rounded-card border border-nyaya-border shadow-subtle space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-nyaya-navy900">Verifying Judicial Record</span>
        <span className="font-mono text-xs text-nyaya-gold font-semibold">{percent}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-nyaya-ivory rounded-full overflow-hidden border border-nyaya-border/50">
        <div
          className="h-full bg-nyaya-navy900 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Steps Row */}
      <div className="grid grid-cols-5 gap-2 pt-2">
        {steps.map((s, idx) => {
          const isDone = idx < stepIndex || currentStep === 'Done';
          const isCurrent = s.id === currentStep && currentStep !== 'Done';

          return (
            <div key={s.id} className="flex flex-col items-center text-center space-y-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
                  isDone
                    ? 'bg-nyaya-supported text-white border-nyaya-supported'
                    : isCurrent
                    ? 'bg-nyaya-navy900 text-white border-nyaya-navy900 shadow-sm'
                    : 'bg-nyaya-ivory text-nyaya-muted border-nyaya-border'
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[11px] leading-tight font-medium ${
                  isCurrent ? 'text-nyaya-navy900 font-semibold' : 'text-nyaya-muted'
                }`}
              >
                {s.label.split('. ')[1]}
              </span>
            </div>
          );
        })}
      </div>

      {message && (
        <p className="text-center text-xs text-nyaya-muted font-mono pt-1 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
