import React from 'react';
import type { PlayerState } from '../types/game';

interface ScoreBoardProps {
  players: PlayerState[];
  roundScores: Record<string, number>[];
  currentRound: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ players, roundScores, currentRound }) => {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
      }}
    >
      <h3 style={{ fontSize: 14, marginBottom: 8, color: '#ffd600' }}>
        Scoreboard — Round {currentRound}
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Player</th>
            {roundScores.map((_, i) => (
              <th key={i} style={thStyle}>R{i + 1}</th>
            ))}
            <th style={thStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td style={tdStyle}>
                {player.nickname}
                {player.role === 'bot' && <span style={{ color: '#888', fontSize: 10 }}> (bot)</span>}
              </td>
              {roundScores.map((round, i) => (
                <td key={i} style={{ ...tdStyle, textAlign: 'center' }}>
                  {round[player.id] ?? '-'}
                </td>
              ))}
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#ffd600' }}>
                {player.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  borderBottom: '1px solid #555',
  color: '#aaa',
  fontSize: 11,
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #333',
  color: '#eee',
};

export default ScoreBoard;
