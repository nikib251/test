import React, { useState, useCallback, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

type Screen = 'home' | 'lobby' | 'game' | 'results' | 'leaderboard';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [myPlayerId, setMyPlayerId] = useState('');
  const [gameId, setGameId] = useState('');
  const [nickname, setNickname] = useState('');

  const {
    connected,
    gameState,
    lobby,
    chatMessages,
    trickComplete,
    roundComplete,
    gameComplete,
    error,
    clearError,
    clearTrickComplete,
    clearRoundComplete,
    createLobby,
    joinLobby,
    leaveLobby,
    addBot,
    removeBot,
    updateRules,
    startGame,
    passCards,
    playCard,
    sendChat,
  } = useSocket();

  // Transition to game when game_state received with playing/passing phase
  useEffect(() => {
    if (gameState && (gameState.phase === 'playing' || gameState.phase === 'passing') && screen === 'lobby') {
      setScreen('game');
    }
  }, [gameState, screen]);

  // Transition to results when game completes
  useEffect(() => {
    if (gameComplete && gameState) {
      setScreen('results');
    }
  }, [gameComplete, gameState]);

  // Show error toast
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleCreateGame = useCallback(
    async (nick: string) => {
      try {
        const result = await createLobby(nick);
        setMyPlayerId(result.playerId);
        setGameId(result.gameId);
        setNickname(nick);
        setScreen('lobby');
      } catch (err) {
        console.error('Failed to create lobby:', err);
      }
    },
    [createLobby]
  );

  const handleJoinGame = useCallback(
    async (nick: string, code: string) => {
      try {
        const result = await joinLobby(code, nick);
        setMyPlayerId(result.playerId);
        setGameId(code);
        setNickname(nick);
        setScreen('lobby');
      } catch (err) {
        console.error('Failed to join lobby:', err);
      }
    },
    [joinLobby]
  );

  const handleLeaveLobby = useCallback(() => {
    leaveLobby(gameId);
    setScreen('home');
    setGameId('');
    setMyPlayerId('');
  }, [leaveLobby, gameId]);

  const handlePlayAgain = useCallback(() => {
    setScreen('lobby');
  }, []);

  const handleMainMenu = useCallback(() => {
    setScreen('home');
    setGameId('');
    setMyPlayerId('');
  }, []);

  return (
    <div className="app-root">
      {/* Connection indicator */}
      <div
        className="connection-indicator"
        style={{ color: connected ? '#43a047' : '#e53e3e' }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#43a047' : '#e53e3e',
          }}
        />
        {connected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Error toast */}
      {error && (
        <div className="error-toast">
          {error.message}
        </div>
      )}

      {screen === 'home' && (
        <HomeScreen
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen onBack={() => setScreen('home')} />
      )}

      {screen === 'lobby' && lobby && (
        <LobbyScreen
          lobby={lobby}
          myPlayerId={myPlayerId}
          chatMessages={chatMessages}
          onAddBot={(d) => addBot(gameId, d)}
          onRemoveBot={(id) => removeBot(gameId, id)}
          onUpdateRules={(rules) => updateRules(gameId, rules)}
          onStartGame={() => startGame(gameId)}
          onSendChat={(msg) => sendChat(gameId, msg)}
          onLeave={handleLeaveLobby}
        />
      )}

      {screen === 'lobby' && !lobby && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: '#aaa', fontSize: 16 }}>Waiting for lobby data...</div>
        </div>
      )}

      {screen === 'game' && gameState && (
        <GameScreen
          gameState={gameState}
          myPlayerId={myPlayerId}
          trickComplete={trickComplete}
          roundComplete={roundComplete}
          onPassCards={(cardIds) => passCards(gameId, cardIds)}
          onPlayCard={(cardId) => playCard(gameId, cardId)}
          onClearTrickComplete={clearTrickComplete}
          onClearRoundComplete={clearRoundComplete}
        />
      )}

      {screen === 'results' && gameState && gameComplete && (
        <ResultsScreen
          gameState={gameState}
          gameComplete={gameComplete}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  );
};

export default App;
