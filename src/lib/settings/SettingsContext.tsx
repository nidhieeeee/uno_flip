'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { DEFAULT_PLAYER_PREFERENCES, PlayerPreferences } from '../game/preferences';
import { soundManager } from '../audio/soundManager';
import { apiFetch, getClientPlayerToken } from '../game/clientSession';

interface SettingsContextValue {
  settings: PlayerPreferences;
  updateSettings: (updates: Partial<PlayerPreferences>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  isLoading: boolean;
}

const LOCAL_STORAGE_KEY_GUEST = 'uno_guest_preferences';
const LOCAL_STORAGE_KEY_AUTH = 'uno_player_preferences';

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function getStoredLocalPreferences(isGuest: boolean): Partial<PlayerPreferences> | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = isGuest ? LOCAL_STORAGE_KEY_GUEST : LOCAL_STORAGE_KEY_AUTH;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocalPreferences(isGuest: boolean, prefs: PlayerPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    const key = isGuest ? LOCAL_STORAGE_KEY_GUEST : LOCAL_STORAGE_KEY_AUTH;
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {}
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PlayerPreferences>(() => {
    // Check initial reduced motion preference if available
    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const baseline: PlayerPreferences = {
      ...DEFAULT_PLAYER_PREFERENCES,
      animation_intensity: isReducedMotion ? 'reduced' : 'full',
    };

    // Load initial local preference immediately to avoid flicker
    if (typeof window !== 'undefined') {
      const stored = getStoredLocalPreferences(false) || getStoredLocalPreferences(true);
      if (stored) {
        return {
          ...baseline,
          ...stored,
        };
      }
    }

    return baseline;
  });

  const [isLoading, setIsLoading] = useState(true);
  const prevSettingsRef = useRef(settings);

  // Sync with sound manager whenever sound settings change
  useEffect(() => {
    soundManager.updateSettings(
      settings.sound_enabled,
      settings.sound_effects_enabled,
      settings.sound_volume
    );
    prevSettingsRef.current = settings;
  }, [settings.sound_enabled, settings.sound_effects_enabled, settings.sound_volume]);

  // Load authoritative preferences from Supabase on mount
  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      const token = getClientPlayerToken();
      const isGuest = !token;

      // Always restore local preferences first
      const localPrefs = getStoredLocalPreferences(isGuest);
      if (localPrefs && active) {
        setSettings((prev) => ({ ...prev, ...localPrefs }));
      }

      try {
        const res = await apiFetch('/api/profile/preferences', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch preferences');
        const data = await res.json();

        if (data.preferences && active) {
          const serverPrefs: PlayerPreferences = data.preferences;

          // If guest had local customization before token creation, sync local overrides to server once
          const hasLocalGuest = Boolean(localStorage.getItem(LOCAL_STORAGE_KEY_GUEST));
          if (hasLocalGuest && token) {
            const guestPrefs = getStoredLocalPreferences(true);
            if (guestPrefs) {
              const merged = { ...serverPrefs, ...guestPrefs };
              setSettings(merged);
              saveLocalPreferences(false, merged);
              localStorage.removeItem(LOCAL_STORAGE_KEY_GUEST);
              // Asynchronously save merged preferences to server
              apiFetch('/api/profile/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged),
              }).catch(() => {});
              setIsLoading(false);
              return;
            }
          }

          setSettings(serverPrefs);
          saveLocalPreferences(false, serverPrefs);
        }
      } catch (err) {
        // Fallback gracefully to local preferences
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (updates: Partial<PlayerPreferences>) => {
    const token = getClientPlayerToken();
    const isGuest = !token;

    // Optimistic update
    const previous = prevSettingsRef.current;
    const next: PlayerPreferences = {
      ...previous,
      ...updates,
      sound_volume:
        typeof updates.sound_volume === 'number'
          ? Math.max(0, Math.min(100, Math.round(updates.sound_volume)))
          : previous.sound_volume,
    };

    setSettings(next);
    saveLocalPreferences(isGuest, next);
    soundManager.updateSettings(next.sound_enabled, next.sound_effects_enabled, next.sound_volume);

    // Save to Supabase if authenticated
    try {
      const res = await apiFetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        throw new Error('Server update failed');
      }
      const data = await res.json();
      if (data.preferences) {
        setSettings(data.preferences);
        saveLocalPreferences(false, data.preferences);
      }
    } catch (err) {
      // In case of complete network rejection, local preference is still safely maintained
      console.warn('Preferences update synced locally:', err);
    }
  }, []);

  const resetToDefault = useCallback(async () => {
    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resetValues: PlayerPreferences = {
      ...DEFAULT_PLAYER_PREFERENCES,
      animation_intensity: isReducedMotion ? 'reduced' : 'full',
    };

    await updateSettings(resetValues);
  }, [updateSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetToDefault,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

