import React from 'react';
import type { Card as CardType } from '../types/game';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  onCardClick: (cardId: string) => void;
  disabled?: boolean;
  maxSelectable?: number;
}

const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const SUIT_ORDER: Record<string, number> = {
  clubs: 0, diamonds: 1, spades: 2, hearts: 3,
};

function sortCards(cards: CardType[]): CardType[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
  });
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardIds,
  onCardClick,
  disabled,
  maxSelectable,
}) => {
  const sorted = sortCards(cards);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 4,
        padding: '10px 20px',
        flexWrap: 'wrap',
        maxWidth: '100%',
      }}
    >
      {sorted.map((card) => {
        const isSelected = selectedCardIds.includes(card.id);
        const atMax = maxSelectable !== undefined && selectedCardIds.length >= maxSelectable && !isSelected;
        return (
          <Card
            key={card.id}
            card={card}
            selected={isSelected}
            onClick={() => onCardClick(card.id)}
            disabled={disabled || atMax}
          />
        );
      })}
    </div>
  );
};

export default PlayerHand;
