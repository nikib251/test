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
    <div style={containerStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, color: '#ffd600' }}>Game Lobby</h2>
          <button onClick={onLeave} style={linkBtn}>Leave</button>
        </div>

        {/* Lobby Code */}
        <div style={codeBoxStyle}>
          <span style={{ fontSize: 12, color: '#aaa' }}>Lobby Code:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2, color: '#ffd600' }}>
              {lobby.gameId}
            </span>
            <button onClick={copyCode} style={smallBtn}>Copy</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {/* Left: Players + Chat */}
          <div style={{ flex: 1, minWidth: 250 }}>
            {/* Players */}
            <h3 style={sectionTitle}>Players ({lobby.players.length}/4)</h3>
            <div style={{ marginBottom: 12 }}>
              {lobby.players.map((p) => (
                <div key={p.id} style={playerRowStyle}>
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
                    <button onClick={() => onRemoveBot(p.id)} style={removeBtn}>
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 4 - lobby.players.length }).map((_, i) => (
                <div key={`empty-${i}`} style={{ ...playerRowStyle, color: '#555' }}>
                  Empty slot
                </div>
              ))}
            </div>

            {/* Add Bot */}
            {isHost && lobby.players.length < 4 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#aaa' }}>Add Bot:</span>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(Number(e.target.value) as BotDifficulty)}
                  style={selectStyle}
                >
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as BotDifficulty[]).map((d) => (
                    <option key={d} value={d}>
                      {d} — {BOT_DIFFICULTY_NAMES[d]}
                    </option>
                  ))}
                </select>
                <button onClick={() => onAddBot(selectedDifficulty)} style={botBtn}>
                  Add
                </button>
              </div>
            )}

            {/* Chat */}
            <h3 style={sectionTitle}>Chat</h3>
            <div style={chatBoxStyle}>
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
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                style={chatInputStyle}
              />
              <button onClick={handleSendChat} style={smallBtn}>Send</button>
            </div>
          </div>

          {/* Right: Rules */}
          <div style={{ flex: 1, minWidth: 250 }}>
            <RulesConfig rules={lobby.rules} onChange={onUpdateRules} disabled={!isHost} />
          </div>
        </div>

        {/* Start button */}
        {isHost && (
          <button
            onClick={onStartGame}
            disabled={lobby.players.length < 4}
            style={{
              ...startBtnStyle,
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

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: 20,
  minHeight: '100vh',
};

const panelStyle: React.CSSProperties = {
  background: '#16213e',
  borderRadius: 16,
  padding: 30,
  width: '100%',
  maxWidth: 800,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const codeBoxStyle: React.CSSProperties = {
  background: '#0f3460',
  borderRadius: 8,
  padding: '10px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  color: '#aaa',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const playerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#0f3460',
  borderRadius: 6,
  marginBottom: 4,
  fontSize: 14,
};

const chatBoxStyle: React.CSSProperties = {
  height: 150,
  overflowY: 'auto',
  background: '#0f3460',
  borderRadius: 6,
  padding: 8,
  marginBottom: 6,
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  background: '#0f3460',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#eee',
  fontSize: 13,
  outline: 'none',
};

const smallBtn: React.CSSProperties = {
  padding: '6px 12px',
  background: '#2a5298',
  color: '#eee',
  border: 'none',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: '#0f3460',
  color: '#eee',
  border: '1px solid #88c0d0',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
};

const botBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: '#1a3a5c',
  color: '#88c0d0',
  border: '1px solid #88c0d0',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
};

const removeBtn: React.CSSProperties = {
  padding: '2px 8px',
  background: 'transparent',
  color: '#e53e3e',
  border: '1px solid #e53e3e',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
};

const linkBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#888',
  border: 'none',
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const startBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 20px',
  background: '#43a047',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 18,
  fontWeight: 'bold',
  marginTop: 20,
  cursor: 'pointer',
};

export default LobbyScreen;
