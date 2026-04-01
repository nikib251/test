import React, { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../types/game';

interface LeaderboardScreenProps {
  onBack: () => void;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data: { players: LeaderboardEntry[] }) => {
        setEntries(data.players);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-panel">
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <button onClick={onBack} className="leaderboard-back-btn">Back</button>
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#aaa' }}>Loading...</div>}
        {error && <div style={{ textAlign: 'center', color: '#e53e3e' }}>Error: {error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
            No games played yet.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="leaderboard-table-wrapper scroll-x">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Wins</th>
                  <th>Games</th>
                  <th>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.nickname}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{entry.nickname}</td>
                    <td style={{ textAlign: 'center', color: '#ffd600' }}>{entry.wins}</td>
                    <td style={{ textAlign: 'center' }}>{entry.totalGames}</td>
                    <td style={{ textAlign: 'center' }}>
                      {(entry.winRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardScreen;
