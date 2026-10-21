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

    const { profile, token } = await getOrCreateCurrentProfile(req);
    const supabase = getSupabaseServerClient();

    let { data: player } = await supabase
      .from('game_players')
      .update({ is_ready: Boolean(isReady) })
      .eq('room_id', roomId)
      .eq('profile_id', profile.id)
      .select('id, is_ready')
      .maybeSingle();

    // Self-healing: if player row not found, auto-insert into room if in lobby status
    if (!player) {
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id, status, max_players')
        .eq('id', roomId)
        .maybeSingle();

      if (room && room.status === 'lobby') {
        const { data: currentPlayers } = await supabase
          .from('game_players')
          .select('seat_index')
          .eq('room_id', roomId);

        const takenSeats = new Set(currentPlayers?.map((p) => p.seat_index));
        let availableSeat = 0;
        while (takenSeats.has(availableSeat)) {
          availableSeat++;
        }

        if (availableSeat < room.max_players) {
          const { data: newPlayer } = await supabase
            .from('game_players')
            .insert({
              room_id: roomId,
              profile_id: profile.id,
              seat_index: availableSeat,
              is_ready: Boolean(isReady),
              is_host: false,
              is_connected: true,
              card_count: 0,
            })
            .select('id, is_ready')
            .maybeSingle();

          player = newPlayer;
        }
      }
    }

    if (!player) {
      return NextResponse.json({ error: 'Player not found in room' }, { status: 404 });
    }

    return NextResponse.json({ success: true, isReady: player.is_ready, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
