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
        // Add to interpolation buffer
        this.interpolationBuffer.push(networkState);
        if (this.interpolationBuffer.length > this.maxBufferSize) {
            this.interpolationBuffer.shift();
        }

        // Update game state
        this.state = {
            currentRound: networkState.gameState.currentRound,
            scores: networkState.gameState.scores,
            gamePhase: networkState.gameState.phase as any,
            gameMode: 'online'
        };

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

    private handleLocalInput(): void {
        if (!this.localPlayerId) return;

        // Get current input state
        const keyboard = this.scene.input.keyboard;
        if (!keyboard) return;

        const localPlayerData = this.playerData.get(this.localPlayerId);
        if (!localPlayerData) return;

        // Determine which keys to check based on player configuration
        // For now, we'll use a simple approach - this would need to be more sophisticated
        const input: PlayerInput = {
            left: keyboard.checkDown(keyboard.addKey('ArrowLeft'), 0) || keyboard.checkDown(keyboard.addKey('A'), 0),
            right: keyboard.checkDown(keyboard.addKey('ArrowRight'), 0) || keyboard.checkDown(keyboard.addKey('S'), 0),
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

    private notifyStateChange(): void {
        if (this.onGameStateChange) {
            this.onGameStateChange(this.getGameState());
        }
    }

    public reset(): void {
        // Clean up visual entities
        this.playerEntities.forEach(entity => entity.destroy());
        this.playerEntities.clear();
        this.playerData.clear();
        this.inputBuffer = [];
        this.interpolationBuffer = [];
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
