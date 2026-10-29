'use client';

import React from 'react';
import { FormattedGameEvent } from '@/lib/game/activityLog';
import {
  Flame,
  FlipHorizontal,
  Layers,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserMinus,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface GameActivityFeedProps {
  events: FormattedGameEvent[];
  className?: string;
}

export const GameActivityFeed: React.FC<GameActivityFeedProps> = ({ events, className = '' }) => {
  if (!events || events.length === 0) return null;

  // Show up to the 3 most recent events
  const recentEvents = events.slice(-3);

  const getEventIcon = (type: FormattedGameEvent['type']) => {
    switch (type) {
      case 'flip':
        return <FlipHorizontal className="w-3 h-3 text-[#FFCC00] shrink-0" />;
      case 'draw':
        return <Layers className="w-3 h-3 text-[#1677E8] shrink-0" />;
      case 'call_uno':
        return <Flame className="w-3 h-3 text-[#ED1C24] shrink-0" />;
      case 'challenge_uno':
        return <ShieldAlert className="w-3 h-3 text-[#ED1C24] shrink-0" />;
      case 'win':
        return <Trophy className="w-3 h-3 text-[#FFCC00] shrink-0" />;
      case 'player_disconnected':
        return <WifiOff className="w-3 h-3 text-[#ED1C24] shrink-0" />;
      case 'player_reconnected':
        return <Wifi className="w-3 h-3 text-[#27AE60] shrink-0" />;
      case 'player_left':
      case 'forfeit':
        return <UserMinus className="w-3 h-3 text-[#9BA3AF] shrink-0" />;
      default:
        return <Sparkles className="w-3 h-3 text-[#27AE60] shrink-0" />;
    }
  };

  return (
    <div
      aria-label="Live Game Activity Feed"
      className={`pointer-events-none flex flex-col gap-1 w-full max-w-[210px] xs:max-w-[240px] sm:max-w-[280px] ${className}`}
    >
      <div className="flex items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-wider text-[#9BA3AF]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse inline-block" />
        <span>Live Feed</span>
      </div>

      <div className="flex flex-col gap-1">
        {recentEvents.map((evt, idx) => {
          const isLatest = idx === recentEvents.length - 1;
          return (
            <div
              key={evt.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#15191F]/90 backdrop-blur-md border transition-all duration-200 shadow-sm ${
                isLatest
                  ? 'border-[#404752] text-white opacity-100 scale-100'
                  : 'border-[#2D333B]/60 text-[#9BA3AF] opacity-80 scale-[0.98]'
              }`}
            >
              {getEventIcon(evt.type)}
              <span className="text-[10px] sm:text-[11px] font-medium leading-tight truncate">
                {evt.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

