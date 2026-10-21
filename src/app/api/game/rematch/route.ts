import { NextResponse } from 'next/server';
import { drawValidStartingCard, generateUnoFlipDeck, shuffleDeck } from '@/lib/game/deck';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { UnoFlipCard } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile(req);
    const supabase = getSupabaseServerClient();

    // Verify room
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Fetch players
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('id, profile_id, seat_index')
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    if (playersError || !players || players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players to start a rematch' }, { status: 400 });
    }

    // Fresh deck
    const deck = shuffleDeck(generateUnoFlipDeck());

    // Deal 7 cards
    const playerHands: Record<string, UnoFlipCard[]> = {};
    for (const player of players) {
      playerHands[player.profile_id] = [];
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) playerHands[player.profile_id].push(card);
      }
    }

    const { startingCard, remainingPile } = drawValidStartingCard(deck);

    for (const player of players) {
      const hand = playerHands[player.profile_id];
      await supabase
        .from('game_player_hands')
        .upsert(
          {
            room_id: roomId,
            profile_id: player.profile_id,
            cards: hand,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'room_id,profile_id' }
        );

      await supabase
        .from('game_players')
        .update({
          card_count: hand.length,
          has_called_uno: false,
        })
        .eq('id', player.id);
    }

    await supabase
      .from('game_decks_private')
      .upsert(
        {
          room_id: roomId,
          draw_pile: remainingPile,
          discard_pile: [startingCard],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_id' }
      );

    const rematchAction = {
      type: 'start',
      playerId: profile.id,
      playerName: profile.nickname,
      message: `🔄 Rematch started! Light Side active. Starting card: ${startingCard.light.color} ${startingCard.light.value ?? startingCard.light.type}.`,
      timestamp: Date.now(),
    };

    await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        current_side: 'light',
        active_color: startingCard.light.color,
        top_card: startingCard,
        current_turn_seat: 0,
        direction: 1,
        draw_pile_count: remainingPile.length,
        draw_penalty: 0,
        winner_id: null,
        uno_called_by: [],
        pending_color_selection: false,
        last_action: rematchAction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
