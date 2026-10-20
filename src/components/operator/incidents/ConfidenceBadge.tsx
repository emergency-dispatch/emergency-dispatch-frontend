import React from 'react';
import { Percent } from 'lucide-react';
import { LOW_CONFIDENCE_THRESHOLD } from '../../../data/incidentMock';

interface ConfidenceBadgeProps {
  /** % tin cậy của AI (0–100). */
  score: number;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score }) => {
  const tierClass =
    score >= 80 ? 'text-emerald-400' : score >= LOW_CONFIDENCE_THRESHOLD ? 'text-amber-400' : 'text-red-400';

  return (
    <span className={`inline-flex items-center gap-0.5 font-mono-data font-bold text-xs shrink-0 ${tierClass}`}>
      {score}
      <Percent className="w-3 h-3" />
    </span>
  );
};
