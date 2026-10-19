import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '../supabase/server';
import { PlayerProfile } from './types';

export const SESSION_COOKIE_NAME = 'uno_player_session';

const AVATAR_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export function getRandomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Retrieves the current player profile from the session cookie, or creates a new one.
 */
export async function getOrCreateCurrentProfile(
  customNickname?: string,
  customAvatarColor?: string
): Promise<{ profile: PlayerProfile; token: string }> {
  const cookieStore = await cookies();
  let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const supabase = getSupabaseServerClient();

  if (token) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, session_token, nickname, avatar_color, created_at, last_seen_at')
      .eq('session_token', token)
      .maybeSingle();

    if (existingProfile) {
      // Update last seen
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existingProfile.id);

      return {
        profile: {
          id: existingProfile.id,
          nickname: existingProfile.nickname,
          avatar_color: existingProfile.avatar_color,
          created_at: existingProfile.created_at,
          last_seen_at: existingProfile.last_seen_at,
        },
        token,
      };
    }
  }

  // Generate new token & profile
  token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const nickname = (customNickname && customNickname.trim()) || `Player ${randomSuffix}`;
  const avatarColor = customAvatarColor || getRandomAvatarColor();

  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      session_token: token,
      nickname,
      avatar_color: avatarColor,
    })
    .select('id, session_token, nickname, avatar_color, created_at, last_seen_at')
    .single();

  if (error || !newProfile) {
    throw new Error('Failed to create player profile: ' + (error?.message || 'unknown error'));
  }

  // Set HTTP-only cookie for 1 year
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return {
    profile: {
      id: newProfile.id,
      nickname: newProfile.nickname,
      avatar_color: newProfile.avatar_color,
      created_at: newProfile.created_at,
      last_seen_at: newProfile.last_seen_at,
    },
    token,
  };
}

/**
 * Updates the current player's profile (nickname, avatar color).
 */
export async function updateCurrentProfile(nickname: string, avatarColor?: string): Promise<PlayerProfile> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const { profile } = await getOrCreateCurrentProfile(nickname, avatarColor);
    return profile;
  }

  const supabase = getSupabaseServerClient();
  const updates: Record<string, string> = { nickname: nickname.trim() };
  if (avatarColor) updates.avatar_color = avatarColor;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('session_token', token)
    .select('id, session_token, nickname, avatar_color, created_at, last_seen_at')
    .single();

  if (error || !data) {
    const { profile } = await getOrCreateCurrentProfile(nickname, avatarColor);
    return profile;
  }

  return {
    id: data.id,
    nickname: data.nickname,
    avatar_color: data.avatar_color,
    created_at: data.created_at,
    last_seen_at: data.last_seen_at,
  };
}
