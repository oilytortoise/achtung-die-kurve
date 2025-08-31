export interface PlayerConfig {
    id: string;
    name: string;
    color: string;
    leftKey: string;
    rightKey: string;
}

export interface GameConfig {
    width: number;
    height: number;
    players: PlayerConfig[];
    roundsToWin: number;
}

export interface PlayerScore {
    playerId: string;
    rounds: number;
}

export interface GameState {
    currentRound: number;
    scores: PlayerScore[];
    gamePhase: 'setup' | 'playing' | 'roundOver' | 'gameOver';
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
