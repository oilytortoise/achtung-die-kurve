import * as Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { UIManager } from './managers/UIManager';
import { OnlineGameManager } from './managers/OnlineGameManager';
import type { GameConfig, PlayerConfig } from './types';

class AchtungDieKurveGame {
    private game: Phaser.Game;
    private uiManager: UIManager;
    private gameScene?: GameScene;
    private onlineGameManager?: OnlineGameManager;

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

        this.uiManager.setStartOnlineGameCallback(() => {
            this.startOnlineGame();
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

    private startOnlineGame(): void {
        console.log('Starting online game');
        
        const gameConfig: GameConfig = {
            width: 1200,
            height: 800,
            players: [], // Players will be managed by OnlineGameManager
            roundsToWin: 5,
            gameMode: 'online'
        };

        // Get the scene first
        this.gameScene = this.game.scene.getScene('GameScene') as GameScene;
        
        if (!this.gameScene) {
            console.error('GameScene not found');
            return;
        }

        // Create online game manager
        this.onlineGameManager = new OnlineGameManager(this.gameScene, gameConfig);
        
        // Set up online game state callback
        this.onlineGameManager.setGameStateChangeCallback((state) => {
            this.uiManager.updateGameState(state);
        });

        // Set up callback before restarting scene with online manager
        this.gameScene.events.once('create', () => {
            console.log('GameScene create event fired for online game');
            const onlineGameManager = this.gameScene?.getOnlineGameManager();
            if (onlineGameManager) {
                onlineGameManager.setGameStateChangeCallback((state) => {
                    this.uiManager.updateGameState(state);
                });
                
                // Set local player ID from lobby manager
                const localPlayer = this.uiManager.getLobbyManager().getLocalPlayer();
                if (localPlayer) {
                    console.log('Setting local player ID:', localPlayer.id);
                    onlineGameManager.setLocalPlayerId(localPlayer.id);
                }
            }
        });

        // Stop and start the scene with the online manager
        this.game.scene.stop('GameScene');
        this.game.scene.start('GameScene', { config: gameConfig, onlineGameManager: this.onlineGameManager });
        
        console.log('Online game manager initialized and passed to scene');
    }

    private resetGame(): void {
        if (this.uiManager.getGameMode() === 'online') {
            // For online games, cleanup and return to lobby
            if (this.onlineGameManager) {
                this.onlineGameManager.cleanup();
                this.onlineGameManager = undefined;
            }
        } else {
            // For local games, reset as before
            if (this.gameScene) {
                const gameManager = this.gameScene.getGameManager();
                if (gameManager) {
                    gameManager.reset();
                }
            }
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new AchtungDieKurveGame();
});
