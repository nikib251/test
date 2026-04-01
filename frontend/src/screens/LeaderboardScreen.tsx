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
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, color: '#ffd600' }}>Leaderboard</h2>
          <button onClick={onBack} style={backBtn}>Back</button>
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#aaa' }}>Loading...</div>}
        {error && <div style={{ textAlign: 'center', color: '#e53e3e' }}>Error: {error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
            No games played yet.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Wins</th>
                <th style={thStyle}>Games</th>
                <th style={thStyle}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.nickname}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{entry.nickname}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#ffd600' }}>{entry.wins}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{entry.totalGames}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {(entry.winRate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  maxWidth: 600,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid #555',
  color: '#aaa',
  fontSize: 12,
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #333',
  fontSize: 14,
};

const backBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#888',
  border: 'none',
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'underline',
};

export default LeaderboardScreen;
