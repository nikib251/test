import React from 'react';
import type { RuleVariants, PassDirection } from '../types/game';

interface RulesConfigProps {
  rules: RuleVariants;
  onChange: (rules: RuleVariants) => void;
  disabled?: boolean;
}

const RULE_LABELS: { key: keyof RuleVariants; label: string; description: string }[] = [
  { key: 'jackOfDiamonds', label: 'Jack of Diamonds', description: 'J\u2666 = -10 points' },
  { key: 'tenOfClubsDoubles', label: 'Ten of Clubs', description: '10\u2663 doubles round score' },
  { key: 'noHeartBreak', label: 'No Heart Break', description: 'Hearts can be led anytime' },
  { key: 'queenBreaksHearts', label: 'Queen Breaks Hearts', description: 'Q\u2660 counts as breaking hearts' },
  { key: 'moonGivesNegative', label: 'Shooting Moon -26', description: 'Shooter gets -26 instead of others +26' },
  { key: 'shootTheSun', label: 'Shoot the Sun', description: 'Win all 13 tricks = double moon bonus' },
  { key: 'bloodOnTheMoon', label: 'Blood on the Moon', description: '+5 penalty if no hearts taken in round' },
  { key: 'blackMaria', label: 'Black Maria', description: 'Q\u2660(+13) K\u2660(+10) A\u2660(+7) penalized' },
  { key: 'omnibusHearts', label: 'Omnibus Hearts', description: 'Enables J\u2666 bonus + all extras' },
];

const PASS_OPTIONS: { value: PassDirection; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'across', label: 'Across' },
  { value: 'random', label: 'Random' },
  { value: 'none', label: 'None' },
];

const checkboxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#eee',
};

const descStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#999',
  marginLeft: 4,
};

const RulesConfig: React.FC<RulesConfigProps> = ({ rules, onChange, disabled }) => {
  const toggleRule = (key: keyof RuleVariants) => {
    onChange({ ...rules, [key]: !rules[key] });
  };

  return (
    <div style={{ padding: 10 }}>
      <h3 style={{ fontSize: 16, marginBottom: 10, color: '#ffd600' }}>Rule Variants</h3>

      {RULE_LABELS.map(({ key, label, description }) => (
        <label key={key} style={{ ...checkboxStyle, opacity: disabled ? 0.6 : 1 }}>
          <input
            type="checkbox"
            checked={rules[key] as boolean}
            onChange={() => toggleRule(key)}
            disabled={disabled}
          />
          <span style={labelStyle}>
            {label}
            <span style={descStyle}>— {description}</span>
          </span>
        </label>
      ))}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 14, color: '#eee' }}>Pass Direction:</label>
        <select
          value={rules.passDirection}
          onChange={(e) => onChange({ ...rules, passDirection: e.target.value as PassDirection })}
          disabled={disabled}
          style={{
            background: '#2a2a4a',
            color: '#eee',
            border: '1px solid #555',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 14,
          }}
        >
          {PASS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 14, color: '#eee' }}>End Score:</label>
        <input
          type="number"
          value={rules.endScore}
          onChange={(e) => onChange({ ...rules, endScore: Math.max(26, Number(e.target.value) || 100) })}
          disabled={disabled}
          min={26}
          max={500}
          style={{
            width: 80,
            background: '#2a2a4a',
            color: '#eee',
            border: '1px solid #555',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 14,
          }}
        />
      </div>
    </div>
  );
};

export default RulesConfig;
