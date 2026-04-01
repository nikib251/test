import React, { useState, useEffect, useCallback } from 'react';
import type { DailyBonusStatus, DailyBonusClaimResult } from '../types/game';
import DailyBonusModal from '../components/DailyBonusModal';

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
  const [bonusStatus, setBonusStatus] = useState<DailyBonusStatus | null>(null);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [bonusCheckedFor, setBonusCheckedFor] = useState('');

  const fetchBonusStatus = useCallback(async (nick: string) => {
    if (!nick.trim()) return;
    try {
      const res = await fetch(`/api/daily-bonus/status?playerId=${encodeURIComponent(nick.trim())}`);
      if (!res.ok) return;
      const data: DailyBonusStatus = await res.json();
      setBonusStatus(data);
      setCoinBalance(data.coins);
      if (data.canClaim) {
        setShowBonusModal(true);
      }
    } catch {
      // Silently fail — don't block the home screen
    }
  }, []);

  // Check bonus when nickname changes (debounced on blur / enter)
  useEffect(() => {
    if (nickname.trim() && nickname.trim() !== bonusCheckedFor) {
      const timer = setTimeout(() => {
        setBonusCheckedFor(nickname.trim());
        fetchBonusStatus(nickname);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nickname, bonusCheckedFor, fetchBonusStatus]);

  const handleBonusClaimed = useCallback((result: DailyBonusClaimResult) => {
    setCoinBalance(result.coins);
    setBonusStatus((prev) => prev ? { ...prev, canClaim: false, streak: result.streak, coins: result.coins } : prev);
  }, []);

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

        {nickname.trim() && (
          <div className="home-coin-balance">
            {'\ud83e\ude99'} {coinBalance}
          </div>
        )}

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

          {nickname.trim() && (
            <button className="home-bonus-btn" onClick={() => setShowBonusModal(true)}>
              {'\ud83e\ude99'} {'\u0415\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u044b\u0439 \u0431\u043e\u043d\u0443\u0441'}
            </button>
          )}

          <button onClick={onLeaderboard} className="home-btn-link">
            Leaderboard
          </button>
        </div>
      </div>

      {showBonusModal && bonusStatus && (
        <DailyBonusModal
          status={bonusStatus}
          nickname={nickname.trim()}
          onClose={() => setShowBonusModal(false)}
          onClaimed={handleBonusClaimed}
        />
      )}
    </div>
  );
};

export default HomeScreen;
