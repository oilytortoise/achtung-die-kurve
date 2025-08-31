import * as Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { OnlineGameManager } from '../managers/OnlineGameManager';
import type { GameConfig } from '../types';

export class GameScene extends Phaser.Scene {
    private gameManager?: GameManager;
    private onlineGameManager?: OnlineGameManager;
    
    constructor() {
        super({ key: 'GameScene' });
    }

    public init(data: { config: GameConfig, onlineGameManager?: OnlineGameManager }): void {
        console.log('GameScene init called with:', data);
        if (data && data.config) {
            if (data.onlineGameManager) {
                // Use provided online game manager
                this.onlineGameManager = data.onlineGameManager;
                console.log('Using provided OnlineGameManager');
            } else if (data.config.gameMode === 'online') {
                // Create new online game manager for online mode
                this.onlineGameManager = new OnlineGameManager(this, data.config);
                console.log('Created new OnlineGameManager');
            } else {
                // Create regular game manager for local mode
                this.gameManager = new GameManager(this, data.config);
                console.log('Created new GameManager');
            }
        } else {
            console.error('No config provided to GameScene');
        }
    }

    public create(): void {
        console.log('GameScene create called');
        
        // Set up the game background
        this.cameras.main.setBackgroundColor('#000000');
        
        // Add a visible border to help with debugging
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeRect(0, 0, this.scale.width, this.scale.height);
        
        // Start the game if manager exists
        if (this.gameManager) {
            console.log('Starting local game with GameManager');
            this.gameManager.startGame();
        } else if (this.onlineGameManager) {
            console.log('Online game scene ready, OnlineGameManager will handle game start');
            // For online games, the OnlineGameManager handles starting via network events
        } else {
            console.error('No game manager initialized');
        }
    }

    public update(): void {
        // Update the appropriate game manager
        if (this.gameManager) {
            this.gameManager.update();
        } else if (this.onlineGameManager) {
            this.onlineGameManager.update();
        }
    }

    public getGameManager(): GameManager | undefined {
        return this.gameManager;
    }
    
    public getOnlineGameManager(): OnlineGameManager | undefined {
        return this.onlineGameManager;
    }
}
