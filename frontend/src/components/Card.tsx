import React from 'react';
import type { Card as CardType, Suit } from '../types/game';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#e53e3e',
  diamonds: '#e53e3e',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

function isPenaltyCard(card: CardType): boolean {
  if (card.suit === 'hearts') return true;
  if (card.suit === 'spades' && card.rank === 'Q') return true;
  return false;
}

function isSpecialCard(card: CardType): boolean {
  if (card.suit === 'diamonds' && card.rank === 'J') return true;
  return false;
}

const Card: React.FC<CardProps> = ({ card, onClick, selected, disabled, small, faceDown }) => {
  if (faceDown) {
    return (
      <div className={`card-back ${small ? 'small-card' : ''}`}>
        {'\u2660'}
      </div>
    );
  }

  const penalty = isPenaltyCard(card);
  const special = isSpecialCard(card);
  const color = SUIT_COLORS[card.suit];

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`card ${small ? 'small-card' : ''}`}
      style={{
        background: selected ? '#fffde7' : '#fff',
        border: `2px solid ${selected ? '#ffd600' : penalty ? '#e53e3e' : special ? '#43a047' : '#ccc'}`,
        boxShadow: selected
          ? '0 0 12px rgba(255, 214, 0, 0.6)'
          : penalty
          ? '0 2px 4px rgba(229, 62, 62, 0.3)'
          : '0 2px 4px rgba(0,0,0,0.15)',
        cursor: disabled ? 'default' : onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        color,
        transform: selected ? 'translateY(-10px)' : 'translateY(0)',
      }}
    >
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{SUIT_SYMBOLS[card.suit]}</div>
      {penalty && (
        <div className="card-indicator" style={{ color: '#e53e3e' }}>
          {'\u26A0'}
        </div>
      )}
      {special && (
        <div className="card-indicator" style={{ color: '#43a047' }}>
          {'\u2605'}
        </div>
      )}
    </div>
  );
};

export default Card;
