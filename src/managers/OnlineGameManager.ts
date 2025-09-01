import type { GameConfig, GameState, PlayerInput, NetworkGameState, OnlinePlayer as OnlinePlayerData } from '../types';
import { networkClient } from '../network/NetworkClient';
import { OnlinePlayer } from '../entities/OnlinePlayer';

export class OnlineGameManager {
    private state: GameState;
    private scene: Phaser.Scene;
    private onGameStateChange?: (state: GameState) => void;
    private playerEntities: Map<string, OnlinePlayer> = new Map();
    private playerData: Map<string, OnlinePlayerData> = new Map();
    private localPlayerId?: string;
    private inputBuffer: PlayerInput[] = [];
    private interpolationBuffer: NetworkGameState[] = [];
    private maxBufferSize = 10;
    private leftPressed: boolean = false;
    private rightPressed: boolean = false;
    private keyListenersSetup: boolean = false;

    constructor(scene: Phaser.Scene, _config: GameConfig) {
        this.scene = scene;
        this.state = {
            currentRound: 1,
            scores: [],
            gamePhase: 'lobby',
            gameMode: 'online'
        };

        this.setupNetworkListeners();
    }

    public setGameStateChangeCallback(callback: (state: GameState) => void): void {
        this.onGameStateChange = callback;
    }

    private setupNetworkListeners(): void {
        networkClient.on('gameStateUpdate', (networkState: NetworkGameState) => {
            this.handleServerGameStateUpdate(networkState);
        });

        networkClient.on('gameStarted', (data: any) => {
            this.handleGameStarted(data);
        });

        networkClient.on('playerJoined', (playerData: OnlinePlayerData) => {
            this.playerData.set(playerData.id, playerData);
        });

        networkClient.on('playerLeft', (playerId: string) => {
            // Remove visual entity
            const entity = this.playerEntities.get(playerId);
            if (entity) {
                entity.destroy();
                this.playerEntities.delete(playerId);
            }
            this.playerData.delete(playerId);
        });

        networkClient.on('countdownUpdate', (data: { count: number }) => {
            this.handleCountdownUpdate(data.count);
        });
    }

    private handleGameStarted(data: any): void {
        console.log('[OnlineGameManager] Game started');
        
        // Update local state
        this.state = {
            currentRound: data.gameState.currentRound,
            scores: data.gameState.scores,
            gamePhase: 'playing',
            gameMode: 'online'
        };

        // Store player data and create visual entities
        data.players.forEach((playerData: OnlinePlayerData) => {
            this.playerData.set(playerData.id, playerData);
            
            // Create visual entity for this player
            const playerEntity = new OnlinePlayer(this.scene, playerData);
            this.playerEntities.set(playerData.id, playerEntity);
            
            console.log(`Created online player entity for ${playerData.name}`);
        });

        this.notifyStateChange();
    }

    private handleServerGameStateUpdate(networkState: NetworkGameState): void {
        console.log('[OnlineGameManager] Received game state update from server');
        console.log('[OnlineGameManager] Server phase:', networkState.gameState.phase);
        console.log('[OnlineGameManager] Full network state:', networkState);
        
        // Add to interpolation buffer
        this.interpolationBuffer.push(networkState);
        if (this.interpolationBuffer.length > this.maxBufferSize) {
            this.interpolationBuffer.shift();
        }

        // Update game state
        const newState = {
            currentRound: networkState.gameState.currentRound,
            scores: networkState.gameState.scores,
            gamePhase: networkState.gameState.phase as any,
            gameMode: 'online' as const
        };
        
        console.log('[OnlineGameManager] Setting new local state:', newState);
        this.state = newState;

        // Update player data and visual entities
        networkState.players.forEach(playerData => {
            // Update stored data
            this.playerData.set(playerData.id, playerData);
            
            // Get or create visual entity
            let playerEntity = this.playerEntities.get(playerData.id);
            if (!playerEntity) {
                // Create entity if it doesn't exist
                console.log(`Creating missing entity for player ${playerData.id} (${playerData.name})`);
                playerEntity = new OnlinePlayer(this.scene, playerData);
                this.playerEntities.set(playerData.id, playerEntity);
            }
            
            // Update the entity with server data
            playerEntity.updateFromServer(playerData);
        });

        this.notifyStateChange();
    }

    public startGame(): void {
        console.log('OnlineGameManager.startGame called - delegating to network client');
        networkClient.startGame();
    }

    public update(): void {
        if (this.state.gamePhase !== 'playing') return;

        // Handle keyboard input for local player
        this.handleLocalInput();

        // Client-side prediction (optional, for smoother gameplay)
        this.performClientSidePrediction();

        // Render current state
        this.renderGameState();
    }

    private setupKeyboardListeners(): void {
        if (this.keyListenersSetup) return;
        
        const localPlayerData = this.playerData.get(this.localPlayerId!);
        if (!localPlayerData) {
            return;
        }

        // Use fixed arrow keys for all online players
        const leftKey = 'ArrowLeft';
        const rightKey = 'ArrowRight';

        console.log(`Setting up keyboard listeners for ${localPlayerData.name}: ${leftKey} (left) / ${rightKey} (right)`);

        // Set up keyboard input listeners using fixed arrow keys
        this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (event.code === leftKey) {
                this.leftPressed = true;
            }
            if (event.code === rightKey) {
                this.rightPressed = true;
            }
        });

        this.scene.input.keyboard?.on('keyup', (event: KeyboardEvent) => {
            if (event.code === leftKey) {
                this.leftPressed = false;
            }
            if (event.code === rightKey) {
                this.rightPressed = false;
            }
        });

        this.keyListenersSetup = true;
    }

    private handleLocalInput(): void {
        if (!this.localPlayerId) return;

        const localPlayerData = this.playerData.get(this.localPlayerId);
        if (!localPlayerData) return;

        // Setup keyboard listeners if not done yet
        if (!this.keyListenersSetup) {
            this.setupKeyboardListeners();
        }

        const input: PlayerInput = {
            left: this.leftPressed,
            right: this.rightPressed,
            timestamp: Date.now()
        };

        // Send input to server
        networkClient.sendPlayerInput(input);

        // Store for potential rollback
        this.inputBuffer.push(input);
        if (this.inputBuffer.length > 60) { // Keep 1 second of inputs at 60fps
            this.inputBuffer.shift();
        }
    }

    private performClientSidePrediction(): void {
        // This is where you would implement client-side prediction
        // For now, we'll rely on server authority
        // In a more advanced implementation, you would:
        // 1. Apply inputs locally immediately
        // 2. When server state arrives, check for discrepancies
        // 3. Rollback and replay inputs if needed
    }

    private renderGameState(): void {
        // Clear previous graphics (this would be more sophisticated in practice)
        // For now, we'll let the existing Player entities handle rendering
        
        // The actual rendering would be handled by Player entities
        // that get their positions from the server state
    }

    public getGameState(): GameState {
        return { ...this.state };
    }

    public getPlayers(): OnlinePlayerData[] {
        return Array.from(this.playerData.values());
    }

    public setLocalPlayerId(playerId: string): void {
        this.localPlayerId = playerId;
    }

    private handleCountdownUpdate(count: number): void {
        console.log(`[OnlineGameManager] Countdown: ${count}`);
        // The countdown is handled by the UI manager, we could update the game state here if needed
        // For now, we'll let the UI handle the visual countdown
    }

    private notifyStateChange(): void {
        console.log('[OnlineGameManager] Notifying state change');
        console.log('[OnlineGameManager] Current state:', this.state);
        
        if (this.onGameStateChange) {
            console.log('[OnlineGameManager] Calling onGameStateChange callback');
            this.onGameStateChange(this.getGameState());
        } else {
            console.log('[OnlineGameManager] No onGameStateChange callback set!');
        }
    }

    public reset(): void {
        // Clean up visual entities
        this.playerEntities.forEach(entity => entity.destroy());
        this.playerEntities.clear();
        this.playerData.clear();
        this.inputBuffer = [];
        this.interpolationBuffer = [];
        
        // Reset input state
        this.leftPressed = false;
        this.rightPressed = false;
        this.keyListenersSetup = false;
        
        this.state = {
            currentRound: 1,
            scores: [],
            gamePhase: 'lobby',
            gameMode: 'online'
        };
        this.notifyStateChange();
    }

    public cleanup(): void {
        // Remove network listeners
        networkClient.off('gameStateUpdate');
        networkClient.off('gameStarted');
        networkClient.off('playerJoined');
        networkClient.off('playerLeft');
        
        // Remove keyboard listeners
        this.scene.input.keyboard?.removeAllListeners();
        
        this.reset();
    }

    // Utility methods for lag compensation (available for future use)
    // private getInterpolatedPosition(playerId: string, targetTime: number): { x: number; y: number } | null {
    //     const player = this.players.get(playerId);
    //     if (!player || !player.position) return null;

    //     // Simple approach: return current position
    //     // Advanced: interpolate between buffered positions
    //     return player.position;
    // }

    // private getLatency(): number {
    //     return networkClient.getLatency();
    // }

    // For debugging
    public getNetworkStats() {
        return {
            latency: networkClient.getLatency(),
            isConnected: networkClient.isConnected(),
            playerCount: this.playerData.size,
            bufferSize: this.interpolationBuffer.length,
            inputBufferSize: this.inputBuffer.length
        };
    }
}
