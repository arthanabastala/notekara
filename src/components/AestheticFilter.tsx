import React from 'react';

export function AestheticFilter() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="paper-cutout-filter" x="-30%" y="-30%" width="160%" height="160%">
          {/* 1. Create the thickened paper base */}
          <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="thick" />
          
          {/* 2. Roughen the edges */}
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="thick" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" result="roughShape" />
          
          {/* 3. Color the paper beige */}
          <feFlood floodColor="#f2e8d5" result="paperColor" />
          <feComposite in="paperColor" in2="roughShape" operator="in" result="coloredPaper" />

          {/* 4. Add subtle texture/dots over the paper */}
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" result="dots" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" in="dots" result="lightDots" />
          <feComposite in="lightDots" in2="coloredPaper" operator="atop" result="texturedPaper" />

          {/* 5. Drop shadow for the paper */}
          <feDropShadow in="texturedPaper" dx="1" dy="2" stdDeviation="1.5" floodColor="#4a3b32" floodOpacity="0.4" result="shadowedPaper" />

          {/* 6. Original icon color as the ink */}
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="roughInk" />

          {/* 7. Merge everything */}
          <feMerge>
            <feMergeNode in="shadowedPaper" />
            <feMergeNode in="roughInk" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
