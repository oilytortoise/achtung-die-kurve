export interface PlayerConfig {
    id: string;
    name: string;
    color: string;
    leftKey: string;
    rightKey: string;
    isReady?: boolean;
    isHost?: boolean;
    isOnline?: boolean;
    socketId?: string;
}

export interface GameConfig {
    width: number;
    height: number;
    players: PlayerConfig[];
    roundsToWin: number;
    gameMode?: 'local' | 'online';
    lobbyCode?: string;
}

export interface PlayerScore {
    playerId: string;
    rounds: number;
}

export interface GameState {
    currentRound: number;
    scores: PlayerScore[];
    gamePhase: 'setup' | 'lobby' | 'playing' | 'roundOver' | 'gameOver' | 'waitingForNextRound' | 'countdown';
    gameMode?: 'local' | 'online';
}

// Online multiplayer specific types
export interface LobbyData {
    id: string;
    playerCount: number;
    maxPlayers: number;
    phase: string;
    players: OnlinePlayer[];
}

export interface OnlinePlayer {
    id: string;
    name: string;
    color: string;
    isReady: boolean;
    isHost: boolean;
    leftKey?: string;
    rightKey?: string;
    position?: { x: number; y: number };
    rotation?: number;
    alive?: boolean;
    trailPoints?: { x: number; y: number }[];
}

export interface NetworkGameState {
    gameState: {
        phase: string;
        currentRound: number;
        roundsToWin: number;
        scores: PlayerScore[];
        gameConfig: {
            width: number;
            height: number;
        };
    };
    players: OnlinePlayer[];
    serverTime: number;
    tickCount: number;
}

export interface ConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    latency: number;
    lobbyCode?: string;
}

export interface PlayerInput {
    left: boolean;
    right: boolean;
    timestamp?: number;
}

export const DEFAULT_PLAYER_COLORS = [
    '#ff0000', // Red
    '#0000ff', // Blue
    '#00ff00', // Green
    '#ffff00', // Yellow
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ff8000', // Orange
    '#8000ff'  // Purple
];

export const DEFAULT_KEY_BINDINGS = [
    { left: 'KeyA', right: 'KeyS' },
    { left: 'ArrowLeft', right: 'ArrowRight' },
    { left: 'KeyQ', right: 'KeyW' },
    { left: 'KeyO', right: 'KeyP' },
    { left: 'KeyF', right: 'KeyG' },
    { left: 'KeyH', right: 'KeyJ' },
    { left: 'KeyN', right: 'KeyM' },
    { left: 'KeyZ', right: 'KeyX' }
];
