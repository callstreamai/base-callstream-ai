import * as React from 'react';

type Props = {
  size?: number;
  className?: string;
  animated?: boolean;
};

/**
 * Call Stream AI logo — sound-wave mark.
 * Sourced from https://logo.callstreamai.com/ official mark.
 */
export function Logo({ size = 32, className = '', animated = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? 'wave-pulse' : ''} ${className}`}
      aria-label="Call Stream AI"
    >
      <circle cx="12" cy="32" r="4.5" fill="#D560B2" />
      <path
        d="M12 32 C 22 32, 26 18, 40 18 L 56 18"
        stroke="#D560B2"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M12 32 C 22 32, 26 32, 40 32 L 56 32"
        stroke="#D560B2"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M12 32 C 22 32, 26 46, 40 46 L 56 46"
        stroke="#D560B2"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.44"
      />
    </svg>
  );
}
