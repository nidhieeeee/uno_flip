import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GameActionLog, GamePlayer, GameRoom } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, profileId } = body;

    if (!roomId || !profileId) {
      return NextResponse.json({ error: 'Room ID and Profile ID are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const now = Date.now();

    // 1. Fetch Room
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = roomData as GameRoom;
    if (room.status !== 'playing') {
      return NextResponse.json({ success: true, message: 'Game is not playing' });
    }

    // 2. Fetch Player
    const { data: playerData, error: playerError } = await supabase
      .from('game_players')
      .select(`
        id,
        room_id,
        profile_id,
        is_connected,
        disconnected_at,
        profiles (
          id,
          nickname
        )
      `)
      .eq('room_id', roomId)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (playerError || !playerData) {
      return NextResponse.json({ success: true, message: 'Player not found in room' });
    }

    // If player is already marked disconnected, avoid duplicate broadcasts
    if (!playerData.is_connected && playerData.disconnected_at) {
      return NextResponse.json({ success: true, message: 'Player already marked disconnected' });
    }

    const nickname = (playerData.profiles as any)?.nickname || 'Player';
    const disconnectedAt = new Date(now).toISOString();

    // 3. Mark disconnected with timestamp in game_players
    await supabase
      .from('game_players')
      .update({
        is_connected: false,
        disconnected_at: disconnectedAt,
      })
      .eq('id', playerData.id);

    // 4. Update room last_action to notify everyone via Supabase Realtime
    const actionLog: GameActionLog = {
      type: 'player_disconnected',
      playerId: profileId,
      playerName: nickname,
      message: `⚠️ ${nickname} disconnected. 15s grace period to reconnect.`,
      timestamp: now,
    };

    await supabase
      .from('game_rooms')
      .update({
        last_action: actionLog,
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', roomId);

    return NextResponse.json({
      success: true,
      message: `${nickname} marked as disconnected`,
      disconnectedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
