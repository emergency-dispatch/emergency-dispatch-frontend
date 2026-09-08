import React from 'react';
import { HAZARD_TAG_META } from '../../../data/incidentMock';
import type { HazardTagKey } from '../../../types/incident';

interface HazardTagBadgeProps {
  tag?: HazardTagKey;
  tagKey?: HazardTagKey;
  size?: 'sm' | 'md';
}

export const HazardTagBadge: React.FC<HazardTagBadgeProps> = ({ tag, tagKey, size = 'sm' }) => {
  const actualKey = tag || tagKey;
  if (!actualKey) return null;

  const meta = HAZARD_TAG_META[actualKey];
  if (!meta) return null;

  const Icon = meta.icon;
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-mono-data font-semibold whitespace-nowrap shrink-0 ${sizeClass}`}
      style={{ color: meta.color, borderColor: `${meta.color}55`, backgroundColor: `${meta.color}1A` }}
    >
      <Icon className={`${iconSizeClass} shrink-0`} />
      {meta.label}
    </span>
  );
};
