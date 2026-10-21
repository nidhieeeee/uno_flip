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

    // Check room and host authorization
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('id, host_id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.host_id !== profile.id) {
      return NextResponse.json({ error: 'Only the room host can start the game' }, { status: 403 });
    }

    // Fetch players
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('id, profile_id, seat_index')
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    if (playersError || !players || players.length < 2) {
      return NextResponse.json({ error: 'At least 2 players are required to start the game' }, { status: 400 });
    }

    // Generate and shuffle canonical 112-card Uno Flip deck
    const deck = shuffleDeck(generateUnoFlipDeck());

    // Deal 7 cards to each player
    const playerHands: Record<string, UnoFlipCard[]> = {};
    for (const player of players) {
      playerHands[player.profile_id] = [];
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) playerHands[player.profile_id].push(card);
      }
    }

    // Draw valid starting card for discard pile
    const { startingCard, remainingPile } = drawValidStartingCard(deck);

    // Save hands into game_player_hands
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

    // Save private deck
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

    // Update room to playing status
    const startAction = {
      type: 'start',
      playerId: profile.id,
      playerName: 'Host',
      message: `Game started! First card is ${startingCard.light.color} ${startingCard.light.value ?? startingCard.light.type}.`,
      timestamp: Date.now(),
    };

    const { error: updateRoomError } = await supabase
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
        last_action: startAction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateRoomError) {
      return NextResponse.json({ error: updateRoomError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
