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
    <div className="game-table">
      {heartsBroken && (
        <div className="hearts-broken">
          {'\u2665'} Hearts Broken
        </div>
      )}

      {positions.map(({ player, position }) => {
        const isCurrentTurn = player.id === currentPlayerId;
        const trickCard = trickByPlayer.get(player.id);

        return (
          <React.Fragment key={player.id}>
            {/* Player info */}
            <div className={`table-player-info pos-${position}`}>
              <div
                className="table-player-badge"
                style={{
                  background: isCurrentTurn ? 'rgba(255,214,0,0.3)' : 'rgba(0,0,0,0.5)',
                  border: isCurrentTurn ? '2px solid #ffd600' : '2px solid transparent',
                }}
              >
                <div className="player-name">
                  {player.nickname}
                  {player.role === 'bot' && (
                    <span style={{ fontSize: '0.7em', color: '#aaa', marginLeft: 4 }}>
                      ({player.difficulty})
                    </span>
                  )}
                </div>
                <div className="player-stats">
                  Score: {player.score} | Cards: {player.handCount}
                </div>
                {!player.isConnected && (
                  <div style={{ fontSize: '0.7em', color: '#ff6b6b' }}>Disconnected</div>
                )}
              </div>
            </div>

            {/* Trick card played by this player */}
            {trickCard && (
              <div className={`table-trick-card pos-${position}`}>
                <Card card={trickCard.card} small />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default GameTable;
