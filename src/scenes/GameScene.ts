import * as Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import type { GameConfig } from '../types';

export class GameScene extends Phaser.Scene {
    private gameManager?: GameManager;
    
    constructor() {
        super({ key: 'GameScene' });
    }

    public init(data: { config: GameConfig }): void {
        console.log('GameScene init called with:', data);
        if (data && data.config) {
            this.gameManager = new GameManager(this, data.config);
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
            console.log('Starting game with manager');
            this.gameManager.startGame();
        } else {
            console.error('GameManager not initialized');
        }
    }

    public update(): void {
        // Update the game manager
        if (this.gameManager) {
            this.gameManager.update();
        }
    }

    public getGameManager(): GameManager | undefined {
        return this.gameManager;
    }
}
