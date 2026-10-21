import { NextResponse } from 'next/server';
import { isValidPlay, processCardPlay } from '@/lib/game/engine';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CardColor, GamePlayer, GameRoom, UnoFlipCard } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, cardId, chosenColor, calledUno } = body;

    if (!roomId || !cardId) {
      return NextResponse.json({ error: 'Room ID and Card ID are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Game is not currently active' }, { status: 400 });
    }

    // 2. Fetch Players
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
      profile: p.profiles ? {
        id: p.profiles.id,
        nickname: p.profiles.nickname,
        avatar_color: p.profiles.avatar_color,
      } : undefined,
    }));

    const currentPlayer = players.find((p) => p.profile_id === profile.id);
    if (!currentPlayer) {
      return NextResponse.json({ error: 'You are not a player in this room' }, { status: 403 });
    }

    if (!currentPlayer.is_connected) {
      return NextResponse.json({ error: 'You are disconnected and cannot make moves' }, { status: 403 });
    }

    // 3. Verify it is this player's turn
    if (currentPlayer.seat_index !== room.current_turn_seat) {
      return NextResponse.json({ error: "It is not your turn!" }, { status: 400 });
    }

    // 4. Fetch Player's Private Hand
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
    const cardToPlay = myHand.find((c) => c.id === cardId);

    if (!cardToPlay) {
      return NextResponse.json({ error: 'Card not found in your hand' }, { status: 400 });
    }

    const activeFace = room.current_side === 'light' ? cardToPlay.light : cardToPlay.dark;

    // 5. If Wild card and color not selected yet, prompt color selection
    if (activeFace.color === 'wild' && !chosenColor) {
      return NextResponse.json({
        requiresColorSelection: true,
        cardId: cardToPlay.id,
        side: room.current_side,
      });
    }

    // 6. Validate move against top card and active color
    const valid = isValidPlay(cardToPlay, room.top_card, room.current_side, room.active_color);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid card play for current top card and color' }, { status: 400 });
    }

    // 7. Fetch Private Deck
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

    // 8. Calculate remaining hand
    const remainingHand = myHand.filter((c) => c.id !== cardId);
    const hasCalledUnoNow = Boolean(calledUno) || (remainingHand.length === 1 && currentPlayer.has_called_uno);

    // 9. Process Play with Game Engine
    const result = processCardPlay({
      room,
      player: currentPlayer,
      players,
      card: cardToPlay,
      chosenColor: chosenColor as CardColor,
      drawPile,
      discardPile,
      calledUno: hasCalledUnoNow,
      remainingHandLength: remainingHand.length,
    });

    // 10. Check Win Condition
    let isWinner = false;
    if (remainingHand.length === 0) {
      // Rule: Player must have called UNO when holding 1 card before playing it to win!
      if (!currentPlayer.has_called_uno && !calledUno) {
        return NextResponse.json(
          { error: 'You must call UNO before playing your last card!', requiresUnoCall: true },
          { status: 400 }
        );
      }
      isWinner = true;
      result.updatedRoom.status = 'finished';
      result.updatedRoom.winner_id = profile.id;
      result.updatedRoom.turn_deadline = null;
      result.updatedRoom.turn_started_at = null;
      result.updatedRoom.uno_declaration_deadline = null;
      result.updatedRoom.uno_declaration_player_id = null;
      result.actionLog.message = `🎉 ${currentPlayer.profile?.nickname || 'Player'} has won the game!`;
    }

    // 11. If opponents received penalty cards, update their hands & card counts
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

      // Remove from room uno_called_by if they had previously called UNO
      if (Array.isArray(result.updatedRoom.uno_called_by)) {
        result.updatedRoom.uno_called_by = result.updatedRoom.uno_called_by.filter(
          (id) => id !== result.affectedPlayerId
        );
      }
    }

    // 12. Save Current Player's Hand & Card Count
    await supabase
      .from('game_player_hands')
      .update({ cards: remainingHand, updated_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('profile_id', profile.id);

    await supabase
      .from('game_players')
      .update({
        card_count: remainingHand.length,
        has_called_uno: remainingHand.length === 1 ? hasCalledUnoNow : false,
      })
      .eq('id', currentPlayer.id);

    // 13. Update Room
    const updatedRoomData = {
      ...result.updatedRoom,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('game_rooms')
      .update(updatedRoomData)
      .eq('id', roomId);

    // 14. Update Private Deck
    await supabase
      .from('game_decks_private')
      .update({
        draw_pile: result.updatedDrawPile,
        discard_pile: result.updatedDiscardPile,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId);

    // 15. Record Move
    await supabase.from('game_moves').insert({
      room_id: roomId,
      player_id: profile.id,
      action_type: 'play',
      details: result.actionLog,
    });

    return NextResponse.json({
      success: true,
      myHand: remainingHand,
      isWinner,
      actionLog: result.actionLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
