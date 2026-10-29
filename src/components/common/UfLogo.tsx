'use client';

import React from 'react';

interface UfLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  glow?: boolean;
  priority?: boolean;
}

export const UfLogo: React.FC<UfLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
}) => {
  const pixelSize =
    typeof size === 'number'
      ? size
      : {
          xs: 22,
          sm: 28,
          md: 34,
          lg: 48,
          xl: 64,
          '2xl': 84,
        }[size] || 34;

  return (
    <div
      role="img"
      aria-label="UNO FLIP Logo"
      style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        glow ? 'drop-shadow-[0_0_12px_rgba(237,28,36,0.6)]' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform transition-transform duration-150 hover:scale-105"
      >
        <defs>
          <linearGradient id="ufCardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF1744" />
            <stop offset="50%" stopColor="#ED1C24" />
            <stop offset="100%" stopColor="#990000" />
          </linearGradient>

          <linearGradient id="ufGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF176" />
            <stop offset="50%" stopColor="#FFCC00" />
            <stop offset="100%" stopColor="#F57F17" />
          </linearGradient>

          <linearGradient id="ufOvalBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1677E8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7B1FA2" stopOpacity="0.55" />
          </linearGradient>

          <filter id="ufShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Card Body with UNO Red Gradient and Gold Border */}
        <rect
          x="24"
          y="24"
          width="464"
          height="464"
          rx="104"
          ry="104"
          fill="url(#ufCardBg)"
          stroke="url(#ufGoldBorder)"
          strokeWidth="20"
          filter="url(#ufShadow)"
        />

        {/* Tilted Brand Oval */}
        <ellipse
          cx="256"
          cy="256"
          rx="200"
          ry="140"
          transform="rotate(-18 256 256)"
          fill="url(#ufOvalBg)"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="8"
        />

        {/* Bold Tilted UF Lettering */}
        <g transform="rotate(-6 256 256)">
          <text
            x="256"
            y="318"
            fontFamily="system-ui, -apple-system, 'Impact', 'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="210"
            letterSpacing="-10"
            textAnchor="middle"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="12"
            strokeLinejoin="round"
          >
            UF
          </text>
        </g>

        {/* Small "FLIP!" Accent Pill at bottom center */}
        <g transform="translate(196, 400)">
          <rect
            x="0"
            y="0"
            width="120"
            height="34"
            rx="17"
            ry="17"
            fill="#FFCC00"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <text
            x="60"
            y="24"
            fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="18"
            letterSpacing="2"
            textAnchor="middle"
            fill="#15191F"
          >
            FLIP!
          </text>
        </g>
      </svg>
    </div>
  );
};

