'use client';

import React from 'react';
import { useSettings } from '@/lib/settings/SettingsContext';
import { soundManager } from '@/lib/audio/soundManager';
import {
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  X,
  Gauge,
  Sliders,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetToDefault } = useSettings();

  if (!isOpen) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value, 10);
    updateSettings({ sound_volume: vol });
  };

  const handleVolumeCommit = () => {
    // Play a gentle preview sound when adjusting volume so player hears the new level
    soundManager.playCardPlay();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#1E232B] border border-[#2D333B] p-5 sm:p-6 shadow-2xl flex flex-col text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2D333B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/15 text-[#FFCC00] flex items-center justify-center border border-[#FFCC00]/30">
              <Settings className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                Game Settings
              </h2>
              <p className="text-[11px] text-[#9BA3AF]">Audio and animation preferences</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#9BA3AF] hover:text-white hover:bg-[#15191F] active:scale-95 transition-all cursor-pointer touch-manipulation"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-4 text-xs">
          {/* SECTION 1: SOUND SETTINGS */}
          <div className="p-3.5 rounded-xl bg-[#15191F]/80 border border-[#2D333B] flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFCC00]">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Sound Settings</span>
            </div>

            {/* Master Sound Switch */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">Master Sound</span>
                <span className="text-[10px] sm:text-[11px] text-[#9BA3AF]">
                  Enable or mute all game audio
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.sound_enabled}
                onClick={() => {
                  const next = !settings.sound_enabled;
                  updateSettings({ sound_enabled: next });
                  if (next) soundManager.playTurnStart();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#FFCC00] focus:ring-offset-2 focus:ring-offset-[#15191F] ${
                  settings.sound_enabled ? 'bg-[#27AE60]' : 'bg-[#2D333B]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sound_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sound Effects Switch */}
            <div className="flex items-center justify-between py-1 border-t border-[#2D333B]/60 pt-2.5">
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">Sound Effects</span>
                <span className="text-[10px] sm:text-[11px] text-[#9BA3AF]">
                  Card placement, flips, UNO alerts & chimes
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.sound_effects_enabled}
                disabled={!settings.sound_enabled}
                onClick={() => {
                  const next = !settings.sound_effects_enabled;
                  updateSettings({ sound_effects_enabled: next });
                  if (next && settings.sound_enabled) soundManager.playCardPlay();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#FFCC00] ${
                  !settings.sound_enabled
                    ? 'opacity-40 cursor-not-allowed bg-[#2D333B]'
                    : settings.sound_effects_enabled
                    ? 'bg-[#27AE60]'
                    : 'bg-[#2D333B]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sound_effects_enabled && settings.sound_enabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sound Volume Slider */}
            <div className="flex flex-col gap-1.5 border-t border-[#2D333B]/60 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-[#9BA3AF]" />
                  <span>Sound Volume</span>
                </span>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#111418] border border-[#2D333B] text-[#FFCC00]">
                  {settings.sound_enabled && settings.sound_effects_enabled
                    ? `${settings.sound_volume}%`
                    : 'Muted'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <VolumeX className="w-3.5 h-3.5 text-[#9BA3AF] shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  disabled={!settings.sound_enabled || !settings.sound_effects_enabled}
                  value={settings.sound_volume}
                  onChange={handleVolumeChange}
                  onPointerUp={handleVolumeCommit}
                  onKeyUp={handleVolumeCommit}
                  className="w-full h-2 bg-[#2D333B] rounded-lg appearance-none cursor-pointer accent-[#FFCC00] disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <Volume2 className="w-3.5 h-3.5 text-[#FFCC00] shrink-0" />
              </div>
            </div>
          </div>

          {/* SECTION 2: ANIMATION SETTINGS */}
          <div className="p-3.5 rounded-xl bg-[#15191F]/80 border border-[#2D333B] flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFCC00]">
              <Zap className="w-3.5 h-3.5" />
              <span>Animation Settings</span>
            </div>

            {/* Enable Animations Switch */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">Animations</span>
                <span className="text-[10px] sm:text-[11px] text-[#9BA3AF]">
                  Card dealing, flying plays, and board flips
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.animations_enabled}
                onClick={() => {
                  updateSettings({ animations_enabled: !settings.animations_enabled });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#FFCC00] focus:ring-offset-2 focus:ring-offset-[#15191F] ${
                  settings.animations_enabled ? 'bg-[#27AE60]' : 'bg-[#2D333B]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.animations_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Animation Intensity Selector */}
            <div className="flex flex-col gap-2 border-t border-[#2D333B]/60 pt-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-[#9BA3AF]" />
                    <span>Animation Intensity</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[#9BA3AF]">
                    {settings.animation_intensity === 'reduced'
                      ? 'Instant, short transitions with minimal motion'
                      : 'Full smooth GSAP transitions and 3D effects'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  disabled={!settings.animations_enabled}
                  onClick={() => updateSettings({ animation_intensity: 'full' })}
                  className={`min-h-[38px] py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation border ${
                    !settings.animations_enabled
                      ? 'opacity-40 cursor-not-allowed border-[#2D333B] bg-[#1E232B] text-[#9BA3AF]'
                      : settings.animation_intensity === 'full'
                      ? 'bg-[#FFCC00] text-[#15191F] border-amber-300 shadow-md'
                      : 'bg-[#1E232B] text-[#9BA3AF] border-[#2D333B] hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Full Intensity</span>
                </button>

                <button
                  type="button"
                  disabled={!settings.animations_enabled}
                  onClick={() => updateSettings({ animation_intensity: 'reduced' })}
                  className={`min-h-[38px] py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation border ${
                    !settings.animations_enabled
                      ? 'opacity-40 cursor-not-allowed border-[#2D333B] bg-[#1E232B] text-[#9BA3AF]'
                      : settings.animation_intensity === 'reduced'
                      ? 'bg-[#FFCC00] text-[#15191F] border-amber-300 shadow-md'
                      : 'bg-[#1E232B] text-[#9BA3AF] border-[#2D333B] hover:text-white'
                  }`}
                >
                  <ZapOff className="w-3.5 h-3.5" />
                  <span>Reduced Motion</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2.5 mt-5 pt-3 border-t border-[#2D333B]">
          <button
            type="button"
            onClick={resetToDefault}
            className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#9BA3AF] hover:text-white hover:bg-[#15191F] border border-[#2D333B] transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FFCC00] text-[#15191F] hover:bg-[#E6B800] active:scale-95 transition-all shadow-md cursor-pointer touch-manipulation"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

