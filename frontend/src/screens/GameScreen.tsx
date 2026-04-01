import React, { useState, useEffect, useCallback } from 'react';
import type {
  GameState,
  TrickCompleteData,
  RoundCompleteData,
} from '../types/game';
import GameTable from '../components/GameTable';
import PlayerHand from '../components/PlayerHand';
import ScoreBoard from '../components/ScoreBoard';

interface GameScreenProps {
  gameState: GameState;
  myPlayerId: string;
  trickComplete: TrickCompleteData | null;
  roundComplete: RoundCompleteData | null;
  onPassCards: (cardIds: string[]) => void;
  onPlayCard: (cardId: string) => void;
  onClearTrickComplete: () => void;
  onClearRoundComplete: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  myPlayerId,
  trickComplete,
  roundComplete,
  onPassCards,
  onPlayCard,
  onClearTrickComplete,
  onClearRoundComplete,
}) => {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [showTrickWinner, setShowTrickWinner] = useState<string | null>(null);

  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const isMyTurn = gameState.currentPlayerId === myPlayerId;
  const isPassing = gameState.phase === 'passing';
  const isPlaying = gameState.phase === 'playing';
  const myCards = myPlayer?.hand ?? [];

  // Check for moon shot warning
  const moonShotWarning = gameState.players.some((p) => {
    const heartsCount = p.tricksTaken.flat().filter((c) => c.suit === 'hearts').length;
    const hasQoS = p.tricksTaken.flat().some((c) => c.suit === 'spades' && c.rank === 'Q');
    return heartsCount >= 10 || (heartsCount >= 8 && hasQoS);
  });

  // Handle trick complete
  useEffect(() => {
    if (trickComplete) {
      const winner = gameState.players.find((p) => p.id === trickComplete.winnerId);
      setShowTrickWinner(winner?.nickname ?? 'Unknown');
      const timer = setTimeout(() => {
        setShowTrickWinner(null);
        onClearTrickComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [trickComplete, gameState.players, onClearTrickComplete]);

  // Handle round complete
  useEffect(() => {
    if (roundComplete) {
      setShowRoundModal(true);
    }
  }, [roundComplete]);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (isPassing) {
        setSelectedCards((prev) => {
          if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
          if (prev.length >= 3) return prev;
          return [...prev, cardId];
        });
      } else if (isPlaying && isMyTurn) {
        onPlayCard(cardId);
      }
    },
    [isPassing, isPlaying, isMyTurn, onPlayCard]
  );

  const handlePassCards = () => {
    if (selectedCards.length === 3) {
      onPassCards(selectedCards);
      setSelectedCards([]);
    }
  };

  const dismissRoundModal = () => {
    setShowRoundModal(false);
    onClearRoundComplete();
  };

  const passDirectionLabel = gameState.passDirection === 'none'
    ? 'No passing this round'
    : `Pass 3 cards ${gameState.passDirection}`;

  return (
    <div style={containerStyle}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <div style={{ fontSize: 13, color: '#aaa' }}>
          Round {gameState.round} &middot; Trick {gameState.trickNumber}/13
        </div>
        {moonShotWarning && (
          <div style={moonWarningStyle}>
            {'\u26A0'} Moon Shot Alert!
          </div>
        )}
        <div style={{ fontSize: 13, color: '#aaa' }}>
          {isMyTurn && isPlaying && (
            <span style={{ color: '#ffd600', fontWeight: 'bold' }}>Your turn!</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Game table */}
        <div style={{ flex: 1 }}>
          <GameTable
            players={gameState.players}
            currentPlayerId={gameState.currentPlayerId}
            myPlayerId={myPlayerId}
            currentTrick={gameState.currentTrick}
            heartsBroken={gameState.heartsBroken}
          />

          {/* Passing phase UI */}
          {isPassing && gameState.passDirection !== 'none' && (
            <div style={passBarStyle}>
              <span style={{ fontSize: 14 }}>{passDirectionLabel}</span>
              <span style={{ fontSize: 13, color: '#aaa' }}>
                Selected: {selectedCards.length}/3
              </span>
              <button
                onClick={handlePassCards}
                disabled={selectedCards.length !== 3}
                style={{
                  ...passBtnStyle,
                  opacity: selectedCards.length === 3 ? 1 : 0.4,
                }}
              >
                Pass Cards
              </button>
            </div>
          )}

          {isPassing && gameState.passDirection === 'none' && (
            <div style={passBarStyle}>
              <span style={{ fontSize: 14, color: '#ffd600' }}>No passing this round — waiting for play to begin</span>
            </div>
          )}

          {/* Player hand */}
          <div style={{ marginTop: 10 }}>
            <PlayerHand
              cards={myCards}
              selectedCardIds={selectedCards}
              onCardClick={handleCardClick}
              disabled={!isPassing && !(isPlaying && isMyTurn)}
              maxSelectable={isPassing ? 3 : undefined}
            />
          </div>
        </div>

        {/* Score panel */}
        <div style={{ width: 260, flexShrink: 0, overflowY: 'auto' }}>
          <ScoreBoard
            players={gameState.players}
            roundScores={gameState.roundScores}
            currentRound={gameState.round}
          />
        </div>
      </div>

      {/* Trick winner overlay */}
      {showTrickWinner && (
        <div style={overlayStyle}>
          <div style={trickWinnerStyle}>
            {showTrickWinner} wins the trick!
          </div>
        </div>
      )}

      {/* Round complete modal */}
      {showRoundModal && roundComplete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ fontSize: 18, marginBottom: 12, color: '#ffd600' }}>Round Complete</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr>
                  <th style={modalThStyle}>Player</th>
                  <th style={modalThStyle}>Round</th>
                  <th style={modalThStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players.map((p) => (
                  <tr key={p.id}>
                    <td style={modalTdStyle}>{p.nickname}</td>
                    <td style={{ ...modalTdStyle, textAlign: 'center' }}>
                      {roundComplete.roundScores[p.id] ?? 0}
                    </td>
                    <td style={{ ...modalTdStyle, textAlign: 'center', fontWeight: 'bold' }}>
                      {roundComplete.totalScores[p.id] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={dismissRoundModal} style={continueBtn}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  padding: 16,
  gap: 10,
};

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 8,
};

const moonWarningStyle: React.CSSProperties = {
  color: '#ff6b6b',
  fontWeight: 'bold',
  fontSize: 14,
  animation: 'pulse 1s ease-in-out infinite',
};

const passBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 16,
  padding: '10px 16px',
  marginTop: 10,
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 8,
};

const passBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: '#e53e3e',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 'bold',
  cursor: 'pointer',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const trickWinnerStyle: React.CSSProperties = {
  background: '#16213e',
  padding: '16px 32px',
  borderRadius: 12,
  fontSize: 18,
  fontWeight: 'bold',
  color: '#ffd600',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};

const modalStyle: React.CSSProperties = {
  background: '#16213e',
  padding: 30,
  borderRadius: 16,
  minWidth: 350,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const modalThStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid #555',
  color: '#aaa',
  fontSize: 12,
};

const modalTdStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid #333',
  fontSize: 14,
};

const continueBtn: React.CSSProperties = {
  width: '100%',
  padding: '10px 20px',
  background: '#43a047',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
};

export default GameScreen;
