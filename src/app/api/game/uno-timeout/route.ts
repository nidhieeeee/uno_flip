import { NextResponse } from 'next/server';
import { processUnoTimeout } from '@/lib/game/engine';
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

    if (!room.uno_declaration_deadline || !room.uno_declaration_player_id) {
      return NextResponse.json({ success: true, message: 'No UNO declaration deadline active' });
    }

    // Verify UNO declaration deadline has strictly expired
    const now = Date.now();
    const deadlineMs = new Date(room.uno_declaration_deadline).getTime();
    if (now < deadlineMs) {
      return NextResponse.json({
        success: false,
        error: 'UNO declaration deadline has not expired yet',
        remainingMs: deadlineMs - now,
      }, { status: 400 });
    }

    const targetPlayerId = room.uno_declaration_player_id;

    // 2. Fetch Target Player
    const { data: targetData } = await supabase
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
      .eq('profile_id', targetPlayerId)
      .single();

    if (!targetData) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 });
    }

    const targetPlayer: GamePlayer = {
      ...targetData,
      profile: (targetData.profiles as any) || undefined,
    };

    // If player already called UNO or has more/less than 1 card, penalty does not apply
    if (targetPlayer.has_called_uno || targetPlayer.card_count !== 1) {
      await supabase
        .from('game_rooms')
        .update({
          uno_declaration_deadline: null,
          uno_declaration_player_id: null,
          uno_challenge_target: null,
          updated_at: new Date(now).toISOString(),
        })
        .eq('id', roomId);

      return NextResponse.json({ success: true, message: 'Player not vulnerable for UNO penalty' });
    }

    // 3. Fetch Target Hand
    const { data: handData, error: handError } = await supabase
      .from('game_player_hands')
      .select('cards')
      .eq('room_id', roomId)
      .eq('profile_id', targetPlayerId)
      .single();

    if (handError || !handData || !Array.isArray(handData.cards)) {
      return NextResponse.json({ error: 'Failed to access target player hand' }, { status: 500 });
    }

    const targetHand: UnoFlipCard[] = handData.cards;

    // 4. Fetch Deck
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

    // 5. Process Timeout via Engine
    const result = processUnoTimeout({
      room,
      targetPlayer,
      targetHand,
      drawPile,
      discardPile,
      currentTime: now,
    });

    if (!result.success || !result.updatedTargetHand) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to apply UNO penalty',
      }, { status: 400 });
    }

    // 6. Atomic Update Guard: Only apply if uno_declaration_deadline hasn't changed
    const { data: updatedRooms, error: updateError } = await supabase
      .from('game_rooms')
      .update({
        ...result.updatedRoom,
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', roomId)
      .eq('uno_declaration_deadline', room.uno_declaration_deadline)
      .select('id');

    if (updateError || !updatedRooms || updatedRooms.length === 0) {
      return NextResponse.json({ success: true, message: 'UNO timeout already handled' });
    }

    // 7. Update target player hand & record
    await supabase
      .from('game_player_hands')
      .update({
        cards: result.updatedTargetHand,
        updated_at: new Date(now).toISOString(),
      })
      .eq('room_id', roomId)
      .eq('profile_id', targetPlayerId);

    await supabase
      .from('game_players')
      .update({
        card_count: result.updatedTargetHand.length,
        has_called_uno: false,
      })
      .eq('id', targetPlayer.id);

    // 8. Update private deck
    if (result.updatedDrawPile && result.updatedDiscardPile) {
      await supabase
        .from('game_decks_private')
        .update({
          draw_pile: result.updatedDrawPile,
          discard_pile: result.updatedDiscardPile,
          updated_at: new Date(now).toISOString(),
        })
        .eq('room_id', roomId);
    }

    // 9. Record action log
    if (result.actionLog) {
      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: targetPlayerId,
        action_type: 'challenge_uno',
        details: result.actionLog,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Missed UNO penalty applied',
      actionLog: result.actionLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
