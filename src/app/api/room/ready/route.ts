import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, isReady } = body;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile();
    const supabase = getSupabaseServerClient();

    const { data: player, error } = await supabase
      .from('game_players')
      .update({ is_ready: Boolean(isReady) })
      .eq('room_id', roomId)
      .eq('profile_id', profile.id)
      .select('id, is_ready')
      .single();

    if (error || !player) {
      return NextResponse.json({ error: 'Player not found in room' }, { status: 404 });
    }

    return NextResponse.json({ success: true, isReady: player.is_ready });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
