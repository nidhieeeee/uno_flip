export type Side = 'light' | 'dark';

export type LightColor = 'red' | 'yellow' | 'green' | 'blue';
export type DarkColor = 'pink' | 'teal' | 'orange' | 'purple';
export type CardColor = LightColor | DarkColor;

export type LightCardType =
  | 'number'
  | 'draw_one'
  | 'draw_two'
  | 'reverse'
  | 'skip'
  | 'flip'
  | 'wild'
  | 'wild_draw_two';

export type DarkCardType =
  | 'number'
  | 'draw_two'
  | 'draw_five'
  | 'reverse'
  | 'skip_everyone'
  | 'flip'
  | 'wild'
  | 'wild_draw_color';

export interface CardFace<TColor, TType> {
  color: TColor | 'wild';
  type: TType;
  value?: number; // 1-9 for number cards
}

export type LightCardFace = CardFace<LightColor, LightCardType>;
export type DarkCardFace = CardFace<DarkColor, DarkCardType>;

export interface UnoFlipCard {
  id: string; // e.g. "c-001"
  light: LightCardFace;
  dark: DarkCardFace;
}

export type RoomStatus = 'lobby' | 'playing' | 'finished' | 'abandoned';

export interface PlayerProfile {
  id: string;
  nickname: string;
  avatar_color: string;
  created_at?: string;
  last_seen_at?: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  profile_id: string;
  seat_index: number;
  is_ready: boolean;
  is_host: boolean;
  is_connected: boolean;
  disconnected_at?: string | null;
  card_count: number;
  has_called_uno: boolean;
  profile?: PlayerProfile;
}

export interface PendingDrawDecision {
  player_id: string;
  card_id: string;
  card: UnoFlipCard;
  decision_deadline: string;
}

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  max_players: number;
  current_side: Side;
  active_color: CardColor | null;
  current_turn_seat: number;
  direction: 1 | -1;
  top_card: UnoFlipCard | null;
  draw_pile_count: number;
  draw_penalty: number;
  winner_id: string | null;
  win_reason?: string | null;
  uno_called_by: string[];
  pending_color_selection: boolean;
  uno_challenge_target?: string | null;
  turn_started_at?: string | null;
  turn_deadline?: string | null;
  uno_declaration_deadline?: string | null;
  uno_declaration_player_id?: string | null;
  pending_draw_decision?: PendingDrawDecision | null;
  last_action: GameActionLog | null;
  created_at: string;
  updated_at: string;
}

export interface GameActionLog {
  type:
    | 'start'
    | 'play'
    | 'draw'
    | 'flip'
    | 'pass'
    | 'color_select'
    | 'call_uno'
    | 'challenge_uno'
    | 'win'
    | 'player_left'
    | 'player_disconnected'
    | 'player_reconnected'
    | 'forfeit';
  playerId: string;
  playerName: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  card?: UnoFlipCard;
  side?: Side;
  chosenColor?: CardColor;
  drawnCount?: number;
  message: string;
  timestamp: number;
}

export interface ClientGameState {
  room: GameRoom;
  players: GamePlayer[];
  me: GamePlayer;
  myHand: UnoFlipCard[];
}
