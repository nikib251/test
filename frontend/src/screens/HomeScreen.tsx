import React, { useState } from 'react';

interface HomeScreenProps {
  onCreateGame: (nickname: string) => void;
  onJoinGame: (nickname: string, gameId: string) => void;
  onLeaderboard: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateGame, onJoinGame, onLeaderboard }) => {
  const [nickname, setNickname] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    onCreateGame(nickname.trim());
  };

  const handleJoin = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }
    onJoinGame(nickname.trim(), gameCode.trim());
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">
          <span style={{ color: '#e53e3e' }}>{'\u2665'}</span> Hearts
        </h1>
        <p className="home-subtitle">
          Classic card game for 4 players
        </p>

        {error && (
          <div style={{
            background: 'rgba(229, 62, 62, 0.2)',
            border: '1px solid #e53e3e',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 13,
            color: '#ff8a8a',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>
            Your Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(''); }}
            placeholder="Enter nickname..."
            maxLength={20}
            className="home-input"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleCreate} className="home-btn-primary">
            Create Game
          </button>

          {!showJoin ? (
            <button onClick={() => setShowJoin(true)} className="home-btn-secondary">
              Join Game
            </button>
          ) : (
            <div className="home-join-row">
              <input
                type="text"
                value={gameCode}
                onChange={(e) => { setGameCode(e.target.value); setError(''); }}
                placeholder="Game code..."
                className="home-input"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              <button onClick={handleJoin} className="home-btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
                Join
              </button>
            </div>
          )}

          <button onClick={onLeaderboard} className="home-btn-link">
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
