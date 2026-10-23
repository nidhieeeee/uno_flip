'use client';

import React, { useState } from 'react';
import { PlayerProfile } from '@/lib/game/types';
import { apiFetch, setClientPlayerToken } from '@/lib/game/clientSession';
import { HowToPlayModal } from '../modals/HowToPlayModal';
import { ArrowRight, HelpCircle, Plus, User } from 'lucide-react';

interface HomeScreenProps {
  initialProfile: PlayerProfile | null;
  onEnterRoom: (code: string) => void;
  initialRoomCode?: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  initialProfile,
  onEnterRoom,
  initialRoomCode,
}) => {
  const [customNickname, setCustomNickname] = useState<string | null>(null);
  const [customJoinCode, setCustomJoinCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const nickname = customNickname ?? (initialProfile?.nickname || '');
  const joinCode = customJoinCode ?? (initialRoomCode ? initialRoomCode.toUpperCase() : '');

  const saveNickname = async () => {
    if (!nickname.trim()) return;
    try {
      const res = await apiFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (data.token) {
        setClientPlayerToken(data.token);
      }
    } catch {
      // Ignored
    }
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (nickname.trim() && nickname !== initialProfile?.nickname) {
        await saveNickname();
      }

      const res = await apiFetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      if (data.token) {
        setClientPlayerToken(data.token);
      }

      onEnterRoom(data.roomCode);
    } catch (err: any) {
      setError(err.message || 'Error creating game room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      if (nickname.trim() && nickname !== initialProfile?.nickname) {
        await saveNickname();
      }

      const res = await apiFetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      if (data.token) {
        setClientPlayerToken(data.token);
      }

      onEnterRoom(data.roomCode);
    } catch (err: any) {
      setError(err.message || 'Error joining room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/background.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white flex flex-col justify-between p-4 sm:p-6 relative">
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-3xl mx-auto flex items-center justify-between border border-[#2D333B]/80 bg-[#15191F]/75 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#ED1C24] text-white flex items-center justify-center font-bold text-xs">
            UF
          </div>
          <span className="font-bold text-sm tracking-wide text-white">UNO FLIP</span>
        </div>

        <button
          onClick={() => setShowRules(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D333B] text-xs font-medium text-[#9BA3AF] hover:text-white hover:bg-[#1E232B] transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#FFCC00]" />
          <span>Rules</span>
        </button>
      </header>

      {/* Main Card Container */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto flex flex-col items-center">
        {/* Title & Description */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
            UNO FLIP Online
          </h1>
          <p className="text-xs text-[#9BA3AF]">
            Multiplayer card game with Light and Dark sides. Play in real-time from any device.
          </p>
        </div>

        {/* Action Panel */}
        <div className="w-full bg-[#1E232B]/90 backdrop-blur-md border border-[#2D333B]/80 rounded-2xl p-5 sm:p-6 shadow-2xl">
          {/* Player Nickname Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#9BA3AF] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FFCC00]" />
                <span>Your Nickname</span>
              </label>
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/20"
                style={{ backgroundColor: initialProfile?.avatar_color || '#1677E8' }}
                title="Your avatar color"
              />
            </div>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setCustomNickname(e.target.value)}
              onBlur={saveNickname}
              placeholder="Enter nickname..."
              maxLength={18}
              className="w-full px-3 py-2 rounded-lg bg-[#15191F] border border-[#2D333B] text-white text-xs font-medium focus:outline-none focus:border-[#FFCC00] transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded bg-[#ED1C24]/10 border border-[#ED1C24]/30 text-xs text-[#ED1C24]">
              {error}
            </div>
          )}

          {/* Create Room Primary Button */}
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-[#FFCC00] text-[#15191F] font-bold text-xs uppercase tracking-wider hover:bg-[#E6B800] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mb-3"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isLoading ? 'Creating...' : 'Create New Room'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="h-px bg-[#2D333B] flex-1" />
            <span className="text-[10px] text-[#9BA3AF] uppercase tracking-wider">or join room</span>
            <div className="h-px bg-[#2D333B] flex-1" />
          </div>

          {/* Join Room Form */}
          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setCustomJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={8}
              className="flex-1 px-3 py-2 rounded-lg bg-[#15191F] border border-[#2D333B] text-center font-mono font-bold text-xs tracking-wider text-[#FFCC00] uppercase placeholder:text-[#9BA3AF]/40 focus:outline-none focus:border-[#FFCC00]"
            />
            <button
              type="submit"
              disabled={isLoading || !joinCode.trim()}
              className="px-4 py-2 rounded-lg border border-[#2D333B] hover:bg-[#15191F] text-xs font-bold text-white transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto text-center text-xs text-[#9BA3AF] pt-3 border-t border-[#2D333B]">
        Supports 2–4 players. Real-time online card game.
      </footer>

      <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
};
