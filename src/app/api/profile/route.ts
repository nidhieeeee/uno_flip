import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile, updateCurrentProfile } from '@/lib/game/session';

export async function GET(req: Request) {
  try {
    const { profile, token } = await getOrCreateCurrentProfile(req);
    return NextResponse.json({ profile, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nickname, avatarColor } = body;
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      return NextResponse.json({ error: 'Valid nickname is required' }, { status: 400 });
    }

    const { profile, token } = await updateCurrentProfile(nickname, avatarColor, req);
    return NextResponse.json({ profile, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
