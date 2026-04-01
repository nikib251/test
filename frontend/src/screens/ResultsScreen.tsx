import React from 'react';
import type { GameState, GameCompleteData } from '../types/game';

interface ResultsScreenProps {
  gameState: GameState;
  gameComplete: GameCompleteData;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  gameState,
  gameComplete,
  onPlayAgain,
  onMainMenu,
}) => {
  const winner = gameState.players.find((p) => p.id === gameComplete.winnerId);
  const sortedPlayers = [...gameState.players].sort(
    (a, b) => (gameComplete.finalScores[a.id] ?? 0) - (gameComplete.finalScores[b.id] ?? 0)
  );

  return (
    <div className="results-container">
      <div className="results-panel">
        <h1 className="results-title">
          {'\u2665'} Game Over
        </h1>

        {winner && (
          <div className="results-winner">
            {'\u{1F3C6}'} {winner.nickname} wins!
          </div>
        )}

        {/* Final scores */}
        <div className="results-table-wrapper scroll-x">
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                {gameState.roundScores.map((_, i) => (
                  <th key={i}>R{i + 1}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, idx) => {
                const isWinner = player.id === gameComplete.winnerId;
                return (
                  <tr key={player.id} style={{ background: isWinner ? 'rgba(255,214,0,0.1)' : 'transparent' }}>
                    <td>{idx + 1}</td>
                    <td>
                      {player.nickname}
                      {isWinner && <span style={{ color: '#ffd600', marginLeft: 6 }}>{'\u2605'}</span>}
                      {player.role === 'bot' && (
                        <span style={{ color: '#888', fontSize: '0.8em', marginLeft: 4 }}>(bot)</span>
                      )}
                    </td>
                    {gameState.roundScores.map((round, i) => (
                      <td key={i} style={{ textAlign: 'center' }}>
                        {round[player.id] ?? '-'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ffd600' }}>
                      {gameComplete.finalScores[player.id] ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="results-buttons">
          <button onClick={onPlayAgain} className="results-btn-primary">
            Play Again
          </button>
          <button onClick={onMainMenu} className="results-btn-secondary">
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
