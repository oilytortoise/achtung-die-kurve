import type { GameConfig, GameState } from '../types';
import { Player } from '../entities/Player';

export class GameManager {
    private config: GameConfig;
    private state: GameState;
    private players: Player[] = [];
    private scene: Phaser.Scene;
    private onGameStateChange?: (state: GameState) => void;

    constructor(scene: Phaser.Scene, config: GameConfig) {
        this.scene = scene;
        this.config = config;
        this.state = {
            currentRound: 1,
            scores: config.players.map(p => ({ playerId: p.id, rounds: 0 })),
            gamePhase: 'setup'
        };
    }

    public setGameStateChangeCallback(callback: (state: GameState) => void): void {
        this.onGameStateChange = callback;
    }

    public startGame(): void {
        console.log('GameManager.startGame called');
        this.createPlayers();
        this.startRound();
    }

    private createPlayers(): void {
        console.log('Creating players:', this.config.players);
        // Clear existing players
        this.players.forEach(player => player.destroy());
        this.players = [];

        // Create new players
        this.config.players.forEach(playerConfig => {
            const player = new Player(this.scene, playerConfig);
            this.players.push(player);
        });
        console.log(`Created ${this.players.length} players`);
    }

    public startRound(): void {
        console.log('Starting round:', this.state.currentRound);
        this.state.gamePhase = 'playing';
        this.notifyStateChange();

        console.log(`Spawning ${this.players.length} players`);
        
        // Spawn players at positions around the center
        this.players.forEach((player, index) => {
            const spawnAngle = (index * (Math.PI * 2)) / this.players.length;
            const spawnDistance = 250; // Increased for larger area
            const centerX = this.config.width / 2;
            const centerY = this.config.height / 2;
            
            const spawnX = centerX + Math.cos(spawnAngle) * spawnDistance;
            const spawnY = centerY + Math.sin(spawnAngle) * spawnDistance;
            
            // Face toward center with some random variation
            const faceAngle = spawnAngle + Math.PI + (Math.random() - 0.5) * 0.5;
            
            console.log(`Spawning player ${index + 1} at (${spawnX}, ${spawnY})`);
            player.spawn(spawnX, spawnY, faceAngle);
        });
        
        console.log('All players spawned, game should be running');
    }

    public update(): void {
        if (this.state.gamePhase !== 'playing') return;

        // Update all players
        this.players.forEach(player => player.update());

        // Check collisions
        this.checkCollisions();

        // Check round end condition
        const alivePlayers = this.players.filter(p => p.alive);
        if (alivePlayers.length <= 1) {
            this.endRound(alivePlayers[0] || null);
        }
    }

    private checkCollisions(): void {
        // Simple collision detection - check each player against all trails
        this.players.forEach(player => {
            if (!player.alive) return;

            // Check collision with all players' trails (including own)
            for (const otherPlayer of this.players) {
                if (this.checkPlayerCollisionWithTrail(player, otherPlayer)) {
                    player.die();
                    break;
                }
            }
        });
    }

    private checkPlayerCollisionWithTrail(player: Player, trailOwner: Player): boolean {
        // Check collision with trail points
        const collisionRadius = 6; // Collision detection radius
        
        // Don't check collision with own trail immediately (allow some distance)
        if (player.id === trailOwner.id) {
            // Only check self-collision if we have enough trail points
            if (trailOwner.trailPoints.length < 30) {
                return false;
            }
            
            // Check against trail points that are far enough away
            for (let i = 0; i < trailOwner.trailPoints.length - 20; i++) {
                const trailPoint = trailOwner.trailPoints[i];
                const distance = Phaser.Math.Distance.Between(
                    player.x, player.y,
                    trailPoint.x, trailPoint.y
                );
                
                if (distance < collisionRadius) {
                    console.log(`${player.name} collided with own trail`);
                    return true;
                }
            }
        } else {
            // Check collision with other player's entire trail
            for (const trailPoint of trailOwner.trailPoints) {
                const distance = Phaser.Math.Distance.Between(
                    player.x, player.y,
                    trailPoint.x, trailPoint.y
                );
                
                if (distance < collisionRadius) {
                    console.log(`${player.name} collided with ${trailOwner.name}'s trail`);
                    return true;
                }
            }
        }
        
        return false;
    }

    private endRound(winner: Player | null): void {
        this.state.gamePhase = 'roundOver';
        
        // Log round results
        if (winner) {
            console.log(`Round ${this.state.currentRound} won by ${winner.name}!`);
            const score = this.state.scores.find(s => s.playerId === winner.id);
            if (score) {
                score.rounds++;
            }
        } else {
            console.log(`Round ${this.state.currentRound} ended in a draw (no survivors)`);
        }

        this.notifyStateChange();

        // Check if game is over
        const maxScore = Math.max(...this.state.scores.map(s => s.rounds));
        if (maxScore >= this.config.roundsToWin) {
            this.state.gamePhase = 'gameOver';
            console.log('Game Over!');
            this.notifyStateChange();
        } else {
            this.state.currentRound++;
            // Start next round after delay
            console.log(`Starting round ${this.state.currentRound} in 2 seconds...`);
            setTimeout(() => {
                this.startRound();
            }, 2000);
        }
    }

    public getGameState(): GameState {
        return { ...this.state };
    }

    public getPlayers(): Player[] {
        return [...this.players];
    }

    private notifyStateChange(): void {
        if (this.onGameStateChange) {
            this.onGameStateChange(this.getGameState());
        }
    }

    public reset(): void {
        this.players.forEach(player => player.destroy());
        this.players = [];
        this.state = {
            currentRound: 1,
            scores: this.config.players.map(p => ({ playerId: p.id, rounds: 0 })),
            gamePhase: 'setup'
        };
        this.notifyStateChange();
    }
}
