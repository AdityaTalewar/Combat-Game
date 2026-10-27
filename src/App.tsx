/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { audio } from './game/audio';
import { GameEngine, GameState, MissionType } from './game/gameEngine';
import { TacticalHUD } from './components/TacticalHUD';
import { TitleScreen } from './components/TitleScreen';
import { SniperScopeOverlay } from './components/SniperScopeOverlay';
import { MissionModals } from './components/MissionModals';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hudTick, setHudTick] = useState<number>(0);
  const [hitFeedback, setHitFeedback] = useState<{
    active: boolean;
    isFatal: boolean;
    isHeadshot: boolean;
  }>({ active: false, isFatal: false, isHeadshot: false });

  // Initialize GameEngine once
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current);
    engineRef.current = engine;

    engine.onStateChange = (newState) => {
      setGameState(newState);
    };

    engine.onHitFeedback = (isFatal, isHeadshot) => {
      setHitFeedback({ active: true, isFatal, isHeadshot });
      setTimeout(() => {
        setHitFeedback({ active: false, isFatal: false, isHeadshot: false });
      }, 140);
    };

    // 60fps Animation Loop
    let lastTime = performance.now();
    let animFrameId = 0;
    let hudUpdateTimer = 0;

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.update(dt, now / 1000);

      // Throttled HUD state updates (10Hz) to prevent React overhead on WebGL loop
      hudUpdateTimer += dt;
      if (hudUpdateTimer >= 0.08) {
        hudUpdateTimer = 0;
        setHudTick((t) => (t + 1) % 10000);
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
      engine.destroy();
    };
  }, []);

  // Keyboard & Mouse Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.code === 'Escape') {
        if (engine.state === 'playing') {
          engine.state = 'paused';
          setGameState('paused');
          document.exitPointerLock?.();
        } else if (engine.state === 'paused') {
          engine.state = 'playing';
          setGameState('playing');
        }
        return;
      }

      engine.keys[e.code] = true;

      if (engine.state === 'playing') {
        if (e.code === 'KeyR') {
          engine.weapons.startReload();
        } else if (e.code === 'KeyB') {
          engine.weapons.cycleFireMode();
        } else if (e.code === 'KeyC') {
          engine.player.toggleCrouch();
        } else if (e.code === 'KeyZ') {
          engine.player.toggleProne();
        } else if (e.code === 'Space') {
          engine.player.jump();
        } else if (e.code === 'KeyF') {
          engine.weapons.inspectWeapon();
        } else if (e.code === 'KeyG') {
          engine.throwGrenade();
        } else if (e.code === 'Digit1') {
          engine.weapons.switchWeapon('M4A1');
        } else if (e.code === 'Digit2') {
          engine.weapons.switchWeapon('M82_SNIPER');
        } else if (e.code === 'Digit3') {
          engine.weapons.switchWeapon('SHOTGUN');
        } else if (e.code === 'Digit4') {
          engine.weapons.switchWeapon('PISTOL');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (engine) {
        engine.keys[e.code] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || engine.state !== 'playing') return;

      const isPointerLocked = document.pointerLockElement === mountRef.current;
      if (isPointerLocked) {
        engine.player.handleMouseMove(e.movementX, e.movementY);
        engine.weapons.addMouseDelta(e.movementX, e.movementY);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (engine.state === 'playing') {
        if (e.button === 0) {
          engine.isMouseDown = true;
        } else if (e.button === 2) {
          engine.isRightMouseDown = true;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.button === 0) {
        engine.isMouseDown = false;
      } else if (e.button === 2) {
        engine.isRightMouseDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWindowBlur = () => {
      const engine = engineRef.current;
      if (engine) {
        engine.keys = {};
        engine.isMouseDown = false;
        engine.isRightMouseDown = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handleStartMission = (mission: MissionType) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.startMission(mission);
    setGameState('playing');

    // Request Pointer Lock for immersive first-person controls
    if (mountRef.current && document.pointerLockElement !== mountRef.current) {
      mountRef.current.requestPointerLock?.().catch(() => {
        // Pointer lock rejected in some iframe contexts, fallback click aim handles movement
      });
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.setMuted(nextMuted);
  };

  const handleResume = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.state = 'playing';
    setGameState('playing');
    if (mountRef.current) {
      mountRef.current.requestPointerLock?.().catch(() => {});
    }
  };

  const handleRestart = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.startMission(engine.currentMission);
    setGameState('playing');
    if (mountRef.current) {
      mountRef.current.requestPointerLock?.().catch(() => {});
    }
  };

  const handleReturnToTitle = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.state = 'title';
    setGameState('title');
    document.exitPointerLock?.();
  };

  const engine = engineRef.current;
  const isSniperADS =
    gameState === 'playing' &&
    engine?.weapons.currentWeaponId === 'M82_SNIPER' &&
    engine?.weapons.isAiming;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        onClick={() => {
          if (gameState === 'playing' && mountRef.current && document.pointerLockElement !== mountRef.current) {
            mountRef.current.requestPointerLock?.().catch(() => {});
          }
        }}
        className="absolute inset-0 cursor-crosshair z-0"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartMission}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active Playing HUD */}
      {gameState === 'playing' && engine && (
        <>
          <TacticalHUD
            engine={engine}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            hitFeedback={hitFeedback}
          />
          {/* Sniper High-Magnification Scope Overlay */}
          {isSniperADS && (
            <SniperScopeOverlay
              windX={engine.ballistics.wind.x}
              windZ={engine.ballistics.wind.z}
            />
          )}
        </>
      )}

      {/* Pause / Victory / Game Over Modals */}
      {(gameState === 'paused' || gameState === 'game_over' || gameState === 'victory') && engine && (
        <MissionModals
          state={gameState}
          engine={engine}
          onResume={handleResume}
          onRestart={handleRestart}
          onTitleScreen={handleReturnToTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
    </div>
  );
}
