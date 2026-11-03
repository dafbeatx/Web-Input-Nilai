"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Phaser from 'phaser';
import { createPhaserConfig } from '@/game/config/phaser.config';
import { DeviceMode, InteractiveTrigger, CharacterProfile, CHARACTER_PROFILES } from '@/lib/game/types';
import { detectDeviceMode, saveDeviceMode } from '@/lib/game/deviceDetector';
import GameHUD from './GameHUD';
import VirtualControls from './VirtualControls';

export default function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => detectDeviceMode());
  const [currentZone, setCurrentZone] = useState<string>('Pusat Kota Nusantara');
  const [nearTrigger, setNearTrigger] = useState<InteractiveTrigger | null>(null);
  const [activeModalTrigger, setActiveModalTrigger] = useState<InteractiveTrigger | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(50000);
  const [currentCharacter, setCurrentCharacter] = useState<CharacterProfile>(CHARACTER_PROFILES[0]);

  const handleDeviceModeChange = (newMode: DeviceMode) => {
    setDeviceMode(newMode);
    saveDeviceMode(newMode);
  };

  const handleSelectCharacter = useCallback((char: CharacterProfile) => {
    setCurrentCharacter(char);
    gameRef.current?.events.emit('player:change-character', {
      key: char.key,
      name: char.name,
      role: char.role,
    });
  }, []);

  // Mount Phaser Game Instance
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createPhaserConfig(containerRef.current);
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Listen to Game Events
    game.events.on('scene:ready', (data: { zoneName: string }) => {
      if (data?.zoneName) setCurrentZone(data.zoneName);
    });

    game.events.on('town:zone-change', (zoneName: string) => {
      setCurrentZone(zoneName);
    });

    game.events.on('town:interaction-prompt', (trigger: InteractiveTrigger | null) => {
      setNearTrigger(trigger);
    });

    game.events.on('town:open-modal', (trigger: InteractiveTrigger) => {
      setActiveModalTrigger(trigger);
    });

    return () => {
      game.events.off('scene:ready');
      game.events.off('town:zone-change');
      game.events.off('town:interaction-prompt');
      game.events.off('town:open-modal');
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Joystick Input Handler
  const handleJoystickMove = useCallback((x: number, y: number) => {
    gameRef.current?.events.emit('input:joystick', { x, y });
  }, []);

  // Sprint Toggle Handler
  const handleSprintChange = useCallback((isSprinting: boolean) => {
    gameRef.current?.events.emit('input:sprint', isSprinting);
  }, []);

  // Interact Action Handler
  const handleInteractClick = useCallback(() => {
    gameRef.current?.events.emit('input:interact');
  }, []);

  // Wallet Item Purchase Handler
  const handleBuyItem = useCallback((item: { name: string; price: number }) => {
    setWalletBalance(prev => Math.max(0, prev - item.price));
  }, []);

  return (
    <div className="relative w-full h-dvh bg-slate-950 overflow-hidden select-none">
      {/* Phaser Canvas Root Mount Container */}
      <div
        ref={containerRef}
        id="game-canvas-container"
        className="absolute inset-0 w-full h-full"
      />

      {/* Modern Game HUD Overlay */}
      <GameHUD
        deviceMode={deviceMode}
        onDeviceModeChange={handleDeviceModeChange}
        currentZone={currentZone}
        nearTrigger={nearTrigger}
        activeModalTrigger={activeModalTrigger}
        onCloseModal={() => setActiveModalTrigger(null)}
        walletBalance={walletBalance}
        onBuyItem={handleBuyItem}
        currentCharacter={currentCharacter}
        onSelectCharacter={handleSelectCharacter}
      />

      {/* Multiplatform Virtual Controls (Adaptive to Android / Smart Board / Desktop) */}
      <VirtualControls
        deviceMode={deviceMode}
        nearTrigger={nearTrigger}
        onJoystickMove={handleJoystickMove}
        onSprintChange={handleSprintChange}
        onInteractClick={handleInteractClick}
      />
    </div>
  );
}
