import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { WEAPON_CONFIGS } from '../game/weapons';
import { BALLISTIC_PROFILES } from '../game/ballistics';
import {
  Shield,
  Heart,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Wind,
  Disc,
  Activity,
  Crosshair,
} from 'lucide-react';

interface TacticalHUDProps {
  engine: GameEngine;
  isMuted: boolean;
  onToggleMute: () => void;
  hitFeedback: { active: boolean; isFatal: boolean; isHeadshot: boolean };
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  engine,
  isMuted,
  onToggleMute,
  hitFeedback,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [showBallisticsTable, setShowBallisticsTable] = useState(false);

  const weaponId = engine.weapons.currentWeaponId;
  const currentAmmo = engine.weapons.currentAmmo[weaponId] ?? 0;
  const reserveAmmo = engine.weapons.reserveAmmo[weaponId] ?? 0;
  const weaponConfig = WEAPON_CONFIGS[weaponId] || WEAPON_CONFIGS['M4A1'];
  const ballisticProfile = BALLISTIC_PROFILES[weaponConfig.ballisticKey] || BALLISTIC_PROFILES['M4A1'];

  const health = Math.max(0, Math.round(engine.player.stats.health));
  const armor = Math.max(0, Math.round(engine.player.stats.armor));
  const stance = engine.player.stance.toUpperCase();
  const fireMode = engine.weapons.currentFireMode.toUpperCase();

  // Compass Bearing in Degrees (0 - 360)
  const deg = Math.round(((engine.player.yaw * 180) / Math.PI) % 360);
  const normalizedDeg = deg < 0 ? deg + 360 : deg;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden text-neutral-100 font-sans">
      {/* 1. Red Damage Flash Vignette when damaged */}
      {engine.player.damageFlashAlpha > 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-75"
          style={{
            boxShadow: 'inset 0 0 100px rgba(220, 20, 20, 0.8)',
            opacity: engine.player.damageFlashAlpha,
          }}
        />
      )}

      {/* 2. Tactical Compass Ribbon (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="flex items-center gap-4 px-6 py-1.5 bg-neutral-950/85 border border-neutral-800 text-neutral-300 font-mono text-xs rounded-xs">
          <span className="text-amber-400 font-bold tabular-nums w-10 text-center">
            {normalizedDeg.toString().padStart(3, '0')}°
          </span>
          <div className="flex items-center gap-3 text-[11px] tracking-wider text-neutral-400">
            <span className={normalizedDeg >= 350 || normalizedDeg <= 10 ? 'text-amber-400 font-bold' : ''}>N</span>
            <span>·</span>
            <span className={normalizedDeg >= 40 && normalizedDeg <= 50 ? 'text-amber-400 font-bold' : ''}>NE</span>
            <span>·</span>
            <span className={normalizedDeg >= 80 && normalizedDeg <= 100 ? 'text-amber-400 font-bold' : ''}>E</span>
            <span>·</span>
            <span className={normalizedDeg >= 170 && normalizedDeg <= 190 ? 'text-amber-400 font-bold' : ''}>S</span>
            <span>·</span>
            <span className={normalizedDeg >= 260 && normalizedDeg <= 280 ? 'text-amber-400 font-bold' : ''}>W</span>
            <span>·</span>
            <span className={normalizedDeg >= 305 && normalizedDeg <= 325 ? 'text-amber-400 font-bold' : ''}>NW</span>
          </div>
        </div>

        {/* Mission Status Strip */}
        <div className="mt-2 flex items-center gap-3 px-3 py-1 bg-neutral-900/90 border border-neutral-800/80 rounded-xs text-[11px] font-mono">
          <span className="text-amber-400 uppercase font-semibold">
            {engine.currentMission === 'defense'
              ? `DEFENSE // WAVE ${engine.waveNumber} OF ${engine.maxWaves}`
              : engine.currentMission === 'assault'
              ? 'COMPOUND ASSAULT // INFILTRATION'
              : 'BALLISTICS PROVING GROUNDS'}
          </span>
          {engine.currentMission !== 'proving_grounds' && (
            <>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-300">
                HOSTILES: <strong className="text-rose-400 tabular-nums">{engine.enemiesRemaining}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3. Dynamic Center Crosshair (Visible when not aiming down sights) */}
      {!engine.weapons.isAiming && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 bg-neutral-100/90 rounded-full" />
            {/* Crosshair ticks with dynamic expansion based on movement */}
            <div
              className="absolute -top-3 w-0.5 h-2.5 bg-neutral-100/80 transition-transform duration-75"
              style={{
                transform: `translateY(${engine.player.isMoving ? -4 : engine.player.stance === 'prone' ? 2 : 0}px)`,
              }}
            />
            <div
              className="absolute -bottom-3 w-0.5 h-2.5 bg-neutral-100/80 transition-transform duration-75"
              style={{
                transform: `translateY(${engine.player.isMoving ? 4 : engine.player.stance === 'prone' ? -2 : 0}px)`,
              }}
            />
            <div
              className="absolute -left-3 h-0.5 w-2.5 bg-neutral-100/80 transition-transform duration-75"
              style={{
                transform: `translateX(${engine.player.isMoving ? -4 : engine.player.stance === 'prone' ? 2 : 0}px)`,
              }}
            />
            <div
              className="absolute -right-3 h-0.5 w-2.5 bg-neutral-100/80 transition-transform duration-75"
              style={{
                transform: `translateX(${engine.player.isMoving ? 4 : engine.player.stance === 'prone' ? -2 : 0}px)`,
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Transient Hit Marker Confirmation */}
      {hitFeedback.active && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="relative w-10 h-10 animate-ping">
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              <line
                x1="8"
                y1="8"
                x2="16"
                y2="16"
                stroke={hitFeedback.isHeadshot ? '#ef4444' : hitFeedback.isFatal ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.5"
              />
              <line
                x1="32"
                y1="8"
                x2="24"
                y2="16"
                stroke={hitFeedback.isHeadshot ? '#ef4444' : hitFeedback.isFatal ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.5"
              />
              <line
                x1="8"
                y1="32"
                x2="16"
                y2="24"
                stroke={hitFeedback.isHeadshot ? '#ef4444' : hitFeedback.isFatal ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.5"
              />
              <line
                x1="32"
                y1="32"
                x2="24"
                y2="24"
                stroke={hitFeedback.isHeadshot ? '#ef4444' : hitFeedback.isFatal ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.5"
              />
            </svg>
            {hitFeedback.isHeadshot && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest whitespace-nowrap">
                HEADSHOT +250
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. Lower-Left Perimeter: Health, Armor, Stance */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 px-4 py-3 bg-neutral-950/85 border border-neutral-800 rounded-xs">
          {/* Stance Indicator */}
          <div className="flex flex-col items-center justify-center pr-3 border-r border-neutral-800 text-neutral-400 font-mono">
            <span className="text-[10px] text-neutral-500">STANCE</span>
            <span className="font-bold text-xs text-amber-400">{stance}</span>
          </div>

          {/* Health & Armor Bars */}
          <div className="flex flex-col gap-1.5 w-44">
            {/* Health */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-rose-400">
                <Heart className="w-3.5 h-3.5 fill-rose-500/40" />
                <span className="text-[11px] text-neutral-400">VITALS</span>
              </div>
              <span className="font-bold tabular-nums text-neutral-200">{health}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  health > 50 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>

            {/* Armor Plates */}
            <div className="flex items-center justify-between text-xs font-mono mt-0.5">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Shield className="w-3.5 h-3.5 fill-cyan-500/40" />
                <span className="text-[11px] text-neutral-400">ARMOR</span>
              </div>
              <span className="font-bold tabular-nums text-neutral-200">{armor}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-150" style={{ width: `${armor}%` }} />
            </div>
          </div>
        </div>

        {/* Combat Performance Stats */}
        <div className="flex items-center gap-4 px-3.5 py-1.5 bg-neutral-950/80 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 rounded-xs">
          <div>
            KILLS: <strong className="text-amber-400 tabular-nums">{engine.player.stats.kills}</strong>
          </div>
          <span className="text-neutral-700">|</span>
          <div>
            SCORE: <strong className="text-neutral-200 tabular-nums">{engine.player.stats.score}</strong>
          </div>
          <span className="text-neutral-700">|</span>
          <div>
            HEADSHOTS: <strong className="text-rose-400 tabular-nums">{engine.player.stats.headshots}</strong>
          </div>
        </div>
      </div>

      {/* 6. Lower-Right Perimeter: Firearm Telemetry, Ammo, Fire Mode */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2.5">
        <div className="flex flex-col items-end px-5 py-3 bg-neutral-950/85 border border-neutral-800 rounded-xs">
          {/* Weapon Name & Caliber */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-amber-400 font-mono text-xs font-bold uppercase">{weaponConfig.name}</span>
            <span className="text-neutral-500 font-mono text-[10px]">{ballisticProfile.caliberName}</span>
          </div>

          {/* Large Military Tabular Ammo Display */}
          <div className="flex items-baseline gap-2 font-mono">
            <span
              className={`text-4xl font-black tabular-nums tracking-tighter ${
                currentAmmo <= 5 ? 'text-rose-500' : 'text-neutral-100'
              }`}
            >
              {currentAmmo.toString().padStart(2, '0')}
            </span>
            <span className="text-neutral-500 text-lg">/</span>
            <span className="text-neutral-400 text-base font-semibold tabular-nums">
              {reserveAmmo.toString().padStart(3, '0')}
            </span>
          </div>

          {/* Reload Progress bar if reloading */}
          {engine.weapons.isReloading && (
            <div className="w-full mt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-0.5">
                <span>RELOADING...</span>
                <span>{Math.round(engine.weapons.reloadProgress * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-75"
                  style={{ width: `${engine.weapons.reloadProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Fire Mode & Controls reminder */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-neutral-800/80 text-[11px] font-mono">
            <span className="text-neutral-500 text-[10px]">FIRE MODE:</span>
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-amber-400 font-bold">
              {fireMode} [B]
            </span>
            <span className="text-neutral-500 text-[10px]">INSPECT: [F]</span>
          </div>
        </div>
      </div>

      {/* 7. Unified Collapsible Bottom Dock (Center Bottom) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900/90 border border-neutral-800 hover:border-neutral-600 rounded-t text-[11px] font-mono text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDockCollapsed ? '▴ SHOW LOADOUT & BALLISTICS' : '▾ HIDE DOCK'}</span>
        </button>

        {/* Main Dock Container */}
        {!isDockCollapsed && (
          <div className="flex flex-col items-center bg-neutral-950/90 border border-neutral-800 p-2 rounded-xs shadow-2xl max-w-[94vw]">
            {/* Quick Weapon Selector Bar */}
            <div className="flex items-center gap-2">
              {[
                { id: 'M4A1', slot: '1', label: 'M4A1 SOPMOD' },
                { id: 'M82_SNIPER', slot: '2', label: 'M82 .50 CAL' },
                { id: 'SHOTGUN', slot: '3', label: 'BENELLI M4' },
                { id: 'PISTOL', slot: '4', label: 'GLOCK 19' },
              ].map((w) => {
                const isActive = weaponId === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => engine.weapons.switchWeapon(w.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-950/50 border-amber-500 text-amber-300 font-bold'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <span className="w-4 h-4 rounded bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-300">
                      {w.slot}
                    </span>
                    <span>{w.label}</span>
                  </button>
                );
              })}

              {/* Frag Grenade Button */}
              <button
                onClick={() => engine.throwGrenade()}
                className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono border bg-neutral-900/80 border-neutral-800 hover:border-rose-500/80 text-rose-300 transition-all cursor-pointer"
              >
                <span className="w-4 h-4 rounded bg-rose-950 flex items-center justify-center text-[10px] text-rose-300">
                  G
                </span>
                <span>FRAG GRENADE</span>
              </button>

              <div className="h-6 w-px bg-neutral-800 mx-1" />

              {/* Audio Mute Button */}
              <button
                onClick={onToggleMute}
                className="p-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-300 cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* Ballistics Drawer Toggle */}
              <button
                onClick={() => setShowBallisticsTable(!showBallisticsTable)}
                className={`p-2 rounded border transition-colors cursor-pointer ${
                  showBallisticsTable
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Toggle Ballistics Physics Data Table"
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>

            {/* Ballistics Telemetry Table (Collapsible) */}
            {showBallisticsTable && (
              <div className="w-full mt-2 pt-2 border-t border-neutral-800/80 grid grid-cols-4 gap-3 text-[11px] font-mono text-neutral-400 px-2">
                <div>
                  <span className="text-neutral-500 block text-[9px]">MUZZLE VELOCITY</span>
                  <span className="text-amber-400 font-semibold">{ballisticProfile.muzzleVelocity} m/s</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[9px]">PROJECTILE MASS</span>
                  <span className="text-neutral-200 font-semibold">{ballisticProfile.massGrains} grains</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[9px]">CROSSWIND VECTOR</span>
                  <span className="text-neutral-200 font-semibold">
                    {engine.ballistics.wind.x.toFixed(1)} m/s (E)
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[9px]">PENETRATION POWER</span>
                  <span className="text-emerald-400 font-semibold">
                    {ballisticProfile.penetration >= 1.0 ? 'LIGHT COVER PUNCH' : 'SURFACE DEFLECTION'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
