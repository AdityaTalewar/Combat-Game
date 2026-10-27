import React, { useEffect } from 'react';
import { MissionType } from '../game/gameEngine';
import { Volume2, VolumeX, Shield, Crosshair, Target } from 'lucide-react';

interface TitleScreenProps {
  onStart: (mission: MissionType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
}) => {
  const [selectedMission, setSelectedMission] = React.useState<MissionType>('defense');

  // Space or Enter to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        onStart(selectedMission);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, selectedMission]);

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-8 sm:p-12 z-30 select-none text-white pointer-events-auto">
      {/* Top Header: Tactical Classification & Sound Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-xs" />
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            DEFENSE FORCES COMBAT SIMULATOR // VER 4.2
          </span>
        </div>
        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-neutral-900/90 border border-neutral-700/60 hover:border-amber-500/80 text-xs font-mono tracking-wider transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'AUDIO: MUTED' : 'AUDIO: ENGAGED'}</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke Military SVG Title Lockup over Negative Space */}
      <div className="max-w-2xl my-auto">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] uppercase tracking-wider mb-3">
          <Crosshair className="w-3.5 h-3.5" />
          <span>Real-Physics Ballistics & Detailed Combat Engine</span>
        </div>

        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-4">
          <svg className="w-full max-w-xl h-auto" viewBox="0 0 540 85" fill="none">
            <text
              x="0"
              y="60"
              fontFamily="Impact, sans-serif"
              fontSize="68"
              letterSpacing="6"
              fill="#f3f4f6"
              stroke="#0f1115"
              strokeWidth="2"
            >
              VANGUARD
            </text>
            <text
              x="360"
              y="60"
              fontFamily="monospace"
              fontSize="24"
              fontWeight="bold"
              letterSpacing="3"
              fill="#f59e0b"
            >
              COMBAT
            </text>
            <line x1="0" y1="76" x2="520" y2="76" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="520" y1="76" x2="540" y2="76" stroke="#4b5563" strokeWidth="2.5" />
          </svg>
        </div>

        <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 font-sans max-w-lg">
          High-fidelity army tactical combat simulator with realistic bullet velocity, aerodynamic drag,
          gravity drop, crosswind drift, material penetration, and procedural weapon kinematics.
        </p>

        {/* Mission Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => setSelectedMission('defense')}
            className={`p-3.5 rounded text-left border transition-all cursor-pointer ${
              selectedMission === 'defense'
                ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/30'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className={`w-4 h-4 ${selectedMission === 'defense' ? 'text-amber-400' : 'text-neutral-500'}`} />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">FOB Alpha Defense</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Defend forward perimeter against coordinated hostile squad waves.
            </p>
          </button>

          <button
            onClick={() => setSelectedMission('proving_grounds')}
            className={`p-3.5 rounded text-left border transition-all cursor-pointer ${
              selectedMission === 'proving_grounds'
                ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/30'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Target className={`w-4 h-4 ${selectedMission === 'proving_grounds' ? 'text-amber-400' : 'text-neutral-500'}`} />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Ballistics Range</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Calibrated 50m–400m steel plates, wind deflection & drop testing.
            </p>
          </button>

          <button
            onClick={() => setSelectedMission('assault')}
            className={`p-3.5 rounded text-left border transition-all cursor-pointer ${
              selectedMission === 'assault'
                ? 'bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/30'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Crosshair className={`w-4 h-4 ${selectedMission === 'assault' ? 'text-amber-400' : 'text-neutral-500'}`} />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Compound Assault</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Breach enemy bunker complex, detonate fuel drums, neutralize guards.
            </p>
          </button>
        </div>

        {/* Primary Start CTA Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onStart(selectedMission)}
            className="px-8 py-3.5 rounded bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold font-mono tracking-wider uppercase text-sm transition-all shadow-md hover:shadow-amber-500/20 cursor-pointer flex items-center gap-3"
          >
            <span>Deploy to Operation</span>
            <span className="text-[11px] opacity-75 font-normal border-l border-neutral-950/30 pl-2">
              [ENTER / SPACE]
            </span>
          </button>
        </div>
      </div>

      {/* Flat Single Control-Hint Line Footer per guidelines */}
      <div className="pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-neutral-400">
        <div>
          <span className="text-neutral-200">WASD</span> Move · <span className="text-neutral-200">L-Click</span> Fire · <span className="text-neutral-200">R-Click</span> ADS · <span className="text-neutral-200">R</span> Reload · <span className="text-neutral-200">B</span> Fire Mode · <span className="text-neutral-200">C/Z</span> Stance · <span className="text-neutral-200">G</span> Frag · <span className="text-neutral-200">Esc</span> Pause
        </div>
        <div className="text-neutral-500 text-[11px]">
          60FPS SIMULATION · SUB-MOA BALLISTIC CALCULATION
        </div>
      </div>
    </div>
  );
};
