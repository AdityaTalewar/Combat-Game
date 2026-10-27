import React from 'react';

interface SniperScopeOverlayProps {
  windX: number;
  windZ: number;
}

export const SniperScopeOverlay: React.FC<SniperScopeOverlayProps> = ({ windX, windZ }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden select-none z-20">
      {/* Outer Black Mask with Precision Lens Aperture */}
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <mask id="scopeMask">
            {/* Fill entire screen white */}
            <rect x="0" y="0" width="1000" height="1000" fill="white" />
            {/* Cut out center circular lens aperture */}
            <circle cx="500" cy="500" r="390" fill="black" />
          </mask>
          {/* Subtle Lens Tint */}
          <radialGradient id="lensVignette" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="95%" stopColor="rgba(10, 25, 20, 0.45)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.95)" />
          </radialGradient>
        </defs>

        {/* Outer Heavy Black Rim */}
        <rect x="0" y="0" width="1000" height="1000" fill="#030507" mask="url(#scopeMask)" />

        {/* Optical Glass Lens Circle */}
        <circle cx="500" cy="500" r="390" fill="url(#lensVignette)" stroke="#1a2522" strokeWidth="6" />

        {/* Reticle Lines: Horizontal & Vertical Main Axes */}
        <line x1="110" y1="500" x2="890" y2="500" stroke="#111111" strokeWidth="1.8" />
        <line x1="500" y1="110" x2="500" y2="890" stroke="#111111" strokeWidth="1.8" />

        {/* Center Fine Crosshair */}
        <line x1="490" y1="500" x2="510" y2="500" stroke="#cc2211" strokeWidth="1.4" />
        <line x1="500" y1="490" x2="500" y2="510" stroke="#cc2211" strokeWidth="1.4" />
        <circle cx="500" cy="500" r="1.5" fill="#cc2211" />

        {/* Mil-Dot Elevation Holdover Ticks (Downwards for Bullet Drop) */}
        {[1, 2, 3, 4, 5, 6, 7].map((mil) => {
          const y = 500 + mil * 42;
          const tickWidth = mil % 2 === 0 ? 32 : 18;
          return (
            <g key={`elev-${mil}`}>
              <line x1={500 - tickWidth / 2} y1={y} x2={500 + tickWidth / 2} y2={y} stroke="#1a2522" strokeWidth="1.6" />
              <text x={500 + tickWidth / 2 + 8} y={y + 4} fill="#1a2522" fontSize="11" fontFamily="monospace">
                {mil}
              </text>
            </g>
          );
        })}

        {/* Mil-Dot Windage Compensation Ticks (Left & Right) */}
        {[-4, -3, -2, -1, 1, 2, 3, 4].map((mil) => {
          const x = 500 + mil * 42;
          const tickHeight = mil % 2 === 0 ? 24 : 14;
          return (
            <line
              key={`wind-${mil}`}
              x1={x}
              y1={500 - tickHeight / 2}
              x2={x}
              y2={500 + tickHeight / 2}
              stroke="#1a2522"
              strokeWidth="1.6"
            />
          );
        })}

        {/* Stadiametric Rangefinder Silhouette Scale (Right Lower Quadrant) */}
        <path d="M 640 680 Q 720 670 800 640" fill="none" stroke="#22332a" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="640" y1="680" x2="800" y2="680" stroke="#22332a" strokeWidth="1.5" />
        <text x="650" y="695" fill="#22332a" fontSize="10" fontFamily="monospace">1.7m TARGET</text>
        <text x="760" y="630" fill="#22332a" fontSize="10" fontFamily="monospace">400m</text>
        <text x="680" y="660" fill="#22332a" fontSize="10" fontFamily="monospace">200m</text>
      </svg>

      {/* Military Digital Ballistics Telemetry HUD (Bottom of Scope) */}
      <div className="absolute bottom-16 flex items-center gap-6 px-6 py-2 bg-neutral-950/80 border border-emerald-900/40 text-emerald-400 font-mono text-xs tracking-wider rounded">
        <div>
          <span className="text-neutral-500 text-[10px] block">CALIBER</span>
          <span className="font-bold text-amber-400">.50 BMG M33</span>
        </div>
        <div className="h-5 w-px bg-neutral-800" />
        <div>
          <span className="text-neutral-500 text-[10px] block">CROSSWIND</span>
          <span className="tabular-nums font-semibold">{windX >= 0 ? `+${windX.toFixed(1)}` : windX.toFixed(1)} m/s</span>
        </div>
        <div className="h-5 w-px bg-neutral-800" />
        <div>
          <span className="text-neutral-500 text-[10px] block">DROP CORRECTION</span>
          <span className="tabular-nums text-emerald-300">MIL-HOLD (100m: 0.0 | 300m: 2.1)</span>
        </div>
      </div>
    </div>
  );
};
