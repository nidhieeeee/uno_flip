import { getSupabaseServerClient } from '../supabase/server';

export interface PlayerPreferences {
  sound_enabled: boolean;
  sound_effects_enabled: boolean;
  sound_volume: number; // 0 - 100
  animations_enabled: boolean;
  animation_intensity: 'full' | 'reduced';
}

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  sound_enabled: true,
  sound_effects_enabled: true,
  sound_volume: 80,
  animations_enabled: true,
  animation_intensity: 'full',
};

/**
 * Retrieves player preferences for a given profile ID.
 * If no record exists, inserts and returns the default preferences.
 */
export async function getPlayerPreferences(profileId: string): Promise<PlayerPreferences> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('player_preferences')
    .select('sound_enabled, sound_effects_enabled, sound_volume, animations_enabled, animation_intensity')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching player preferences:', error.message);
    return { ...DEFAULT_PLAYER_PREFERENCES };
  }

  if (data) {
    return {
      sound_enabled: data.sound_enabled ?? DEFAULT_PLAYER_PREFERENCES.sound_enabled,
      sound_effects_enabled: data.sound_effects_enabled ?? DEFAULT_PLAYER_PREFERENCES.sound_effects_enabled,
      sound_volume: typeof data.sound_volume === 'number' ? data.sound_volume : DEFAULT_PLAYER_PREFERENCES.sound_volume,
      animations_enabled: data.animations_enabled ?? DEFAULT_PLAYER_PREFERENCES.animations_enabled,
      animation_intensity: data.animation_intensity === 'reduced' ? 'reduced' : 'full',
    };
  }

  // Create default preferences row
  const { data: newRow, error: insertError } = await supabase
    .from('player_preferences')
    .insert({
      profile_id: profileId,
      ...DEFAULT_PLAYER_PREFERENCES,
    })
    .select('sound_enabled, sound_effects_enabled, sound_volume, animations_enabled, animation_intensity')
    .single();

  if (insertError || !newRow) {
    return { ...DEFAULT_PLAYER_PREFERENCES };
  }

  return {
    sound_enabled: newRow.sound_enabled,
    sound_effects_enabled: newRow.sound_effects_enabled,
    sound_volume: newRow.sound_volume,
    animations_enabled: newRow.animations_enabled,
    animation_intensity: newRow.animation_intensity as 'full' | 'reduced',
  };
}

/**
 * Updates player preferences for a given profile ID.
 */
export async function updatePlayerPreferences(
  profileId: string,
  updates: Partial<PlayerPreferences>
): Promise<PlayerPreferences> {
  const supabase = getSupabaseServerClient();

  const cleanedUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.sound_enabled === 'boolean') {
    cleanedUpdates.sound_enabled = updates.sound_enabled;
  }
  if (typeof updates.sound_effects_enabled === 'boolean') {
    cleanedUpdates.sound_effects_enabled = updates.sound_effects_enabled;
  }
  if (typeof updates.sound_volume === 'number') {
    cleanedUpdates.sound_volume = Math.max(0, Math.min(100, Math.round(updates.sound_volume)));
  }
  if (typeof updates.animations_enabled === 'boolean') {
    cleanedUpdates.animations_enabled = updates.animations_enabled;
  }
  if (updates.animation_intensity === 'full' || updates.animation_intensity === 'reduced') {
    cleanedUpdates.animation_intensity = updates.animation_intensity;
  }

  // Upsert into player_preferences
  const { data, error } = await supabase
    .from('player_preferences')
    .upsert(
      {
        profile_id: profileId,
        ...cleanedUpdates,
      },
      { onConflict: 'profile_id' }
    )
    .select('sound_enabled, sound_effects_enabled, sound_volume, animations_enabled, animation_intensity')
    .single();

  if (error || !data) {
    throw new Error('Failed to update player preferences: ' + (error?.message || 'Unknown error'));
  }

  return {
    sound_enabled: data.sound_enabled,
    sound_effects_enabled: data.sound_effects_enabled,
    sound_volume: data.sound_volume,
    animations_enabled: data.animations_enabled,
    animation_intensity: data.animation_intensity as 'full' | 'reduced',
  };
}

