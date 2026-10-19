import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GamePlayer, GameRoom, UnoFlipCard } from '@/lib/game/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const roomId = searchParams.get('roomId');

    if (!code && !roomId) {
      return NextResponse.json({ error: 'Room code or roomId is required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile();
    const supabase = getSupabaseServerClient();

    // Fetch room
    let roomQuery = supabase.from('game_rooms').select('*');
    if (roomId) {
      roomQuery = roomQuery.eq('id', roomId);
    } else if (code) {
      roomQuery = roomQuery.eq('code', code.trim().toUpperCase());
    }

    const { data: room, error: roomError } = await roomQuery.maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Fetch players with their profiles
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
      .eq('room_id', room.id)
      .order('seat_index', { ascending: true });

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }

    const players: GamePlayer[] = (playersData || []).map((p: any) => ({
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

    const me = players.find((p) => p.profile_id === profile.id);

    // Fetch private hand ONLY for the current player
    let myHand: UnoFlipCard[] = [];
    if (me && room.status === 'playing') {
      const { data: handData } = await supabase
        .from('game_player_hands')
        .select('cards')
        .eq('room_id', room.id)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (handData && Array.isArray(handData.cards)) {
        myHand = handData.cards;
      }
    }

    return NextResponse.json({
      room: room as GameRoom,
      players,
      me: me || null,
      myHand,
      currentProfile: profile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
