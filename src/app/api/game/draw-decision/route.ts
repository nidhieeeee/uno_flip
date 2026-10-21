import { NextResponse } from 'next/server';
import { processDrawDecision } from '@/lib/game/engine';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CardColor, GamePlayer, GameRoom, UnoFlipCard } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, action, chosenColor } = body;

    if (!roomId || !action || !['play', 'keep'].includes(action)) {
      return NextResponse.json({ error: 'Valid roomId and action (play/keep) required' }, { status: 400 });
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

    if (!room.pending_draw_decision) {
      return NextResponse.json({ error: 'No pending draw decision' }, { status: 400 });
    }

    if (room.pending_draw_decision.player_id !== profile.id) {
      return NextResponse.json({ error: 'Draw decision is not for you' }, { status: 403 });
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

    const currentPlayer = players.find((p) => p.profile_id === profile.id);
    if (!currentPlayer) {
      return NextResponse.json({ error: 'You are not in this game room' }, { status: 403 });
    }

    // 3. Fetch Player's Hand
    const { data: handData, error: handError } = await supabase
      .from('game_player_hands')
      .select('cards')
      .eq('room_id', roomId)
      .eq('profile_id', profile.id)
      .single();

    if (handError || !handData || !Array.isArray(handData.cards)) {
      return NextResponse.json({ error: 'Failed to load your hand' }, { status: 500 });
    }

    const myHand: UnoFlipCard[] = handData.cards;

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

    // 5. Process decision via engine
    const result = processDrawDecision({
      room,
      player: currentPlayer,
      players,
      hand: myHand,
      action: action as 'play' | 'keep',
      chosenColor: chosenColor as CardColor,
      drawPile,
      discardPile,
    });

    if (!result.success) {
      if (result.requiresColorSelection) {
        return NextResponse.json({
          requiresColorSelection: true,
          cardId: result.cardId,
          side: result.side,
        });
      }
      return NextResponse.json({ error: result.error || 'Failed to process draw decision' }, { status: 400 });
    }

    // 6. Save DB state
    if (action === 'keep') {
      await supabase
        .from('game_rooms')
        .update({
          ...result.updatedRoom,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      await supabase.from('game_moves').insert({
        room_id: roomId,
        player_id: profile.id,
        action_type: 'pass',
        details: result.actionLog,
      });

      return NextResponse.json({ success: true, action: 'keep' });
    }

    // action === 'play'
    const remainingHand = result.updatedHand || [];

    // If opponents received penalty cards, update them
    if (result.affectedPlayerId && result.penaltyDrawnCards && result.penaltyDrawnCards.length > 0) {
      const { data: oppHandData } = await supabase
        .from('game_player_hands')
        .select('cards')
        .eq('room_id', roomId)
        .eq('profile_id', result.affectedPlayerId)
        .single();

      const oppHand: UnoFlipCard[] = (oppHandData?.cards as UnoFlipCard[]) || [];
      const updatedOppHand = [...oppHand, ...result.penaltyDrawnCards];

      await supabase
        .from('game_player_hands')
        .update({ cards: updatedOppHand, updated_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('profile_id', result.affectedPlayerId);

      await supabase
        .from('game_players')
        .update({
          card_count: updatedOppHand.length,
          has_called_uno: false,
        })
        .eq('room_id', roomId)
        .eq('profile_id', result.affectedPlayerId);

      if (Array.isArray(result.updatedRoom?.uno_called_by)) {
        result.updatedRoom.uno_called_by = result.updatedRoom.uno_called_by.filter(
          (id) => id !== result.affectedPlayerId
        );
      }
    }

    // Update player hand & count
    await supabase
      .from('game_player_hands')
      .update({ cards: remainingHand, updated_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('profile_id', profile.id);

    await supabase
      .from('game_players')
      .update({
        card_count: remainingHand.length,
        has_called_uno: false,
      })
      .eq('id', currentPlayer.id);

    // Update room
    await supabase
      .from('game_rooms')
      .update({
        ...result.updatedRoom,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    // Update deck
    await supabase
      .from('game_decks_private')
      .update({
        draw_pile: result.updatedDrawPile,
        discard_pile: result.updatedDiscardPile,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId);

    await supabase.from('game_moves').insert({
      room_id: roomId,
      player_id: profile.id,
      action_type: 'play',
      details: result.actionLog,
    });

    return NextResponse.json({
      success: true,
      action: 'play',
      myHand: remainingHand,
      isWinner: result.isWinner,
      actionLog: result.actionLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
