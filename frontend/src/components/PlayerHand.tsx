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

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  selectedCardIds,
  onCardClick,
  disabled,
  maxSelectable,
}) => {
  return (
    <>
      {cards.map((card) => {
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
    </>
  );
};

export default PlayerHand;
