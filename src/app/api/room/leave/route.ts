import { NextResponse } from 'next/server';
import { getOrCreateCurrentProfile } from '@/lib/game/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId } = body;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const { profile } = await getOrCreateCurrentProfile();
    const supabase = getSupabaseServerClient();

    // Check player entry
    const { data: player } = await supabase
      .from('game_players')
      .select('id, is_host')
      .eq('room_id', roomId)
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (!player) {
      return NextResponse.json({ success: true, message: 'Already left' });
    }

    // Remove player
    await supabase
      .from('game_players')
      .delete()
      .eq('id', player.id);

    await supabase
      .from('game_player_hands')
      .delete()
      .eq('room_id', roomId)
      .eq('profile_id', profile.id);

    // Check remaining players
    const { data: remainingPlayers } = await supabase
      .from('game_players')
      .select('id, profile_id')
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true });

    if (!remainingPlayers || remainingPlayers.length === 0) {
      await supabase
        .from('game_rooms')
        .update({ status: 'abandoned' })
        .eq('id', roomId);
    } else if (player.is_host) {
      // Reassign host
      const newHost = remainingPlayers[0];
      await supabase
        .from('game_players')
        .update({ is_host: true, is_ready: true })
        .eq('id', newHost.id);

      await supabase
        .from('game_rooms')
        .update({ host_id: newHost.profile_id })
        .eq('id', roomId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
