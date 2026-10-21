import { NextResponse } from 'next/server';
import { processTurnTimeout } from '@/lib/game/engine';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GamePlayer, GameRoom, UnoFlipCard } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

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

    if (room.status !== 'playing') {
      return NextResponse.json({ success: true, message: 'Game is not playing' });
    }

    if (!room.turn_deadline) {
      return NextResponse.json({ success: true, message: 'No turn deadline active' });
    }

    // Verify turn deadline has strictly expired
    const now = Date.now();
    const deadlineMs = new Date(room.turn_deadline).getTime();
    if (now < deadlineMs) {
      return NextResponse.json({
        success: false,
        error: 'Turn deadline has not expired yet',
        remainingMs: deadlineMs - now,
      }, { status: 400 });
    }

    // 2. Fetch Players
    const { data: playersData } = await supabase
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
        profiles (id, nickname, avatar_color)
      `)
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    const rawPlayers = playersData || [];
    const players: GamePlayer[] = rawPlayers.map((p) => ({
      ...p,
      profile: (p.profiles as any) || undefined,
    }));

    // 3. Fetch Private Deck
    const { data: deckData, error: deckError } = await supabase
      .from('game_decks_private')
      .select('draw_pile, discard_pile')
      .eq('room_id', roomId)
      .single();

    if (deckError || !deckData) {
      return NextResponse.json({ error: 'Failed to access deck' }, { status: 500 });
    }

    const drawPile: UnoFlipCard[] = deckData.draw_pile || [];
    const discardPile: UnoFlipCard[] = deckData.discard_pile || [];

    // 4. Process timeout via engine
    const timeoutResult = processTurnTimeout({
      room,
      players,
      drawPile,
      discardPile,
      currentTime: now,
    });

    if (!timeoutResult.success || !timeoutResult.updatedRoom) {
      return NextResponse.json({
        success: false,
        error: timeoutResult.error || 'Turn timeout could not be applied',
      }, { status: 400 });
    }

    // 5. Atomic Update Guard: Only update if turn_deadline hasn't changed in DB
    const { data: updatedRooms, error: updateError } = await supabase
      .from('game_rooms')
      .update({
        ...timeoutResult.updatedRoom,
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', roomId)
      .eq('turn_deadline', room.turn_deadline)
      .select('id');

    if (updateError || !updatedRooms || updatedRooms.length === 0) {
      // Another client already resolved this turn deadline
      return NextResponse.json({ success: true, message: 'Turn timeout already handled by another event' });
    }

    // 6. If card was drawn for a player, append to their hand in DB
    if (timeoutResult.penalizedPlayer && timeoutResult.drawnCard) {
      const penalizedProfileId = timeoutResult.penalizedPlayer.profile_id;
      const { data: handData } = await supabase
        .from('game_player_hands')
        .select('cards')
        .eq('room_id', roomId)
        .eq('profile_id', penalizedProfileId)
        .single();

      const existingHand: UnoFlipCard[] = (handData?.cards as UnoFlipCard[]) || [];
      const updatedHand = [...existingHand, timeoutResult.drawnCard];

      await supabase
        .from('game_player_hands')
        .update({ cards: updatedHand, updated_at: new Date(now).toISOString() })
        .eq('room_id', roomId)
        .eq('profile_id', penalizedProfileId);

      await supabase
        .from('game_players')
        .update({
          card_count: updatedHand.length,
          has_called_uno: false,
        })
        .eq('id', timeoutResult.penalizedPlayer.id);
    }

    // 7. Update private deck if changed
    if (timeoutResult.updatedDrawPile && timeoutResult.updatedDiscardPile) {
      await supabase
        .from('game_decks_private')
        .update({
          draw_pile: timeoutResult.updatedDrawPile,
          discard_pile: timeoutResult.updatedDiscardPile,
          updated_at: new Date(now).toISOString(),
        })
        .eq('room_id', roomId);
    }

    // 8. Record action move
    if (timeoutResult.actionLog) {
      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: timeoutResult.actionLog.playerId,
        action_type: timeoutResult.actionLog.type,
        details: timeoutResult.actionLog,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Turn timeout applied',
      actionLog: timeoutResult.actionLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
