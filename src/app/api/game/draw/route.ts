import { NextResponse } from 'next/server';
import { calculateNextSeat, drawFromPile, isValidPlay } from '@/lib/game/engine';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GameActionLog, GamePlayer, GameRoom, UnoFlipCard } from '@/lib/game/types';

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

    if (room.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    // Prevent duplicate draw requests if decision already pending
    if (room.pending_draw_decision) {
      return NextResponse.json({ error: 'A draw decision is already pending' }, { status: 400 });
    }

    // 2. Fetch Players
    const { data: playersData } = await supabase
      .from('game_players')
      .select('id, profile_id, seat_index, is_connected')
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    const players = playersData || [];
    const currentPlayer = players.find((p) => p.profile_id === profile.id);

    if (!currentPlayer) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 403 });
    }

    if (!currentPlayer.is_connected) {
      // Player is actively submitting a draw; restore their connection status
      await supabase
        .from('game_players')
        .update({ is_connected: true, disconnected_at: null })
        .eq('id', currentPlayer.id);
      currentPlayer.is_connected = true;
    }

    if (currentPlayer.seat_index !== room.current_turn_seat) {
      return NextResponse.json({ error: 'It is not your turn to draw' }, { status: 400 });
    }

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

    // 4. Determine cards to draw (full penalty stack if active, otherwise 1)
    const isPenaltyStack = (room.draw_penalty || 0) > 0;
    const cardsToDraw = isPenaltyStack ? room.draw_penalty : 1;

    const { drawn, newDrawPile, newDiscardPile } = drawFromPile(drawPile, discardPile, cardsToDraw);

    if (drawn.length === 0) {
      return NextResponse.json({ error: 'No cards left in the deck to draw' }, { status: 400 });
    }

    const drawnCard = drawn[0];

    // 5. Append to Player's Hand
    const { data: handData } = await supabase
      .from('game_player_hands')
      .select('cards')
      .eq('room_id', roomId)
      .eq('profile_id', profile.id)
      .single();

    const currentHand: UnoFlipCard[] = (handData?.cards as UnoFlipCard[]) || [];
    const updatedHand = [...currentHand, ...drawn];

    await supabase
      .from('game_player_hands')
      .update({ cards: updatedHand, updated_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('profile_id', profile.id);

    await supabase
      .from('game_players')
      .update({
        card_count: updatedHand.length,
        has_called_uno: false,
      })
      .eq('id', currentPlayer.id);

    const updatedUnoCalledBy = Array.isArray(room.uno_called_by)
      ? room.uno_called_by.filter((id) => id !== profile.id)
      : [];

    const now = new Date();

    // 6. If drawing accumulated penalty, player forfeits turn and no play decision is offered
    if (isPenaltyStack) {
      const nextSeat = calculateNextSeat(currentPlayer.seat_index, players.length, room.direction, 1);
      const turnDeadline = new Date(now.getTime() + 30000).toISOString();

      const actionLog: GameActionLog = {
        type: 'draw',
        playerId: profile.id,
        playerName: profile.nickname,
        drawnCount: drawn.length,
        message: `${profile.nickname} drew +${drawn.length} accumulated penalty cards! Turn passed.`,
        timestamp: now.getTime(),
      };

      await supabase
        .from('game_rooms')
        .update({
          current_turn_seat: nextSeat,
          draw_pile_count: newDrawPile.length,
          draw_penalty: 0,
          uno_challenge_target: null,
          uno_called_by: updatedUnoCalledBy,
          pending_draw_decision: null,
          turn_started_at: now.toISOString(),
          turn_deadline: turnDeadline,
          last_action: actionLog,
          updated_at: now.toISOString(),
        })
        .eq('id', roomId);

      await supabase
        .from('game_decks_private')
        .update({
          draw_pile: newDrawPile,
          discard_pile: newDiscardPile,
          updated_at: now.toISOString(),
        })
        .eq('room_id', roomId);

      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: profile.id,
        action_type: 'draw',
        details: actionLog,
      });

      return NextResponse.json({
        success: true,
        drawnCards: drawn,
        drawnCard,
        myHand: updatedHand,
        isPlayable: false,
        requiresDecision: false,
        drawPenaltyPaid: drawn.length,
      });
    }

    // 7. Regular draw (when no penalty stack): check whether newly drawn card is legally playable
    const isPlayable = isValidPlay(drawnCard, room.top_card, room.current_side, room.active_color, 0);

    if (isPlayable) {
      // 7A. Playable: Give player opportunity to decide (Play or Keep) with 15s deadline
      const decisionDeadline = new Date(now.getTime() + 15000).toISOString();
      const pendingDecision = {
        player_id: profile.id,
        card_id: drawnCard.id,
        card: drawnCard,
        decision_deadline: decisionDeadline,
      };

      const actionLog: GameActionLog = {
        type: 'draw',
        playerId: profile.id,
        playerName: profile.nickname,
        drawnCount: 1,
        message: `${profile.nickname} drew a playable card and is deciding whether to play it.`,
        timestamp: now.getTime(),
      };

      await supabase
        .from('game_rooms')
        .update({
          draw_pile_count: newDrawPile.length,
          uno_challenge_target: null,
          uno_called_by: updatedUnoCalledBy,
          pending_draw_decision: pendingDecision,
          turn_deadline: null, // Normal turn timer is suspended during draw decision
          last_action: actionLog,
          updated_at: now.toISOString(),
        })
        .eq('id', roomId);

      await supabase
        .from('game_decks_private')
        .update({
          draw_pile: newDrawPile,
          discard_pile: newDiscardPile,
          updated_at: now.toISOString(),
        })
        .eq('room_id', roomId);

      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: profile.id,
        action_type: 'draw',
        details: actionLog,
      });

      return NextResponse.json({
        success: true,
        drawnCard,
        myHand: updatedHand,
        isPlayable: true,
        requiresDecision: true,
        pendingDecision,
      });
    }

    // 7B. Unplayable: Automatically end turn and advance to next player
    const nextSeat = calculateNextSeat(currentPlayer.seat_index, players.length, room.direction, 1);
    const turnDeadline = new Date(now.getTime() + 30000).toISOString();

    const actionLog: GameActionLog = {
      type: 'draw',
      playerId: profile.id,
      playerName: profile.nickname,
      drawnCount: 1,
      message: `${profile.nickname} drew an unplayable card. Turn passed.`,
      timestamp: now.getTime(),
    };

    await supabase
      .from('game_rooms')
      .update({
        current_turn_seat: nextSeat,
        draw_pile_count: newDrawPile.length,
        uno_challenge_target: null,
        uno_called_by: updatedUnoCalledBy,
        pending_draw_decision: null,
        turn_started_at: now.toISOString(),
        turn_deadline: turnDeadline,
        last_action: actionLog,
        updated_at: now.toISOString(),
      })
      .eq('id', roomId);

    await supabase
      .from('game_decks_private')
      .update({
        draw_pile: newDrawPile,
        discard_pile: newDiscardPile,
        updated_at: now.toISOString(),
      })
      .eq('room_id', roomId);

    await supabase.from('game_moves').insert({
      room_id: roomId,
      player_id: profile.id,
      action_type: 'draw',
      details: actionLog,
    });

    return NextResponse.json({
      success: true,
      drawnCard,
      myHand: updatedHand,
      isPlayable: false,
      requiresDecision: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
