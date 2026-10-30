import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_PLAYER_PREFERENCES,
  getPlayerPreferences,
  updatePlayerPreferences,
} from '../preferences';

// Mock supabase server client
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();

const mockFrom = vi.fn((table: string) => {
  return {
    select: mockSelect,
    insert: mockInsert,
    upsert: mockUpsert,
  };
});

vi.mock('../../supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: mockFrom,
  }),
}));

describe('Player Preferences Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    });
    mockUpsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    });
  });

  it('returns existing preferences when found in Supabase', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        sound_enabled: false,
        sound_effects_enabled: true,
        sound_volume: 45,
        animations_enabled: false,
        animation_intensity: 'reduced',
      },
      error: null,
    });

    const prefs = await getPlayerPreferences('test-profile-1');
    expect(prefs.sound_enabled).toBe(false);
    expect(prefs.sound_volume).toBe(45);
    expect(prefs.animations_enabled).toBe(false);
    expect(prefs.animation_intensity).toBe('reduced');
  });

  it('creates default preferences when none exist for profile', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: {
        ...DEFAULT_PLAYER_PREFERENCES,
      },
      error: null,
    });

    const prefs = await getPlayerPreferences('test-profile-new');
    expect(prefs).toEqual(DEFAULT_PLAYER_PREFERENCES);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'test-profile-new',
        sound_volume: 80,
      })
    );
  });

  it('updates preferences and clamps volume within 0-100', async () => {
    mockSingle.mockResolvedValue({
      data: {
        sound_enabled: true,
        sound_effects_enabled: true,
        sound_volume: 100, // clamped from 150
        animations_enabled: true,
        animation_intensity: 'reduced',
      },
      error: null,
    });

    const result = await updatePlayerPreferences('test-profile-1', {
      sound_volume: 150,
      animation_intensity: 'reduced',
    });

    expect(result.sound_volume).toBe(100);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'test-profile-1',
        sound_volume: 100,
        animation_intensity: 'reduced',
      }),
      { onConflict: 'profile_id' }
    );
  });
});

