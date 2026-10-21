import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { processPlayerDeparture } from '@/lib/game/engine';
import { GamePlayer, GameRoom } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, targetPlayerId } = body;

    if (!roomId || !targetPlayerId) {
      return NextResponse.json({ error: 'Room ID and Target Player ID are required' }, { status: 400 });
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
        disconnected_at,
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
      disconnected_at: p.disconnected_at,
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

    const targetPlayer = players.find((p) => p.profile_id === targetPlayerId);
    if (!targetPlayer) {
      return NextResponse.json({ success: true, message: 'Target player already departed' });
    }

    // If player reconnected in the meantime, do not forfeit them!
    if (targetPlayer.is_connected) {
      return NextResponse.json({ success: true, message: 'Player has reconnected' });
    }

    // Verify 15-second grace period has strictly passed (allowing 500ms network variance)
    if (targetPlayer.disconnected_at) {
      const disconnectedTime = new Date(targetPlayer.disconnected_at).getTime();
      const elapsed = now - disconnectedTime;
      if (elapsed < 14500) {
        return NextResponse.json({
          success: false,
          error: `Grace period still active (${Math.ceil((15000 - elapsed) / 1000)}s remaining)`,
        }, { status: 400 });
      }
    }

    // 3. Process Authoritative Departure
    const departureResult = processPlayerDeparture({
      room,
      players,
      departingPlayerId: targetPlayerId,
      reason: 'disconnect_timeout',
      currentTime: now,
    });

    // 4. Remove player and hand from DB
    await supabase.from('game_players').delete().eq('id', targetPlayer.id);
    await supabase.from('game_player_hands').delete().eq('room_id', roomId).eq('profile_id', targetPlayerId);

    // 5. Host reassignment if needed
    const finalUpdatedRoom = { ...departureResult.updatedRoom };
    if (targetPlayer.is_host && departureResult.remainingPlayers.length > 0) {
      const newHost = departureResult.remainingPlayers[0];
      await supabase
        .from('game_players')
        .update({ is_host: true, is_ready: true })
        .eq('id', newHost.id);

      finalUpdatedRoom.host_id = newHost.profile_id;
    }

    // 6. Update Game Room (status, winner, rotation, turn deadline, last_action)
    await supabase
      .from('game_rooms')
      .update({
        ...finalUpdatedRoom,
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', roomId);

    // 7. Log Move Action
    if (departureResult.actionLog) {
      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: targetPlayerId,
        action_type: departureResult.actionLog.type,
        details: departureResult.actionLog,
      });
    }

    return NextResponse.json({
      success: true,
      message: departureResult.actionLog?.message || 'Disconnect timeout processed',
      isGameOver: departureResult.isGameOver,
      winnerPlayerId: departureResult.winnerPlayerId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
