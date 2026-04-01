import React from 'react';
import type { PlayerState, TrickCard } from '../types/game';
import Card from './Card';

interface GameTableProps {
  players: PlayerState[];
  currentPlayerId: string;
  myPlayerId: string;
  currentTrick: TrickCard[];
  heartsBroken: boolean;
}

interface PlayerPosition {
  player: PlayerState;
  position: 'bottom' | 'left' | 'top' | 'right';
}

function getPlayerPositions(players: PlayerState[], myPlayerId: string): PlayerPosition[] {
  const myIndex = players.findIndex((p) => p.id === myPlayerId);
  if (myIndex === -1) {
    return players.map((player, i) => ({
      player,
      position: (['bottom', 'left', 'top', 'right'] as const)[i],
    }));
  }

  const positions: ('bottom' | 'left' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'right'];
  return players.map((player, i) => ({
    player,
    position: positions[(i - myIndex + 4) % 4],
  }));
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  bottom: { bottom: 10, left: '50%', transform: 'translateX(-50%)' },
  top: { top: 10, left: '50%', transform: 'translateX(-50%)' },
  left: { left: 10, top: '50%', transform: 'translateY(-50%)' },
  right: { right: 10, top: '50%', transform: 'translateY(-50%)' },
};

const TRICK_CARD_STYLES: Record<string, React.CSSProperties> = {
  bottom: { bottom: '35%', left: '50%', transform: 'translateX(-50%)' },
  top: { top: '35%', left: '50%', transform: 'translateX(-50%)' },
  left: { left: '35%', top: '50%', transform: 'translateY(-50%)' },
  right: { right: '35%', top: '50%', transform: 'translateY(-50%)' },
};

const GameTable: React.FC<GameTableProps> = ({
  players,
  currentPlayerId,
  myPlayerId,
  currentTrick,
  heartsBroken,
}) => {
  const positions = getPlayerPositions(players, myPlayerId);

  const trickByPlayer = new Map<string, TrickCard>();
  for (const tc of currentTrick) {
    trickByPlayer.set(tc.playerId, tc);
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 400,
        background: 'radial-gradient(ellipse at center, #0a7e2a, #076324, #054d1b)',
        borderRadius: 20,
        border: '6px solid #3e2723',
        boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {heartsBroken && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            fontSize: 12,
            color: '#ff6b6b',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {'\u2665'} Hearts Broken
        </div>
      )}

      {positions.map(({ player, position }) => {
        const isCurrentTurn = player.id === currentPlayerId;
        const trickCard = trickByPlayer.get(player.id);

        return (
          <React.Fragment key={player.id}>
            {/* Player info */}
            <div
              style={{
                position: 'absolute',
                ...POSITION_STYLES[position],
                textAlign: 'center',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  background: isCurrentTurn ? 'rgba(255,214,0,0.3)' : 'rgba(0,0,0,0.5)',
                  border: isCurrentTurn ? '2px solid #ffd600' : '2px solid transparent',
                  borderRadius: 8,
                  padding: '6px 12px',
                  minWidth: 100,
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>
                  {player.nickname}
                  {player.role === 'bot' && (
                    <span style={{ fontSize: 10, color: '#aaa', marginLeft: 4 }}>
                      ({player.difficulty})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#ccc' }}>
                  Score: {player.score} | Cards: {player.handCount}
                </div>
                {!player.isConnected && (
                  <div style={{ fontSize: 10, color: '#ff6b6b' }}>Disconnected</div>
                )}
              </div>
            </div>

            {/* Trick card played by this player */}
            {trickCard && (
              <div
                style={{
                  position: 'absolute',
                  ...TRICK_CARD_STYLES[position],
                  zIndex: 3,
                  animation: 'fadeSlideIn 0.3s ease-out',
                }}
              >
                <Card card={trickCard.card} small />
              </div>
            )}
          </React.Fragment>
        );
      })}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: scale(0.5) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GameTable;
