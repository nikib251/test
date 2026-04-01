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
    <div style={containerStyle}>
      <div style={panelStyle}>
        <h1 style={{ textAlign: 'center', fontSize: 32, marginBottom: 4 }}>
          {'\u2665'} Game Over
        </h1>

        {winner && (
          <div style={winnerStyle}>
            {'\u{1F3C6}'} {winner.nickname} wins!
          </div>
        )}

        {/* Final scores */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Player</th>
              {gameState.roundScores.map((_, i) => (
                <th key={i} style={thStyle}>R{i + 1}</th>
              ))}
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => {
              const isWinner = player.id === gameComplete.winnerId;
              return (
                <tr key={player.id} style={{ background: isWinner ? 'rgba(255,214,0,0.1)' : 'transparent' }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>
                    {player.nickname}
                    {isWinner && <span style={{ color: '#ffd600', marginLeft: 6 }}>{'\u2605'}</span>}
                    {player.role === 'bot' && (
                      <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(bot)</span>
                    )}
                  </td>
                  {gameState.roundScores.map((round, i) => (
                    <td key={i} style={{ ...tdStyle, textAlign: 'center' }}>
                      {round[player.id] ?? '-'}
                    </td>
                  ))}
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#ffd600', fontSize: 16 }}>
                    {gameComplete.finalScores[player.id] ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 12, marginTop: 30, justifyContent: 'center' }}>
          <button onClick={onPlayAgain} style={primaryBtn}>
            Play Again
          </button>
          <button onClick={onMainMenu} style={secondaryBtn}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: 20,
};

const panelStyle: React.CSSProperties = {
  background: '#16213e',
  borderRadius: 16,
  padding: 30,
  width: '100%',
  maxWidth: 700,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const winnerStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 22,
  color: '#ffd600',
  marginTop: 8,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '2px solid #555',
  color: '#aaa',
  fontSize: 12,
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #333',
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  padding: '12px 30px',
  background: '#43a047',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '12px 30px',
  background: 'transparent',
  color: '#eee',
  border: '2px solid #555',
  borderRadius: 8,
  fontSize: 16,
  cursor: 'pointer',
};

export default ResultsScreen;
