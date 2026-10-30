'use client';

import React, { useState } from 'react';
import { GamePlayer, GameRoom, PlayerProfile } from '@/lib/game/types';
import { UfLogo } from '../common/UfLogo';
import { SettingsModal } from '../modals/SettingsModal';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Edit2,
  HelpCircle,
  LogOut,
  Play,
  Settings,
  Share2,
  Users,
} from 'lucide-react';

interface LobbyScreenProps {
  room: GameRoom;
  players: GamePlayer[];
  me: GamePlayer | null;
  currentProfile: PlayerProfile | null;
  onToggleReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onUpdateProfile: (nickname: string, avatarColor?: string) => void;
  onOpenHowToPlay: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  players,
  me,
  currentProfile,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onUpdateProfile,
  onOpenHowToPlay,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(currentProfile?.nickname || '');
  const [showSettings, setShowSettings] = useState(false);

  const isHost = me?.is_host ?? false;
  const canStart = isHost && players.length >= 2;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInviteLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}?room=${room.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (nicknameInput.trim()) {
      onUpdateProfile(nicknameInput.trim());
      setIsEditingName(false);
    }
  };

  // 4 Player Slots
  const totalSlots = 4;
  const slots: (GamePlayer | null)[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const player = players.find((p) => p.seat_index === i);
    slots.push(player || null);
  }

  return (
    <div className="min-h-screen bg-[url('/background.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white flex flex-col justify-between p-3 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] relative">
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-3xl mx-auto flex items-center justify-between border border-[#2D333B]/80 bg-[#15191F]/75 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <UfLogo size="sm" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              UNO FLIP <span className="text-[#9BA3AF] font-normal text-xs">/ Lobby</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="min-h-[36px] sm:min-h-[40px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#2D333B] text-xs text-[#9BA3AF] hover:text-[#FFCC00] hover:bg-[#1E232B] active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="Game Settings"
          >
            <Settings className="w-3.5 h-3.5 text-[#FFCC00]" />
            <span className="hidden xs:inline">Settings</span>
          </button>
          <button
            onClick={onOpenHowToPlay}
            className="min-h-[36px] sm:min-h-[40px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#2D333B] text-xs text-[#9BA3AF] hover:text-white hover:bg-[#1E232B] active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#FFCC00]" />
            <span>Rules</span>
          </button>
          <button
            onClick={onLeaveRoom}
            className="min-h-[36px] sm:min-h-[40px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#2D333B] text-xs text-[#9BA3AF] hover:text-[#ED1C24] hover:bg-[#1E232B] active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-2xl mx-auto my-auto flex flex-col items-center px-1">
        {/* Room Code Banner */}
        <div className="w-full rounded-2xl bg-[#1E232B]/90 backdrop-blur-md border border-[#2D333B]/80 p-4 sm:p-6 mb-4 sm:mb-5 text-center flex flex-col items-center shadow-2xl">
          <span className="text-xs text-[#9BA3AF] uppercase tracking-wider font-medium">
            Room Code
          </span>

          <div className="flex items-center gap-3 my-2">
            <span className="font-mono text-3xl sm:text-4xl font-bold tracking-widest text-[#FFCC00]">
              {room.code}
            </span>
            <button
              onClick={copyRoomCode}
              title="Copy code"
              className="min-w-[44px] min-h-[44px] p-2 rounded-lg border border-[#2D333B] text-[#9BA3AF] hover:text-white hover:bg-[#15191F] active:scale-95 transition-all flex items-center justify-center touch-manipulation cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-[#27AE60]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={shareInviteLink}
            className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#9BA3AF] hover:text-white active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#FFCC00]" />
            <span>{copied ? 'Link Copied!' : 'Share invite link'}</span>
          </button>
        </div>

        {/* Players Grid (4 slots) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {slots.map((player, idx) => {
            if (!player) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="rounded-lg border border-dashed border-[#2D333B] bg-[#1E232B]/40 p-4 flex flex-col items-center justify-center min-h-[120px] text-center"
                >
                  <Users className="w-4 h-4 text-[#9BA3AF]/40 mb-1.5" />
                  <span className="text-xs text-[#9BA3AF]">Open Seat</span>
                </div>
              );
            }

            const isCurrentMe = player.profile_id === currentProfile?.id;
            const nickname = player.profile?.nickname || `Player ${idx + 1}`;
            const avatarBg = player.profile?.avatar_color || '#1677E8';

            return (
              <div
                key={player.id}
                className={`rounded-lg border p-3.5 flex flex-col items-center justify-between min-h-[120px] text-center relative ${
                  isCurrentMe
                    ? 'bg-[#1E232B] border-[#FFCC00]'
                    : 'bg-[#1E232B] border-[#2D333B]'
                }`}
              >
                {/* Host indicator */}
                {player.is_host && (
                  <div
                    className="absolute top-2 left-2 text-[#FFCC00]"
                    title="Room Host"
                  >
                    <Crown className="w-3.5 h-3.5 fill-current" />
                  </div>
                )}

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white mb-1.5 border border-white/20"
                  style={{ backgroundColor: avatarBg }}
                >
                  {nickname.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-xs font-semibold text-white truncate max-w-full">
                    {nickname}
                  </span>
                  {isCurrentMe && (
                    <span className="text-[10px] text-[#FFCC00] font-medium">(You)</span>
                  )}
                </div>

                {/* Status */}
                <div className="mt-2">
                  {player.is_host ? (
                    <span className="text-[10px] font-bold text-[#FFCC00]">Host</span>
                  ) : player.is_ready ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#27AE60]">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#9BA3AF]">Not Ready</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Change Nickname Inline */}
        <div className="w-full flex items-center justify-center mb-5">
          {isEditingName ? (
            <form onSubmit={handleSaveNickname} className="flex items-center gap-2">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={18}
                autoFocus
                className="px-3 py-1.5 rounded-lg bg-[#15191F] border border-[#2D333B] text-xs text-white focus:outline-none focus:border-[#FFCC00]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#FFCC00] text-[#15191F] font-bold text-xs hover:bg-[#E6B800] transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-2 py-1.5 text-xs text-[#9BA3AF] hover:text-white"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setNicknameInput(currentProfile?.nickname || '');
                setIsEditingName(true);
              }}
              className="flex items-center gap-1.5 text-xs text-[#9BA3AF] hover:text-white transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit your name</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full max-w-xs flex flex-col gap-2">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`w-full min-h-[48px] py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all touch-manipulation ${
                canStart
                  ? 'bg-[#FFCC00] text-[#15191F] hover:bg-[#E6B800] active:scale-95 cursor-pointer shadow-md'
                  : 'bg-[#1E232B] text-[#9BA3AF] border border-[#2D333B] cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{players.length < 2 ? 'Need 2+ Players' : 'Start Game'}</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleReady(!me?.is_ready)}
              className={`w-full min-h-[48px] py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-95 ${
                me?.is_ready
                  ? 'bg-[#27AE60] text-white hover:bg-[#219653]'
                  : 'bg-[#FFCC00] text-[#15191F] hover:bg-[#E6B800]'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{me?.is_ready ? 'Ready (Click to Cancel)' : 'Ready Up'}</span>
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto text-center text-xs text-[#9BA3AF] pt-3 border-t border-[#2D333B]">
        2–4 players. The host starts when players are ready.
      </footer>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
