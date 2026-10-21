import { NextResponse } from 'next/server';
import { processUnoChallenge } from '@/lib/game/engine';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GamePlayer, GameRoom, UnoFlipCard } from '@/lib/game/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, targetPlayerId } = body;

    if (!roomId || !targetPlayerId) {
      return NextResponse.json({ error: 'Room ID and target player ID are required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile(req);
    const supabase = getSupabaseServerClient();

    // 1. Prevent players from catching themselves
    if (profile.id === targetPlayerId) {
      return NextResponse.json({ error: 'You cannot catch yourself!' }, { status: 400 });
    }

    // 2. Fetch Room
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

    // 3. Verify catch window is active for this target player
    if (!room.uno_challenge_target || room.uno_challenge_target !== targetPlayerId) {
      return NextResponse.json({
        error: 'The catch window for this player has expired or is not active.',
      }, { status: 400 });
    }

    // 4. Fetch Caller Player
    const { data: callerData } = await supabase
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
      .eq('profile_id', profile.id)
      .single();

    if (!callerData) {
      return NextResponse.json({ error: 'You are not in this game room' }, { status: 403 });
    }

    const callerPlayer: GamePlayer = {
      ...callerData,
      profile: (callerData.profiles as any) || undefined,
    };

    // 5. Fetch Target Player
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
      return NextResponse.json({ error: 'Target player not found in this room' }, { status: 404 });
    }

    const targetPlayer: GamePlayer = {
      ...targetData,
      profile: (targetData.profiles as any) || undefined,
    };

    // 6. Fetch Target Player's Hand
    const { data: handData, error: handError } = await supabase
      .from('game_player_hands')
      .select('cards')
      .eq('room_id', roomId)
      .eq('profile_id', targetPlayerId)
      .single();

    if (handError || !handData || !Array.isArray(handData.cards)) {
      return NextResponse.json({ error: 'Target player hand could not be loaded' }, { status: 500 });
    }

    const targetHand: UnoFlipCard[] = handData.cards;

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

    // 8. Execute authoritative engine validation and penalty resolution
    const challengeResult = processUnoChallenge({
      room,
      callerProfileId: profile.id,
      callerPlayer,
      targetPlayer,
      targetHand,
      drawPile,
      discardPile,
    });

    if (!challengeResult.success || !challengeResult.updatedTargetHand) {
      return NextResponse.json({
        error: challengeResult.error || 'Failed to penalize player.',
      }, { status: 400 });
    }

    // 9. Atomically apply changes to Database & Supabase Realtime
    // Update target player hand
    await supabase
      .from('game_player_hands')
      .update({
        cards: challengeResult.updatedTargetHand,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('profile_id', targetPlayerId);

    // Update target player record
    await supabase
      .from('game_players')
      .update({
        card_count: challengeResult.updatedTargetHand.length,
        has_called_uno: false,
      })
      .eq('id', targetPlayer.id);

    // Update private deck
    await supabase
      .from('game_decks_private')
      .update({
        draw_pile: challengeResult.updatedDrawPile,
        discard_pile: challengeResult.updatedDiscardPile,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId);

    // Update room with closed catch window and action log
    await supabase
      .from('game_rooms')
      .update({
        ...challengeResult.updatedRoom,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    // Log move
    await supabase.from('game_moves').insert({
      room_id: roomId,
      player_id: profile.id,
      action_type: 'challenge_uno',
      details: challengeResult.actionLog,
    });

    return NextResponse.json({
      success: true,
      message: `${targetPlayer.profile?.nickname || 'Player'} caught! +2 penalty cards applied.`,
      actionLog: challengeResult.actionLog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
