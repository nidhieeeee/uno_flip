import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GameActionLog } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile();
    const supabase = getSupabaseServerClient();

    const { data: player } = await supabase
      .from('game_players')
      .select('id, card_count')
      .eq('room_id', roomId)
      .eq('profile_id', profile.id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found in room' }, { status: 404 });
    }

    // Set has_called_uno = true on player
    await supabase
      .from('game_players')
      .update({ has_called_uno: true })
      .eq('id', player.id);

    // Fetch room to update uno_called_by and cancel any pending catch window
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('uno_called_by, uno_challenge_target')
      .eq('id', roomId)
      .single();

    const unoCalledBy = Array.isArray(roomData?.uno_called_by) ? [...roomData.uno_called_by] : [];
    if (!unoCalledBy.includes(profile.id)) {
      unoCalledBy.push(profile.id);
    }

    const actionLog: GameActionLog = {
      type: 'call_uno',
      playerId: profile.id,
      playerName: profile.nickname,
      message: `🔥 ${profile.nickname} yelled UNO!`,
      timestamp: Date.now(),
    };

    await supabase
      .from('game_rooms')
      .update({
        uno_called_by: unoCalledBy,
        uno_challenge_target: roomData?.uno_challenge_target === profile.id ? null : (roomData?.uno_challenge_target ?? null),
        last_action: actionLog,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    await supabase.from('game_moves').insert({
      room_id: roomId,
      player_id: profile.id,
      action_type: 'call_uno',
      details: actionLog,
    });

    return NextResponse.json({ success: true, message: 'UNO called!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
