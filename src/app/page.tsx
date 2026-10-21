'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMultiplayerGame } from '@/lib/game/useMultiplayerGame';
import { HomeScreen } from '@/components/home/HomeScreen';
import { LobbyScreen } from '@/components/lobby/LobbyScreen';
import { GameBoard } from '@/components/board/GameBoard';
import { HowToPlayModal } from '@/components/modals/HowToPlayModal';
import { Loader2 } from 'lucide-react';

function UnoFlipGame() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room');

  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(
    roomParam ? roomParam.toUpperCase() : null
  );
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const {
    room,
    players,
    me,
    myHand,
    currentProfile,
    isLoading,
    error,
    playCard,
    drawCard,
    submitDrawDecision,
    callUno,
    challengeUno,
    toggleReady,
    startGame,
    rematch,
    leaveRoom,
    updateProfile,
  } = useMultiplayerGame(activeRoomCode);

  // Sync URL when activeRoomCode changes
  const handleEnterRoom = (code: string) => {
    const uppercaseCode = code.toUpperCase();
    setActiveRoomCode(uppercaseCode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', uppercaseCode);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    setActiveRoomCode(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url.toString());
    }
  };

  // If not in a room, render Home
  if (!activeRoomCode) {
    return (
      <HomeScreen
        initialProfile={currentProfile}
        onEnterRoom={handleEnterRoom}
        initialRoomCode={roomParam}
      />
    );
  }

  // Loading state
  if (isLoading && !room) {
    return (
      <div className="min-h-screen bg-[#15191F] text-white flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-lg bg-[#ED1C24] border-2 border-white flex items-center justify-center mb-4 shadow-sm">
          <span className="font-bold text-lg text-white">UF</span>
        </div>
        <div className="flex items-center gap-2 text-[#9BA3AF] font-medium text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#FFCC00]" />
          <span>Connecting to Room {activeRoomCode}...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#15191F] text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-[#1E232B] border border-[#2D333B] p-6 sm:p-8 rounded-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded bg-red-950/40 border border-[#ED1C24]/40 text-[#ED1C24] flex items-center justify-center font-bold text-lg mb-3">
            !
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Unable to Join Room</h2>
          <p className="text-[#9BA3AF] text-xs sm:text-sm mb-6">
            {error || 'This room does not exist or has been closed.'}
          </p>
          <button
            onClick={handleLeaveRoom}
            className="w-full py-2.5 rounded-lg bg-[#FFCC00] text-[#15191F] font-bold text-xs uppercase tracking-wider hover:bg-[#E6B800] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // If room is in lobby status
  if (room.status === 'lobby') {
    return (
      <>
        <LobbyScreen
          room={room}
          players={players}
          me={me}
          currentProfile={currentProfile}
          onToggleReady={toggleReady}
          onStartGame={startGame}
          onLeaveRoom={handleLeaveRoom}
          onUpdateProfile={updateProfile}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Active game or finished (GameBoard shows GameOver modal when finished)
  return (
    <GameBoard
      room={room}
      players={players}
      me={me}
      myHand={myHand}
      currentProfile={currentProfile}
      onPlayCard={playCard}
      onDrawCard={drawCard}
      onSubmitDrawDecision={submitDrawDecision}
      onCallUno={callUno}
      onChallengeUno={challengeUno}
      onRematch={rematch}
      onLeaveRoom={handleLeaveRoom}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#15191F] text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFCC00]" />
        </div>
      }
    >
      <UnoFlipGame />
    </Suspense>
  );
}
