import React from 'react';

export interface FireTruckIconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
  strokeWidth?: number;
}

// Lucide has no dedicated fire-truck glyph, so this fills the gap — drawn in the
// same 24x24 / round-stroke style as lucide-react icons for a consistent look.
export const FireTruckIcon: React.FC<FireTruckIconProps> = ({
  className,
  width = 24,
  height = 24,
  color = 'currentColor',
  strokeWidth = 2,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Ladder rack on the roof */}
    <line x1="3" y1="6" x2="19" y2="6" />
    <line x1="5" y1="6" x2="5" y2="9" />
    <line x1="17" y1="6" x2="17" y2="9" />
    {/* Beacon light above the cab */}
    <path d="M16 12v-1.5a1 1 0 0 1 1-1a1 1 0 0 1 1 1V12" />
    {/* Cargo body */}
    <rect x="2" y="9" width="13" height="8" rx="1" />
    {/* Cab */}
    <path d="M15 12h3l3 3.5V17h-6z" />
    {/* Wheels */}
    <circle cx="6" cy="18.5" r="1.5" />
    <circle cx="18" cy="18.5" r="1.5" />
  </svg>
);
