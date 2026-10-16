import React from 'react';
import { Percent } from 'lucide-react';

interface PlausibilityBadgeProps {
  score: number;
}

export const PlausibilityBadge: React.FC<PlausibilityBadgeProps> = ({ score }) => {
  const tierClass = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <span className={`inline-flex items-center gap-0.5 font-mono-data font-bold text-xs shrink-0 ${tierClass}`}>
      {score}
      <Percent className="w-3 h-3" />
    </span>
  );
};
