import type { PlayerConfig, GameState } from '../types';
import { DEFAULT_PLAYER_COLORS, DEFAULT_KEY_BINDINGS } from '../types';

export class UIManager {
    private players: PlayerConfig[] = [];
    private onStartGame?: (players: PlayerConfig[]) => void;
    private onPlayAgain?: () => void;

    constructor() {
        this.setupEventListeners();
        this.addDefaultPlayer(); // Start with one player
    }

    public setStartGameCallback(callback: (players: PlayerConfig[]) => void): void {
        this.onStartGame = callback;
    }

    public setPlayAgainCallback(callback: () => void): void {
        this.onPlayAgain = callback;
    }

    private setupEventListeners(): void {
        // Add player button
        const addPlayerBtn = document.getElementById('add-player');
        addPlayerBtn?.addEventListener('click', () => this.addPlayer());

        // Start game button
        const startGameBtn = document.getElementById('start-game');
        startGameBtn?.addEventListener('click', () => this.startGame());

        // Play again button
        const playAgainBtn = document.getElementById('play-again');
        playAgainBtn?.addEventListener('click', () => this.playAgain());
    }

    private addDefaultPlayer(): void {
        this.addPlayer('Player 1');
    }

    private addPlayer(name?: string): void {
        if (this.players.length >= 8) return; // Max 8 players

        const playerIndex = this.players.length;
        const playerName = name || `Player ${playerIndex + 1}`;
        const color = DEFAULT_PLAYER_COLORS[playerIndex];
        const keyBinding = DEFAULT_KEY_BINDINGS[playerIndex];

        const player: PlayerConfig = {
            id: `player-${Date.now()}-${playerIndex}`,
            name: playerName,
            color: color,
            leftKey: keyBinding.left,
            rightKey: keyBinding.right
        };

        this.players.push(player);
        this.updatePlayerList();
        this.updateStartButton();
    }

    private removePlayer(playerId: string): void {
        this.players = this.players.filter(p => p.id !== playerId);
        this.updatePlayerList();
        this.updateStartButton();
    }

    private updatePlayerList(): void {
        const playerList = document.getElementById('player-list');
        if (!playerList) return;

        playerList.innerHTML = '';

        this.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            playerDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="player-color" style="background-color: ${player.color};"></div>
                    <span>${player.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="player-controls">${this.getKeyDisplayName(player.leftKey)} / ${this.getKeyDisplayName(player.rightKey)}</span>
                    <button class="remove-player" data-player-id="${player.id}">Remove</button>
                </div>
            `;

            // Add remove button functionality
            const removeBtn = playerDiv.querySelector('.remove-player') as HTMLButtonElement;
            removeBtn?.addEventListener('click', () => this.removePlayer(player.id));

            playerList.appendChild(playerDiv);
        });
    }

    private getKeyDisplayName(keyCode: string): string {
        const keyMap: Record<string, string> = {
            'KeyA': 'A', 'KeyS': 'S', 'KeyQ': 'Q', 'KeyW': 'W',
            'KeyF': 'F', 'KeyG': 'G', 'KeyH': 'H', 'KeyJ': 'J',
            'KeyN': 'N', 'KeyM': 'M', 'KeyZ': 'Z', 'KeyX': 'X',
            'KeyO': 'O', 'KeyP': 'P',
            'ArrowLeft': '←', 'ArrowRight': '→'
        };
        return keyMap[keyCode] || keyCode;
    }

    private updateStartButton(): void {
        const startBtn = document.getElementById('start-game') as HTMLButtonElement;
        if (startBtn) {
            startBtn.disabled = this.players.length < 2;
        }
    }

    private startGame(): void {
        this.showScreen('game-hud');
        if (this.onStartGame) {
            this.onStartGame([...this.players]);
        }
    }

    private playAgain(): void {
        this.showScreen('start-screen');
        if (this.onPlayAgain) {
            this.onPlayAgain();
        }
    }

    public updateGameState(state: GameState): void {
        switch (state.gamePhase) {
            case 'playing':
                this.updateHUD(state);
                break;
            case 'roundOver':
                this.updateHUD(state);
                break;
            case 'gameOver':
                this.showGameOver(state);
                break;
        }
    }

    private updateHUD(state: GameState): void {
        // Update scores
        const scoresDiv = document.getElementById('scores');
        if (scoresDiv) {
            scoresDiv.innerHTML = state.scores
                .map(score => {
                    const player = this.players.find(p => p.id === score.playerId);
                    if (!player) return '';
                    return `
                        <div class="score-item">
                            <span style="color: ${player.color}">${player.name}</span>
                            <span>${score.rounds}</span>
                        </div>
                    `;
                })
                .join('');
        }

        // Update round info
        const roundInfo = document.getElementById('round-info');
        if (roundInfo) {
            roundInfo.textContent = `Round ${state.currentRound}`;
        }
    }

    private showGameOver(state: GameState): void {
        this.showScreen('game-over');
        
        const finalScoresDiv = document.getElementById('final-scores');
        if (finalScoresDiv) {
            const sortedScores = [...state.scores].sort((a, b) => b.rounds - a.rounds);
            const winner = sortedScores[0];
            
            finalScoresDiv.innerHTML = sortedScores
                .map(score => {
                    const player = this.players.find(p => p.id === score.playerId);
                    if (!player) return '';
                    const isWinner = score.playerId === winner.playerId;
                    return `
                        <div class="final-score-item ${isWinner ? 'winner' : ''}">
                            <span style="color: ${player.color}">${player.name}</span>
                            <span>${score.rounds} ${isWinner ? '🏆' : ''}</span>
                        </div>
                    `;
                })
                .join('');
        }
    }

    private showScreen(screenId: string): void {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    }

    public getPlayers(): PlayerConfig[] {
        return [...this.players];
    }
}
