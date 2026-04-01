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
  const [showScorePanel, setShowScorePanel] = useState(false);

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
    <div className="game-container">
      {/* Top bar */}
      <div className="game-top-bar">
        <div style={{ color: '#aaa' }}>
          Round {gameState.round} &middot; Trick {gameState.trickNumber}/13
        </div>
        {moonShotWarning && (
          <div className="game-moon-warning">
            {'\u26A0'} Moon Shot Alert!
          </div>
        )}
        <div>
          {isMyTurn && isPlaying && (
            <span className="turn-indicator">Your turn!</span>
          )}
        </div>
      </div>

      {/* Score toggle - mobile only */}
      <button
        className="game-score-toggle"
        onClick={() => setShowScorePanel(!showScorePanel)}
      >
        Score
      </button>

      <div className="game-main">
        {/* Game table + hand */}
        <div className="game-table-wrapper">
          <GameTable
            players={gameState.players}
            currentPlayerId={gameState.currentPlayerId}
            myPlayerId={myPlayerId}
            currentTrick={gameState.currentTrick}
            heartsBroken={gameState.heartsBroken}
          />

          {/* Passing phase UI */}
          {isPassing && gameState.passDirection !== 'none' && (
            <div className="game-pass-bar">
              <span>{passDirectionLabel}</span>
              <span style={{ color: '#aaa' }}>
                Selected: {selectedCards.length}/3
              </span>
              <button
                onClick={handlePassCards}
                disabled={selectedCards.length !== 3}
                className="game-pass-btn"
                style={{ opacity: selectedCards.length === 3 ? 1 : 0.4 }}
              >
                Pass Cards
              </button>
            </div>
          )}

          {isPassing && gameState.passDirection === 'none' && (
            <div className="game-pass-bar">
              <span style={{ color: '#ffd600' }}>No passing this round — waiting for play to begin</span>
            </div>
          )}

          {/* Player hand */}
          <div className="player-hand">
            {(() => {
              const RANK_ORDER: Record<string, number> = {
                '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
                '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
              };
              const SUIT_ORDER: Record<string, number> = {
                clubs: 0, diamonds: 1, spades: 2, hearts: 3,
              };
              const sorted = [...myCards].sort((a, b) => {
                const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
                if (suitDiff !== 0) return suitDiff;
                return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
              });
              return <PlayerHand
                cards={sorted}
                selectedCardIds={selectedCards}
                onCardClick={handleCardClick}
                disabled={!isPassing && !(isPlaying && isMyTurn)}
                maxSelectable={isPassing ? 3 : undefined}
              />;
            })()}
          </div>
        </div>

        {/* Score panel backdrop — tap to dismiss on mobile */}
        <div
          className={`game-score-backdrop ${showScorePanel ? 'visible' : ''}`}
          onClick={() => setShowScorePanel(false)}
        />

        {/* Score panel */}
        <div className={`game-score-panel ${showScorePanel ? 'visible' : ''}`}>
          <button className="score-close" onClick={() => setShowScorePanel(false)}>
            &times;
          </button>
          <ScoreBoard
            players={gameState.players}
            roundScores={gameState.roundScores}
            currentRound={gameState.round}
          />
        </div>
      </div>

      {/* Trick winner overlay */}
      {showTrickWinner && (
        <div className="game-overlay">
          <div className="trick-winner-toast">
            {showTrickWinner} wins the trick!
          </div>
        </div>
      )}

      {/* Round complete modal */}
      {showRoundModal && roundComplete && (
        <div className="game-overlay">
          <div className="round-modal">
            <h3>Round Complete</h3>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Round</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {gameState.players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nickname}</td>
                    <td style={{ textAlign: 'center' }}>
                      {roundComplete.roundScores[p.id] ?? 0}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {roundComplete.totalScores[p.id] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={dismissRoundModal} className="continue-btn">
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
