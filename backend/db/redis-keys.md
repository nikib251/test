# Redis Key Patterns — Hearts Card Game

## Overview

Redis serves as the real-time data layer for active games and lobbies. PostgreSQL is the persistent store; Redis holds ephemeral state that is written to Postgres on game completion.

---

## Key Patterns

### `game:{gameId}`

| Field | Value |
|-------|-------|
| **Type** | STRING (JSON) |
| **TTL** | 2 hours, refreshed on every trick completion |
| **Content** | Full `GameState` object |

Stores the authoritative game state while a game is active. Created when `start_game` fires; deleted after results are persisted to Postgres.

```jsonc
// Example: GET game:abc-123
{
  "gameId": "abc-123",
  "phase": "playing",
  "players": [ /* PlayerState[] */ ],
  "currentTrick": [],
  "trickLeader": "socket-id-1",
  "currentPlayerId": "socket-id-1",
  "round": 1,
  "trickNumber": 3,
  "heartsBroken": false,
  "rules": { /* RuleVariants */ },
  "scores": { "socket-id-1": 0, "bot-uuid-1": 0 },
  "roundScores": [],
  "passDirection": "left",
  "passedCards": {}
}
```

**Operations:**
- `SET game:{gameId} <json> EX 7200` — create / update
- `GET game:{gameId}` — read current state
- `DEL game:{gameId}` — cleanup after game ends

---

### `lobby:{gameId}`

| Field | Value |
|-------|-------|
| **Type** | STRING (JSON) |
| **TTL** | 30 minutes while waiting; reduced to 5 minutes after game starts |
| **Content** | `LobbyInfo` object |

Holds lobby metadata for games in the `waiting` phase. Used by `list_lobbies` and the lobby browser UI.

```jsonc
// Example: GET lobby:abc-123
{
  "gameId": "abc-123",
  "hostId": "socket-id-1",
  "players": [
    { "id": "socket-id-1", "nickname": "Alice", "role": "human", "difficulty": null },
    { "id": "bot-uuid-1", "nickname": "Bot-Easy", "role": "bot", "difficulty": "easy" }
  ],
  "rules": { /* RuleVariants */ }
}
```

**Operations:**
- `SET lobby:{gameId} <json> EX 1800` — create / update
- `GET lobby:{gameId}` — read lobby info
- `EXPIRE lobby:{gameId} 300` — shorten TTL when game starts
- `DEL lobby:{gameId}` — cleanup

---

### `player:{socketId}`

| Field | Value |
|-------|-------|
| **Type** | STRING (JSON) |
| **TTL** | No TTL while connected; 60 seconds TTL set on disconnect (reconnection grace period) |
| **Content** | Player session mapping |

Maps a socket connection to a player's current game. Enables reconnection: when a socket reconnects, look up by nickname to find the in-progress game.

```jsonc
// Example: GET player:socket-id-1
{
  "nickname": "Alice",
  "gameId": "abc-123",
  "playerId": "socket-id-1"
}
```

**Operations:**
- `SET player:{socketId} <json>` — create on lobby join (no TTL while connected)
- `EXPIRE player:{socketId} 60` — set 60s grace on disconnect
- `PERSIST player:{socketId}` — remove TTL on reconnect
- `DEL player:{socketId}` — cleanup on leave / game end

---

### `lobbies`

| Field | Value |
|-------|-------|
| **Type** | SET |
| **TTL** | None (members are managed application-side) |
| **Content** | Set of open game IDs |

A set of all game IDs currently in the `waiting` phase. Used for fast lobby listing without scanning keys.

**Operations:**
- `SADD lobbies {gameId}` — add when lobby is created
- `SREM lobbies {gameId}` — remove when game starts or lobby is disbanded
- `SMEMBERS lobbies` — list all open lobbies

---

## TTL Summary

| Key Pattern | TTL | Refresh Strategy |
|---|---|---|
| `game:{gameId}` | 2 hours | Reset to 2h on each trick completion |
| `lobby:{gameId}` | 30 min / 5 min | 30min while waiting; 5min after game starts |
| `player:{socketId}` | None / 60s | No TTL while connected; 60s on disconnect |
| `lobbies` (SET) | None | Cleaned app-side on game start / lobby disband |

---

## Lifecycle

```
Create Lobby:
  SADD lobbies {gameId}
  SET lobby:{gameId} <json> EX 1800
  SET player:{socketId} <json>

Join Lobby:
  Update lobby:{gameId}
  SET player:{socketId} <json>

Start Game:
  SREM lobbies {gameId}
  EXPIRE lobby:{gameId} 300
  SET game:{gameId} <json> EX 7200

Each Trick:
  Update game:{gameId} + EXPIRE game:{gameId} 7200

Player Disconnect:
  EXPIRE player:{socketId} 60

Player Reconnect:
  PERSIST player:{socketId}

Game End:
  Persist to PostgreSQL (game_sessions, game_results, players)
  DEL game:{gameId}
  DEL lobby:{gameId}
  DEL player:{socketId} (for each player)
```
