import React from 'react';
import { GameEngine, GameState, MissionType } from '../game/gameEngine';
import { Trophy, AlertTriangle, Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface MissionModalsProps {
  state: GameState;
  engine: GameEngine;
  onResume: () => void;
  onRestart: () => void;
  onTitleScreen: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MissionModals: React.FC<MissionModalsProps> = ({
  state,
  engine,
  onResume,
  onRestart,
  onTitleScreen,
  isMuted,
  onToggleMute,
}) => {
  if (state === 'title' || state === 'playing') return null;

  const stats = engine.player.stats;
  const accuracyPct =
    stats.accuracy.shotsFired > 0
      ? Math.round((stats.accuracy.shotsHit / stats.accuracy.shotsFired) * 100)
      : 0;

  return (
    <div className="absolute inset-0 bg-neutral-950/85 flex items-center justify-center p-6 z-40 select-none text-white pointer-events-auto">
      {/* Modal Card */}
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-sm p-6 sm:p-8 shadow-2xl">
        {/* State 1: VICTORY */}
        {state === 'victory' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="font-mono text-xs text-amber-500 font-bold uppercase tracking-widest mb-1">
              MISSION ACCOMPLISHED // SECTOR SECURED
            </div>
            <h2 className="text-2xl font-black font-sans uppercase tracking-tight mb-4">
              Tactical Victory
            </h2>

            {/* Performance Debrief Grid */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950/80 border border-neutral-800 p-4 rounded-xs mb-6 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">TOTAL SCORE</span>
                <span className="text-amber-400 font-bold text-base tabular-nums">{stats.score}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">KILLS</span>
                <span className="text-neutral-200 font-bold text-base tabular-nums">{stats.kills}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">HEADSHOTS</span>
                <span className="text-rose-400 font-bold text-base tabular-nums">{stats.headshots}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">ACCURACY</span>
                <span className="text-emerald-400 font-bold text-base tabular-nums">{accuracyPct}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onRestart}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay Mission</span>
              </button>
              <button
                onClick={onTitleScreen}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Base</span>
              </button>
            </div>
          </div>
        )}

        {/* State 2: GAME OVER (Killed in Action) */}
        {state === 'game_over' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-500 mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="font-mono text-xs text-rose-500 font-bold uppercase tracking-widest mb-1">
              CASUALTY REPORT // COMBAT LOSS
            </div>
            <h2 className="text-2xl font-black font-sans uppercase tracking-tight mb-2">
              Killed In Action
            </h2>
            <p className="text-neutral-400 text-xs font-mono mb-6">
              Vitals depleted during hostile engagement. Tactical repositioning advised.
            </p>

            {/* Performance Debrief */}
            <div className="w-full grid grid-cols-3 gap-3 bg-neutral-950/80 border border-neutral-800 p-4 rounded-xs mb-6 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">KILLS</span>
                <span className="text-neutral-200 font-bold text-base tabular-nums">{stats.kills}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">SCORE</span>
                <span className="text-amber-400 font-bold text-base tabular-nums">{stats.score}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-500 text-[10px]">ACCURACY</span>
                <span className="text-emerald-400 font-bold text-base tabular-nums">{accuracyPct}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onRestart}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Redeploy [R]</span>
              </button>
              <button
                onClick={onTitleScreen}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>HQ Menu</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: PAUSED */}
        {state === 'paused' && (
          <div className="flex flex-col items-center text-center">
            <div className="font-mono text-xs text-amber-500 font-bold uppercase tracking-widest mb-1">
              SIMULATION PAUSED
            </div>
            <h2 className="text-2xl font-black font-sans uppercase tracking-tight mb-6">
              Tactical Options
            </h2>

            <div className="w-full flex flex-col gap-3 mb-6">
              <button
                onClick={onResume}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-neutral-950" />
                <span>Resume Operation [ESC]</span>
              </button>

              <button
                onClick={onRestart}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Sector</span>
              </button>

              <button
                onClick={onToggleMute}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? 'Sound: Muted (Unmute)' : 'Sound: Enabled (Mute)'}</span>
              </button>

              <button
                onClick={onTitleScreen}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 font-mono font-bold uppercase text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-800"
              >
                <Home className="w-4 h-4" />
                <span>Main Menu</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-neutral-500">
              CLICK RESUME OR PRESS ESC TO RETURN TO ACTIVE COMBAT
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
