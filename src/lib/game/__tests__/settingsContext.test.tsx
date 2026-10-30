import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { DEFAULT_PLAYER_PREFERENCES } from '../preferences';
import { SettingsProvider, useSettings } from '../../settings/SettingsContext';
import { renderToString } from 'react-dom/server';

describe('SettingsContext and Preferences Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes full default player preference fields', () => {
    expect(DEFAULT_PLAYER_PREFERENCES).toEqual({
      sound_enabled: true,
      sound_effects_enabled: true,
      sound_volume: 80,
      animations_enabled: true,
      animation_intensity: 'full',
    });
  });

  it('renders SettingsProvider with child components correctly', () => {
    const TestConsumer = () => {
      const { settings } = useSettings();
      return (
        <div>
          <span data-testid="sound">{settings.sound_enabled ? 'enabled' : 'disabled'}</span>
          <span data-testid="volume">{settings.sound_volume}</span>
          <span data-testid="anim">{settings.animation_intensity}</span>
        </div>
      );
    };

    const html = renderToString(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    expect(html).toContain('enabled');
    expect(html).toContain('80');
    expect(html).toContain('full');
  });
});
