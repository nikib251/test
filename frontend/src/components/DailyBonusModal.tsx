import React, { useState, useCallback } from 'react';
import type { DailyBonusStatus, DailyBonusClaimResult } from '../types/game';
import '../styles/daily-bonus.css';

const DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 50];

interface DailyBonusModalProps {
  status: DailyBonusStatus;
  nickname: string;
  onClose: () => void;
  onClaimed: (result: DailyBonusClaimResult) => void;
}

const DailyBonusModal: React.FC<DailyBonusModalProps> = ({ status, nickname, onClose, onClaimed }) => {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(!status.canClaim);
  const [flyingCoins, setFlyingCoins] = useState<{ id: number; x: number; y: number }[]>([]);

  const spawnCoinAnimation = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top;
    const coins: { id: number; x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      coins.push({
        id: Date.now() + i,
        x: cx + (Math.random() - 0.5) * 80,
        y: cy,
      });
    }
    setFlyingCoins(coins);
    setTimeout(() => setFlyingCoins([]), 900);
  }, []);

  const handleClaim = useCallback(async (e: React.MouseEvent) => {
    if (claiming || claimed) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/daily-bonus/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: nickname }),
      });
      if (!res.ok) throw new Error('Claim failed');
      const result: DailyBonusClaimResult = await res.json();
      if (result.success) {
        setClaimed(true);
        spawnCoinAnimation(e);
        onClaimed(result);
      } else if (result.alreadyClaimed) {
        setClaimed(true);
      }
    } catch (err) {
      console.error('Failed to claim daily bonus:', err);
    } finally {
      setClaiming(false);
    }
  }, [claiming, claimed, nickname, onClaimed, spawnCoinAnimation]);

  const currentStreak = claimed ? status.streak + (status.canClaim ? 1 : 0) : status.streak;

  const getDayClass = (dayIndex: number): string => {
    const dayNum = dayIndex + 1;
    if (claimed && dayNum <= currentStreak) return 'claimed';
    if (!claimed && dayNum <= status.streak) return 'claimed';
    if (!claimed && status.canClaim && dayNum === status.streak + 1) return 'today';
    if (claimed && dayNum === currentStreak) return 'today-claimed';
    return 'future';
  };

  const getDayIcon = (dayIndex: number): string => {
    const cls = getDayClass(dayIndex);
    if (cls === 'claimed' || cls === 'today-claimed') return '\u2705';
    if (cls === 'today') return '\ud83c\udfa8';
    return '\ud83d\udd12';
  };

  return (
    <div className="daily-bonus-overlay" onClick={onClose}>
      <div className="daily-bonus-modal" onClick={(e) => e.stopPropagation()}>
        <button className="daily-bonus-close" onClick={onClose}>{'\u2715'}</button>

        <h2>{'\ud83c\udf81'} &#x0415;&#x0436;&#x0435;&#x0434;&#x043d;&#x0435;&#x0432;&#x043d;&#x044b;&#x0439; &#x0431;&#x043e;&#x043d;&#x0443;&#x0441;</h2>
        <div className="daily-bonus-streak">
          &#x0421;&#x0435;&#x0440;&#x0438;&#x044f;: {currentStreak} {getDaysWord(currentStreak)}
        </div>

        <div className="daily-bonus-strip">
          {DAILY_REWARDS.map((reward, i) => (
            <div key={i} className={`daily-bonus-day ${getDayClass(i)}`}>
              <span className="daily-bonus-day-label">&#x0414;&#x0435;&#x043d;&#x044c; {i + 1}</span>
              <span className="daily-bonus-day-icon">{getDayIcon(i)}</span>
              <span className="daily-bonus-day-coins">{reward}</span>
            </div>
          ))}
        </div>

        <button
          className="daily-bonus-claim-btn"
          disabled={claimed || claiming}
          onClick={handleClaim}
        >
          {claiming
            ? '...'
            : claimed
              ? `\u2705 &#x0423;&#x0436;&#x0435; &#x043f;&#x043e;&#x043b;&#x0443;&#x0447;&#x0435;&#x043d;&#x043e;`
              : `\ud83e\ude99 &#x041f;&#x043e;&#x043b;&#x0443;&#x0447;&#x0438;&#x0442;&#x044c; ${status.nextReward} &#x043c;&#x043e;&#x043d;&#x0435;&#x0442;`}
        </button>

        {currentStreak >= 7 && (
          <div className="daily-bonus-badge">
            {'\ud83c\udfc6'} &#x041d;&#x0435;&#x0434;&#x0435;&#x043b;&#x044f; &#x043f;&#x043e;&#x0434;&#x0440;&#x044f;&#x0434;!
          </div>
        )}
      </div>

      {flyingCoins.map((coin) => (
        <span
          key={coin.id}
          className="daily-bonus-coin-fly"
          style={{
            left: coin.x,
            top: coin.y,
            '--fly-x': `${(Math.random() - 0.5) * 60}px`,
            '--fly-y': `${-60 - Math.random() * 80}px`,
          } as React.CSSProperties}
        >
          {'\ud83e\ude99'}
        </span>
      ))}
    </div>
  );
};

function getDaysWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return '\u0434\u043d\u0435\u0439';
  if (last === 1) return '\u0434\u0435\u043d\u044c';
  if (last >= 2 && last <= 4) return '\u0434\u043d\u044f';
  return '\u0434\u043d\u0435\u0439';
}

export default DailyBonusModal;
