import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const { profile, token } = await getOrCreateCurrentProfile(req);
    const supabase = getSupabaseServerClient();

    let code = generateRoomCode();
    let attempts = 0;

    // Ensure code uniqueness
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        code,
        host_id: profile.id,
        status: 'lobby',
        max_players: 4,
        current_side: 'light',
        current_turn_seat: 0,
        direction: 1,
        draw_pile_count: 0,
      })
      .select('id, code')
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: roomError?.message || 'Failed to create room' }, { status: 500 });
    }

    // Add host as player seat 0
    const { error: playerError } = await supabase.from('game_players').insert({
      room_id: room.id,
      profile_id: profile.id,
      seat_index: 0,
      is_ready: true,
      is_host: true,
      card_count: 0,
    });

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      roomId: room.id,
      roomCode: room.code,
      token,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
