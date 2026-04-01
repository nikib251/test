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
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 48, textAlign: 'center', marginBottom: 4 }}>
          <span style={{ color: '#e53e3e' }}>{'\u2665'}</span> Hearts
        </h1>
        <p style={{ textAlign: 'center', color: '#999', marginBottom: 30, fontSize: 14 }}>
          Classic card game for 4 players
        </p>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Your Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(''); }}
            placeholder="Enter nickname..."
            maxLength={20}
            style={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleCreate} style={primaryBtnStyle}>
            Create Game
          </button>

          {!showJoin ? (
            <button onClick={() => setShowJoin(true)} style={secondaryBtnStyle}>
              Join Game
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => { setGameCode(e.target.value); setError(''); }}
                placeholder="Game code..."
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              <button onClick={handleJoin} style={{ ...primaryBtnStyle, flex: 0, padding: '10px 20px' }}>
                Join
              </button>
            </div>
          )}

          <button onClick={onLeaderboard} style={linkBtnStyle}>
            Leaderboard
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

const cardStyle: React.CSSProperties = {
  background: '#16213e',
  borderRadius: 16,
  padding: 40,
  width: '100%',
  maxWidth: 400,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#aaa',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0f3460',
  border: '2px solid #1a1a4e',
  borderRadius: 8,
  color: '#eee',
  fontSize: 16,
  outline: 'none',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: '#e53e3e',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '12px 20px',
  background: 'transparent',
  color: '#eee',
  border: '2px solid #555',
  borderRadius: 8,
  fontSize: 16,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const linkBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: 'transparent',
  color: '#ffd600',
  border: 'none',
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(229, 62, 62, 0.2)',
  border: '1px solid #e53e3e',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 13,
  color: '#ff8a8a',
  marginBottom: 16,
};

export default HomeScreen;
