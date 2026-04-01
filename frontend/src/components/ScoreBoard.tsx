import React from 'react';
import type { PlayerState } from '../types/game';

interface ScoreBoardProps {
  players: PlayerState[];
  roundScores: Record<string, number>[];
  currentRound: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ players, roundScores, currentRound }) => {
  return (
    <div className="scoreboard">
      <h3>Scoreboard — Round {currentRound}</h3>
      <div className="scroll-x">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              {roundScores.map((_, i) => (
                <th key={i}>R{i + 1}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>
                  {player.nickname}
                  {player.role === 'bot' && <span style={{ color: '#888', fontSize: '0.8em' }}> (bot)</span>}
                </td>
                {roundScores.map((round, i) => (
                  <td key={i} style={{ textAlign: 'center' }}>
                    {round[player.id] ?? '-'}
                  </td>
                ))}
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ffd600' }}>
                  {player.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScoreBoard;
