import React, { useState, useRef, useEffect } from 'react';
import type { LobbyInfo, BotDifficulty, RuleVariants, ChatMessage } from '../types/game';
import { BOT_DIFFICULTY_NAMES } from '../types/game';
import RulesConfig from '../components/RulesConfig';

interface LobbyScreenProps {
  lobby: LobbyInfo;
  myPlayerId: string;
  chatMessages: ChatMessage[];
  onAddBot: (difficulty: BotDifficulty) => void;
  onRemoveBot: (playerId: string) => void;
  onUpdateRules: (rules: RuleVariants) => void;
  onStartGame: () => void;
  onSendChat: (message: string) => void;
  onLeave: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  lobby,
  myPlayerId,
  chatMessages,
  onAddBot,
  onRemoveBot,
  onUpdateRules,
  onStartGame,
  onSendChat,
  onLeave,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>(5);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isHost = myPlayerId === lobby.hostId;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = () => {
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.gameId).catch(() => {});
  };

  return (
    <div className="lobby-container">
      <div className="lobby-panel">
        {/* Header */}
        <div className="lobby-header">
          <h2>Game Lobby</h2>
          <button onClick={onLeave} className="lobby-leave-btn">Leave</button>
        </div>

        {/* Lobby Code */}
        <div className="lobby-code-box">
          <span style={{ fontSize: 12, color: '#aaa' }}>Lobby Code:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="lobby-code-value">
              {lobby.gameId}
            </span>
            <button onClick={copyCode} className="lobby-small-btn">Copy</button>
          </div>
        </div>

        <div className="lobby-content">
          {/* Players + Chat */}
          <div className="lobby-players-section">
            <h3 className="lobby-section-title">Players ({lobby.players.length}/4)</h3>
            <div style={{ marginBottom: 12 }}>
              {lobby.players.map((p) => (
                <div key={p.id} className="lobby-player-row">
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{p.nickname}</span>
                    {p.role === 'bot' && p.difficulty != null && (
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                        Bot ({p.difficulty} — {BOT_DIFFICULTY_NAMES[p.difficulty as BotDifficulty]})
                      </span>
                    )}
                    {p.id === lobby.hostId && (
                      <span style={{ fontSize: 11, color: '#ffd600', marginLeft: 6 }}>Host</span>
                    )}
                  </div>
                  {isHost && p.role === 'bot' && (
                    <button onClick={() => onRemoveBot(p.id)} className="lobby-remove-btn">
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 4 - lobby.players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="lobby-player-row" style={{ color: '#555' }}>
                  Empty slot
                </div>
              ))}
            </div>

            {/* Add Bot */}
            {isHost && lobby.players.length < 4 && (
              <div className="lobby-add-bot">
                <span style={{ fontSize: 13, color: '#aaa' }}>Add Bot:</span>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(Number(e.target.value) as BotDifficulty)}
                  style={{
                    padding: '6px 8px',
                    background: '#0f3460',
                    color: '#eee',
                    border: '1px solid #88c0d0',
                    borderRadius: 4,
                    fontSize: 16,
                    cursor: 'pointer',
                    outline: 'none',
                    minHeight: 44,
                  }}
                >
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as BotDifficulty[]).map((d) => (
                    <option key={d} value={d}>
                      {d} — {BOT_DIFFICULTY_NAMES[d]}
                    </option>
                  ))}
                </select>
                <button onClick={() => onAddBot(selectedDifficulty)} style={{
                  padding: '6px 12px',
                  background: '#1a3a5c',
                  color: '#88c0d0',
                  border: '1px solid #88c0d0',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                  minHeight: 44,
                }}>
                  Add
                </button>
              </div>
            )}

            {/* Chat */}
            <h3 className="lobby-section-title">Chat</h3>
            <div className="lobby-chat-box scroll-y">
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 'bold', color: msg.playerId === 'system' ? '#ffd600' : '#88c0d0', fontSize: 12 }}>
                    {msg.nickname}:
                  </span>{' '}
                  <span style={{ fontSize: 12 }}>{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="lobby-chat-input-row">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
              />
              <button onClick={handleSendChat} className="lobby-small-btn">Send</button>
            </div>
          </div>

          {/* Rules */}
          <div className="lobby-rules-section">
            <RulesConfig rules={lobby.rules} onChange={onUpdateRules} disabled={!isHost} />
          </div>
        </div>

        {/* Start button */}
        {isHost && (
          <button
            onClick={onStartGame}
            disabled={lobby.players.length < 4}
            className="lobby-start-btn"
            style={{
              opacity: lobby.players.length < 4 ? 0.5 : 1,
              cursor: lobby.players.length < 4 ? 'not-allowed' : 'pointer',
            }}
          >
            {lobby.players.length < 4
              ? `Need ${4 - lobby.players.length} more player(s)`
              : 'Start Game'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LobbyScreen;
