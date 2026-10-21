import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    const { profile, token } = await getOrCreateCurrentProfile(req);
    const supabase = getSupabaseServerClient();

    const normalizedCode = code.trim().toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('id, code, status, max_players, host_id')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found. Please check the code and try again.' }, { status: 404 });
    }

    if (room.status === 'abandoned') {
      return NextResponse.json({ error: 'This room has been abandoned.' }, { status: 400 });
    }

    // Get current players in room
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('id, profile_id, seat_index')
      .eq('room_id', room.id)
      .order('seat_index', { ascending: true });

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }

    // If player is already in room, allow reconnect
    const existingPlayer = players?.find((p) => p.profile_id === profile.id);
    if (existingPlayer) {
      await supabase
        .from('game_players')
        .update({ is_connected: true })
        .eq('id', existingPlayer.id);

      return NextResponse.json({
        success: true,
        roomId: room.id,
        roomCode: room.code,
        token,
        message: 'Reconnected to room',
      });
    }

    // Check if room is active or full
    if (room.status !== 'lobby') {
      return NextResponse.json({ error: 'Game has already started in this room.' }, { status: 400 });
    }

    if ((players?.length || 0) >= room.max_players) {
      return NextResponse.json({ error: 'Room is full (max 4 players).' }, { status: 400 });
    }

    // Find lowest unused seat index
    const takenSeats = new Set(players?.map((p) => p.seat_index));
    let availableSeat = 0;
    while (takenSeats.has(availableSeat)) {
      availableSeat++;
    }

    const { error: insertError } = await supabase.from('game_players').insert({
      room_id: room.id,
      profile_id: profile.id,
      seat_index: availableSeat,
      is_ready: false,
      is_host: false,
      is_connected: true,
      card_count: 0,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
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
