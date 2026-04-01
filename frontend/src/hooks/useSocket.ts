import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  GameState,
  LobbyInfo,
  ChatMessage,
  TrickCompleteData,
  RoundCompleteData,
  GameCompleteData,
  BotDifficulty,
  RuleVariants,
} from '../types/game';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  gameState: GameState | null;
  lobby: LobbyInfo | null;
  lobbies: LobbyInfo[];
  chatMessages: ChatMessage[];
  trickComplete: TrickCompleteData | null;
  roundComplete: RoundCompleteData | null;
  gameComplete: GameCompleteData | null;
  error: { code: string; message: string } | null;
  clearError: () => void;
  clearTrickComplete: () => void;
  clearRoundComplete: () => void;
  createLobby: (nickname: string) => Promise<{ playerId: string; gameId: string }>;
  joinLobby: (gameId: string, nickname: string) => Promise<{ playerId: string }>;
  rejoinGame: (gameId: string, nickname: string) => Promise<{ success: boolean }>;
  leaveLobby: (gameId: string) => void;
  addBot: (gameId: string, difficulty: BotDifficulty) => void;
  removeBot: (gameId: string, playerId: string) => void;
  updateRules: (gameId: string, rules: RuleVariants) => void;
  startGame: (gameId: string) => void;
  passCards: (gameId: string, cardIds: string[]) => void;
  playCard: (gameId: string, cardId: string) => void;
  sendChat: (gameId: string, message: string) => void;
  listLobbies: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [trickComplete, setTrickComplete] = useState<TrickCompleteData | null>(null);
  const [roundComplete, setRoundComplete] = useState<RoundCompleteData | null>(null);
  const [gameComplete, setGameComplete] = useState<GameCompleteData | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game_state', (state: GameState) => setGameState(state));
    socket.on('lobby_updated', (info: LobbyInfo) => setLobby(info));
    socket.on('lobbies_list', (data: { lobbies: LobbyInfo[] }) => setLobbies(data.lobbies));

    socket.on('trick_complete', (data: TrickCompleteData) => setTrickComplete(data));
    socket.on('round_complete', (data: RoundCompleteData) => setRoundComplete(data));
    socket.on('game_complete', (data: GameCompleteData) => setGameComplete(data));

    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('error', (err: { code: string; message: string }) => setError(err));

    socket.on('player_disconnected', (data: { playerId: string; nickname: string }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          playerId: 'system',
          nickname: 'System',
          message: `${data.nickname} disconnected`,
          timestamp: Date.now(),
        },
      ]);
    });

    socket.on('player_reconnected', (data: { playerId: string; nickname: string }) => {
      setChatMessages((prev) => [
        ...prev,
        {
          playerId: 'system',
          nickname: 'System',
          message: `${data.nickname} reconnected`,
          timestamp: Date.now(),
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createLobby = useCallback(
    (nickname: string): Promise<{ playerId: string; gameId: string }> => {
      return new Promise((resolve, reject) => {
        socketRef.current?.emit('create_lobby', { nickname }, (response: { playerId: string; gameId: string } | { error: string }) => {
          if ('error' in response) reject(new Error(response.error));
          else resolve(response);
        });
      });
    },
    []
  );

  const joinLobby = useCallback(
    (gameId: string, nickname: string): Promise<{ playerId: string }> => {
      return new Promise((resolve, reject) => {
        socketRef.current?.emit('join_lobby', { gameId, nickname }, (response: { playerId: string } | { error: string }) => {
          if ('error' in response) reject(new Error(response.error));
          else resolve(response);
        });
      });
    },
    []
  );

  const rejoinGame = useCallback(
    (gameId: string, nickname: string): Promise<{ success: boolean }> => {
      return new Promise((resolve, reject) => {
        socketRef.current?.emit('rejoin_game', { gameId, nickname }, (response: { success: boolean } | { error: string }) => {
          if ('error' in response) reject(new Error(response.error));
          else resolve(response);
        });
      });
    },
    []
  );

  const leaveLobby = useCallback((gameId: string) => {
    socketRef.current?.emit('leave_lobby', { gameId });
  }, []);

  const addBot = useCallback((gameId: string, difficulty: BotDifficulty) => {
    socketRef.current?.emit('add_bot', { gameId, difficulty });
  }, []);

  const removeBot = useCallback((gameId: string, playerId: string) => {
    socketRef.current?.emit('remove_bot', { gameId, playerId });
  }, []);

  const updateRules = useCallback((gameId: string, rules: RuleVariants) => {
    socketRef.current?.emit('update_rules', { gameId, rules });
  }, []);

  const startGame = useCallback((gameId: string) => {
    socketRef.current?.emit('start_game', { gameId });
  }, []);

  const passCards = useCallback((gameId: string, cardIds: string[]) => {
    socketRef.current?.emit('pass_cards', { gameId, cardIds });
  }, []);

  const playCard = useCallback((gameId: string, cardId: string) => {
    socketRef.current?.emit('play_card', { gameId, cardId });
  }, []);

  const sendChat = useCallback((gameId: string, message: string) => {
    socketRef.current?.emit('chat_message', { gameId, message });
  }, []);

  const listLobbies = useCallback(() => {
    socketRef.current?.emit('list_lobbies', {});
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearTrickComplete = useCallback(() => setTrickComplete(null), []);
  const clearRoundComplete = useCallback(() => setRoundComplete(null), []);

  return {
    socket: socketRef.current,
    connected,
    gameState,
    lobby,
    lobbies,
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
    rejoinGame,
    leaveLobby,
    addBot,
    removeBot,
    updateRules,
    startGame,
    passCards,
    playCard,
    sendChat,
    listLobbies,
  };
}
