import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { processPlayerDeparture } from '@/lib/game/engine';
import { GamePlayer, GameRoom } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId } = body;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile(req);
    const supabase = getSupabaseServerClient();

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

    // 2. Fetch Players with Profile Info
    const { data: playersData, error: playersError } = await supabase
      .from('game_players')
      .select(`
        id,
        room_id,
        profile_id,
        seat_index,
        is_ready,
        is_host,
        is_connected,
        card_count,
        has_called_uno,
        profiles (
          id,
          nickname,
          avatar_color
        )
      `)
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    if (playersError || !playersData) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    const players: GamePlayer[] = playersData.map((p: any) => ({
      id: p.id,
      room_id: p.room_id,
      profile_id: p.profile_id,
      seat_index: p.seat_index,
      is_ready: p.is_ready,
      is_host: p.is_host,
      is_connected: p.is_connected,
      card_count: p.card_count,
      has_called_uno: p.has_called_uno,
      profile: p.profiles
        ? {
            id: p.profiles.id,
            nickname: p.profiles.nickname,
            avatar_color: p.profiles.avatar_color,
          }
        : undefined,
    }));

    const player = players.find((p) => p.profile_id === profile.id);
    if (!player) {
      return NextResponse.json({ success: true, message: 'Already left' });
    }

    // 3. Process authoritative departure in pure engine
    const departureResult = processPlayerDeparture({
      room,
      players,
      departingPlayerId: profile.id,
      reason: 'leave',
      currentTime: Date.now(),
    });

    // 4. Delete player from room and hands
    await supabase.from('game_players').delete().eq('id', player.id);
    await supabase.from('game_player_hands').delete().eq('room_id', roomId).eq('profile_id', profile.id);

    // 5. Host reassignment if needed
    const finalUpdatedRoom = { ...departureResult.updatedRoom };
    if (player.is_host && departureResult.remainingPlayers.length > 0) {
      const newHost = departureResult.remainingPlayers[0];
      await supabase
        .from('game_players')
        .update({ is_host: true, is_ready: true })
        .eq('id', newHost.id);

      finalUpdatedRoom.host_id = newHost.profile_id;
    }

    // 6. Update Game Room with new state (status, winner, rotation, turn deadline, last_action)
    await supabase
      .from('game_rooms')
      .update({
        ...finalUpdatedRoom,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    // 7. Log move action
    if (departureResult.actionLog) {
      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: profile.id,
        action_type: departureResult.actionLog.type,
        details: departureResult.actionLog,
      });
    }

    return NextResponse.json({
      success: true,
      isGameOver: departureResult.isGameOver,
      winnerPlayerId: departureResult.winnerPlayerId,
      message: departureResult.actionLog?.message || 'Player left',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
