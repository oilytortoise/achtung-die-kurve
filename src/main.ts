import * as Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { UIManager } from './managers/UIManager';
import type { GameConfig, PlayerConfig } from './types';

class AchtungDieKurveGame {
    private game: Phaser.Game;
    private uiManager: UIManager;
    private gameScene?: GameScene;

    constructor() {
        this.uiManager = new UIManager();
        this.setupUICallbacks();
        
        // Initialize Phaser game
        this.game = new Phaser.Game({
            type: Phaser.AUTO,
            width: 1200,
            height: 800,
            parent: 'game-canvas',
            backgroundColor: '#000000',
            scene: [GameScene],
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: 1200,
                height: 800
            },
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false
                }
            },
            input: {
                keyboard: true
            }
        });
    }

    private setupUICallbacks(): void {
        this.uiManager.setStartGameCallback((players: PlayerConfig[]) => {
            this.startGame(players);
        });

        this.uiManager.setPlayAgainCallback(() => {
            this.resetGame();
        });
    }

    private startGame(players: PlayerConfig[]): void {
        console.log('Starting game with players:', players);
        
        const gameConfig: GameConfig = {
            width: 1200,
            height: 800,
            players: players,
            roundsToWin: 5
        };

        // Get the scene first
        this.gameScene = this.game.scene.getScene('GameScene') as GameScene;
        
        if (!this.gameScene) {
            console.error('GameScene not found');
            return;
        }

        // Set up callback before restarting scene
        this.gameScene.events.once('create', () => {
            console.log('GameScene create event fired');
            const gameManager = this.gameScene?.getGameManager();
            if (gameManager) {
                gameManager.setGameStateChangeCallback((state) => {
                    this.uiManager.updateGameState(state);
                });
            }
        });

        // Stop and start the scene with new config
        this.game.scene.stop('GameScene');
        this.game.scene.start('GameScene', { config: gameConfig });
    }

    private resetGame(): void {
        if (this.gameScene) {
            const gameManager = this.gameScene.getGameManager();
            if (gameManager) {
                gameManager.reset();
            }
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new AchtungDieKurveGame();
});
