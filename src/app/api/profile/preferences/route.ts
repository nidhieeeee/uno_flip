import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getPlayerPreferences, updatePlayerPreferences, PlayerPreferences } from '@/lib/game/preferences';

export async function GET(req: Request) {
  try {
    const { profile, token } = await getOrCreateCurrentProfile(req);
    const preferences = await getPlayerPreferences(profile.id);

    return NextResponse.json({
      preferences,
      profileId: profile.id,
      token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { profile, token } = await getOrCreateCurrentProfile(req);
    const body = await req.json();

    const preferences = await updatePlayerPreferences(profile.id, body as Partial<PlayerPreferences>);

    return NextResponse.json({
      preferences,
      profileId: profile.id,
      token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

