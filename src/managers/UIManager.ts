import type { PlayerConfig, GameState, LobbyData, ConnectionState } from '../types';
import { DEFAULT_PLAYER_COLORS, DEFAULT_KEY_BINDINGS } from '../types';
import { LobbyManager } from './LobbyManager';

export class UIManager {
    private players: PlayerConfig[] = [];
    private onlinePlayers: Map<string, { id: string; name: string; color: string }> = new Map();
    private onStartGame?: (players: PlayerConfig[]) => void;
    private onPlayAgain?: () => void;
    private onStartOnlineGame?: () => void;
    private gameMode: 'local' | 'online' = 'local';
    private lobbyManager: LobbyManager;
    private isPlayerReady = false;

    constructor() {
        this.lobbyManager = new LobbyManager();
        this.setupEventListeners();
        this.setupOnlineEventListeners();
        this.setupKeyboardShortcuts();
        this.showMainMenu();
        
        // Check if there's a lobby code in URL
        const lobbyCodeFromUrl = LobbyManager.parseLobbyCodeFromUrl();
        if (lobbyCodeFromUrl) {
            this.showJoinLobbyScreen(lobbyCodeFromUrl);
        }
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
        
        // Start next round button
        const startNextRoundBtn = document.getElementById('start-next-round-btn');
        startNextRoundBtn?.addEventListener('click', () => this.startNextRound());
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
        console.log(`[UIManager] Game state update: ${state.gamePhase}`);
        switch (state.gamePhase) {
            case 'playing':
                this.updateHUD(state);
                this.hideStartNextRoundButton();
                break;
            case 'roundOver':
            case 'waitingForNextRound':
                this.updateHUD(state);
                if (state.gameMode === 'online') {
                    this.showStartNextRoundButton();
                }
                break;
            case 'gameOver':
                this.showGameOver(state);
                this.hideStartNextRoundButton();
                break;
            case 'countdown':
                this.updateHUD(state);
                this.hideStartNextRoundButton();
                // Handle countdown display
                this.showCountdown();
                break;
        }
    }

    private updateHUD(state: GameState): void {
        // Update scores
        const scoresDiv = document.getElementById('scores');
        if (scoresDiv) {
            scoresDiv.innerHTML = state.scores
                .map(score => {
                    let player;
                    
                    if (state.gameMode === 'online') {
                        // For online games, try to get player from stored online players
                        player = this.onlinePlayers.get(score.playerId);
                        
                        // If not found in stored players, try to get from current lobby
                        if (!player) {
                            const lobby = this.lobbyManager.getCurrentLobby();
                            const lobbyPlayer = lobby?.players.find(p => p.id === score.playerId);
                            if (lobbyPlayer) {
                                player = {
                                    id: lobbyPlayer.id,
                                    name: lobbyPlayer.name,
                                    color: lobbyPlayer.color
                                };
                                // Store for future use
                                this.onlinePlayers.set(score.playerId, player);
                            }
                        }
                    } else {
                        // For local games, use the local players array
                        player = this.players.find(p => p.id === score.playerId);
                    }
                    
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
                    let player;
                    
                    if (state.gameMode === 'online') {
                        // For online games, get player from stored online players
                        player = this.onlinePlayers.get(score.playerId);
                        
                        // If not found in stored players, try to get from current lobby
                        if (!player) {
                            const lobby = this.lobbyManager.getCurrentLobby();
                            const lobbyPlayer = lobby?.players.find(p => p.id === score.playerId);
                            if (lobbyPlayer) {
                                player = {
                                    id: lobbyPlayer.id,
                                    name: lobbyPlayer.name,
                                    color: lobbyPlayer.color
                                };
                            }
                        }
                    } else {
                        // For local games, use the local players array
                        player = this.players.find(p => p.id === score.playerId);
                    }
                    
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

    // Online Multiplayer Methods
    public setStartOnlineGameCallback(callback: () => void): void {
        this.onStartOnlineGame = callback;
    }

    private setupOnlineEventListeners(): void {
        // Main menu navigation
        const localBtn = document.getElementById('local-multiplayer-btn');
        localBtn?.addEventListener('click', () => this.showLocalMultiplayer());

        const onlineBtn = document.getElementById('online-multiplayer-btn');
        onlineBtn?.addEventListener('click', () => this.showOnlineMultiplayer());

        // Back buttons
        const backToMainBtns = document.querySelectorAll('#back-to-main, #back-to-main-online');
        backToMainBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showMainMenu());
        });

        // Online lobby navigation
        const createLobbyBtn = document.getElementById('create-lobby-btn');
        createLobbyBtn?.addEventListener('click', () => this.showCreateLobbyScreen());

        const joinLobbyBtn = document.getElementById('join-lobby-btn');
        joinLobbyBtn?.addEventListener('click', () => this.showJoinLobbyScreen());

        const backToOnlineBtns = document.querySelectorAll('#back-to-online, #back-to-online-join');
        backToOnlineBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showOnlineMultiplayer());
        });

        // Lobby actions
        const createLobbyConfirm = document.getElementById('create-lobby-confirm');
        createLobbyConfirm?.addEventListener('click', () => this.createLobby());

        const joinLobbyConfirm = document.getElementById('join-lobby-confirm');
        joinLobbyConfirm?.addEventListener('click', () => this.joinLobby());

        const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
        leaveLobbyBtn?.addEventListener('click', () => this.leaveLobby());

        const readyBtn = document.getElementById('ready-btn');
        readyBtn?.addEventListener('click', () => this.toggleReady());

        const startOnlineGameBtn = document.getElementById('start-online-game');
        startOnlineGameBtn?.addEventListener('click', () => this.startOnlineGame());

        // Share buttons
        const copyCodeBtn = document.getElementById('copy-code-btn');
        copyCodeBtn?.addEventListener('click', () => this.copyLobbyCode());

        const copyLinkBtn = document.getElementById('copy-link-btn');
        copyLinkBtn?.addEventListener('click', () => this.copyLobbyLink());

        // Setup lobby manager callbacks
        this.lobbyManager.setLobbyStateChangeCallback((lobby) => this.handleLobbyStateChange(lobby));
        this.lobbyManager.setConnectionStateChangeCallback((state) => this.handleConnectionStateChange(state));
        this.lobbyManager.setGameStartedCallback(() => this.handleOnlineGameStarted());
    }

    private showMainMenu(): void {
        this.gameMode = 'local';
        this.showScreen('main-menu');
    }

    private showLocalMultiplayer(): void {
        this.gameMode = 'local';
        this.addDefaultPlayer(); // Start with one player for local
        this.showScreen('start-screen');
    }

    private async showOnlineMultiplayer(): Promise<void> {
        this.gameMode = 'online';
        this.showScreen('online-menu');
        
        // Attempt to connect to server
        const connected = await this.lobbyManager.connect();
        if (!connected) {
            this.showError('online-menu', 'Failed to connect to server');
        }
    }

    private showCreateLobbyScreen(): void {
        this.showScreen('create-lobby-screen');
        const nameInput = document.getElementById('host-name') as HTMLInputElement;
        if (nameInput) {
            nameInput.focus();
        }
    }

    private showJoinLobbyScreen(lobbyCode?: string): void {
        this.showScreen('join-lobby-screen');
        
        if (lobbyCode) {
            const codeInput = document.getElementById('lobby-code') as HTMLInputElement;
            if (codeInput) {
                codeInput.value = lobbyCode.toUpperCase();
            }
        }
        
        const nameInput = document.getElementById('player-name') as HTMLInputElement;
        if (nameInput) {
            nameInput.focus();
        }
    }

    private async createLobby(): Promise<void> {
        const nameInput = document.getElementById('host-name') as HTMLInputElement;
        const playerName = nameInput?.value.trim();
        
        if (!playerName) {
            this.showError('create-lobby-screen', 'Please enter your name');
            return;
        }

        try {
            const result = await this.lobbyManager.createLobby(playerName);
            
            if (result.success) {
                console.log('Lobby created:', result.lobbyCode);
                this.showLobbyScreen();
            } else {
                this.showError('create-lobby-screen', result.error || 'Failed to create lobby');
            }
        } catch (error) {
            this.showError('create-lobby-screen', 'Connection error');
        }
    }

    private async joinLobby(): Promise<void> {
        const nameInput = document.getElementById('player-name') as HTMLInputElement;
        const codeInput = document.getElementById('lobby-code') as HTMLInputElement;
        
        const playerName = nameInput?.value.trim();
        const lobbyCode = codeInput?.value.trim().toUpperCase();
        
        if (!playerName) {
            this.showError('join-lobby-screen', 'Please enter your name');
            return;
        }
        
        if (!lobbyCode) {
            this.showError('join-lobby-screen', 'Please enter lobby code');
            return;
        }

        try {
            const result = await this.lobbyManager.joinLobby(lobbyCode, playerName);
            
            if (result.success) {
                console.log('Joined lobby');
                this.showLobbyScreen();
            } else {
                this.showError('join-lobby-screen', result.error || 'Failed to join lobby');
            }
        } catch (error) {
            this.showError('join-lobby-screen', 'Connection error');
        }
    }

    private showLobbyScreen(): void {
        this.showScreen('lobby-screen');
        const lobby = this.lobbyManager.getCurrentLobby();
        
        if (lobby) {
            // Update lobby code display
            const codeDisplay = document.getElementById('lobby-code-display');
            if (codeDisplay) {
                codeDisplay.textContent = lobby.id;
            }
            
            this.updateLobbyDisplay(lobby);
        }
    }

    private updateLobbyDisplay(lobby: LobbyData): void {
        // Update players list
        const playersDiv = document.getElementById('lobby-players');
        if (playersDiv) {
            playersDiv.innerHTML = lobby.players.map(player => {
                const statusText = player.isHost ? 'Host' : (player.isReady ? 'Ready' : 'Not Ready');
                const statusClass = player.isHost ? 'host' : (player.isReady ? 'ready' : '');
                const itemClass = `lobby-player-item ${statusClass}`;
                
                // Show key bindings if available
                const keyBindingsText = player.leftKey && player.rightKey ? 
                    `${this.getKeyDisplayName(player.leftKey)} / ${this.getKeyDisplayName(player.rightKey)}` : '';
                
                return `
                    <div class="${itemClass}">
                        <div class="lobby-player-info">
                            <div class="player-color" style="background-color: ${player.color};"></div>
                            <span>${player.name}</span>
                            ${keyBindingsText ? `<span class="player-controls" style="margin-left: 10px; font-size: 0.8rem; color: #ccc;">(${keyBindingsText})</span>` : ''}
                        </div>
                        <span class="lobby-player-status ${statusClass}">${statusText}</span>
                    </div>
                `;
            }).join('');
        }

        // Update ready button
        const readyBtn = document.getElementById('ready-btn') as HTMLButtonElement;
        const localPlayer = this.lobbyManager.getLocalPlayer();
        
        if (readyBtn && localPlayer) {
            readyBtn.textContent = localPlayer.isReady ? 'Not Ready' : 'Ready';
            readyBtn.className = localPlayer.isReady ? 'ready' : 'not-ready';
        }

        // Update start game button visibility
        const startBtn = document.getElementById('start-online-game');
        if (startBtn && this.lobbyManager.isHost()) {
            if (this.lobbyManager.canStartGame()) {
                startBtn.classList.remove('hidden');
            } else {
                startBtn.classList.add('hidden');
            }
        }

        // Update lobby status
        const statusDiv = document.getElementById('lobby-status');
        if (statusDiv) {
            const readyCount = lobby.players.filter(p => p.isReady).length;
            const totalCount = lobby.players.length;
            
            if (lobby.players.length < 2) {
                statusDiv.textContent = 'Waiting for more players...';
            } else if (readyCount === totalCount) {
                statusDiv.textContent = 'All players ready!';
            } else {
                statusDiv.textContent = `${readyCount}/${totalCount} players ready`;
            }
        }
    }

    private handleLobbyStateChange(lobby: LobbyData | null): void {
        if (lobby) {
            this.updateLobbyDisplay(lobby);
        } else {
            // Lobby was closed or we were disconnected
            this.showOnlineMultiplayer();
        }
    }

    private handleConnectionStateChange(state: ConnectionState): void {
        this.updateConnectionStatus(state);
    }

    private handleOnlineGameStarted(): void {
        // Store online player data for score display
        const lobby = this.lobbyManager.getCurrentLobby();
        if (lobby) {
            lobby.players.forEach(player => {
                this.onlinePlayers.set(player.id, {
                    id: player.id,
                    name: player.name,
                    color: player.color
                });
            });
            console.log('Stored online player data for UI:', Array.from(this.onlinePlayers.values()));
        }
        
        this.showScreen('game-hud');
        if (this.onStartOnlineGame) {
            this.onStartOnlineGame();
        }
    }

    private updateConnectionStatus(state: ConnectionState): void {
        const statusDiv = document.getElementById('connection-status');
        if (!statusDiv) return;

        statusDiv.className = 'connection-status';
        
        if (state.isConnecting) {
            statusDiv.classList.add('connecting');
            statusDiv.textContent = 'Connecting to server...';
        } else if (state.isConnected) {
            statusDiv.classList.add('connected');
            statusDiv.textContent = `Connected (${state.latency}ms)`;
        } else {
            statusDiv.classList.add('disconnected');
            statusDiv.textContent = state.error || 'Disconnected';
        }
    }

    private leaveLobby(): void {
        this.lobbyManager.leaveLobby();
        this.showOnlineMultiplayer();
    }

    private toggleReady(): void {
        this.isPlayerReady = !this.isPlayerReady;
        this.lobbyManager.setReady(this.isPlayerReady);
    }

    private startOnlineGame(): void {
        this.lobbyManager.startGame();
    }

    private async copyLobbyCode(): Promise<void> {
        const success = await this.lobbyManager.copyLobbyCodeToClipboard();
        const btn = document.getElementById('copy-code-btn');
        
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = success ? 'Copied!' : 'Failed';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    }

    private async copyLobbyLink(): Promise<void> {
        const success = await this.lobbyManager.copyLobbyLinkToClipboard();
        const btn = document.getElementById('copy-link-btn');
        
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = success ? 'Copied!' : 'Failed';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    }

    private showError(screenId: string, message: string): void {
        const errorDiv = document.getElementById(`${screenId.replace('-screen', '')}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.classList.remove('show');
            }, 5000);
        }
    }

    public getGameMode(): 'local' | 'online' {
        return this.gameMode;
    }
    
    public getLobbyManager(): LobbyManager {
        return this.lobbyManager;
    }

    private startNextRound(): void {
        if (this.gameMode === 'online' && this.lobbyManager.isHost()) {
            this.lobbyManager.startNextRound();
        }
    }

    private showStartNextRoundButton(): void {
        const btn = document.getElementById('start-next-round-btn');
        if (btn && this.gameMode === 'online' && this.lobbyManager.isHost()) {
            btn.classList.remove('hidden');
        }
    }

    private hideStartNextRoundButton(): void {
        const btn = document.getElementById('start-next-round-btn');
        if (btn) {
            btn.classList.add('hidden');
        }
    }

    private showCountdown(): void {
        const roundInfo = document.getElementById('round-info');
        if (roundInfo) {
            roundInfo.textContent = 'Get Ready!';
        }
    }

    public updateCountdown(count: number): void {
        const roundInfo = document.getElementById('round-info');
        if (roundInfo) {
            roundInfo.textContent = count > 0 ? count.toString() : 'GO!';
        }
    }

    private setupKeyboardShortcuts(): void {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            console.log(`Key pressed: ${event.code}, Can start next round: ${this.canHostStartNextRound()}`);
            
            // Space bar to start next round (only for online host during round end)
            if (event.code === 'Space' && this.canHostStartNextRound()) {
                console.log('Space bar pressed - starting next round');
                event.preventDefault(); // Prevent page scroll
                this.startNextRound();
            }
        });
    }

    private canHostStartNextRound(): boolean {
        // Check if conditions are right for host to start next round
        const isOnline = this.gameMode === 'online';
        const isHost = this.lobbyManager.isHost();
        const buttonVisible = this.isStartNextRoundButtonVisible();
        
        console.log(`Debug - canHostStartNextRound: gameMode=${this.gameMode}, isHost=${isHost}, buttonVisible=${buttonVisible}`);
        
        return isOnline && isHost && buttonVisible;
    }

    private isStartNextRoundButtonVisible(): boolean {
        const btn = document.getElementById('start-next-round-btn');
        return btn && !btn.classList.contains('hidden');
    }

    public cleanup(): void {
        this.lobbyManager.cleanup();
    }
}
