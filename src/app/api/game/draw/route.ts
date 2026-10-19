import { NextResponse } from 'next/server';
import { calculateNextSeat, drawFromPile } from '@/lib/game/engine';
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

    const { profile } = await getOrCreateCurrentProfile();
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

    // 2. Fetch Players
    const { data: playersData } = await supabase
      .from('game_players')
      .select('id, profile_id, seat_index')
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    const players = playersData || [];
    const currentPlayer = players.find((p) => p.profile_id === profile.id);

    if (!currentPlayer) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 403 });
    }

    if (currentPlayer.seat_index !== room.current_turn_seat) {
      return NextResponse.json({ error: "It is not your turn to draw" }, { status: 400 });
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

    // 4. Draw 1 card
    const { drawn, newDrawPile, newDiscardPile } = drawFromPile(drawPile, discardPile, 1);

    if (drawn.length === 0) {
      return NextResponse.json({ error: 'No cards left in the deck to draw' }, { status: 400 });
    }

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

    // 6. Advance Turn Seat
    const nextSeat = calculateNextSeat(currentPlayer.seat_index, players.length, room.direction, 1);

    const actionLog: GameActionLog = {
      type: 'draw',
      playerId: profile.id,
      playerName: profile.nickname,
      drawnCount: 1,
      message: `${profile.nickname} drew a card.`,
      timestamp: Date.now(),
    };

    await supabase
      .from('game_rooms')
      .update({
        current_turn_seat: nextSeat,
        draw_pile_count: newDrawPile.length,
        uno_challenge_target: null, // Any previous catch window expires when next player draws
        last_action: actionLog,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    await supabase
      .from('game_decks_private')
      .update({
        draw_pile: newDrawPile,
        discard_pile: newDiscardPile,
        updated_at: new Date().toISOString(),
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
      drawnCard: drawn[0],
      myHand: updatedHand,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
