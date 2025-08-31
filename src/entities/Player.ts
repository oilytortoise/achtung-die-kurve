import * as Phaser from 'phaser';
import type { PlayerConfig } from '../types';

export class Player {
    public id: string;
    public name: string;
    public color: string;
    public leftKey: string;
    public rightKey: string;
    
    public x: number = 0;
    public y: number = 0;
    public angle: number = 0;
    public speed: number = 3;
    public turnSpeed: number = 0.06;
    public alive: boolean = true;
    public trail: Phaser.GameObjects.Graphics;
    public trailPoints: { x: number, y: number }[] = [];
    
    private scene: Phaser.Scene;
    private leftPressed: boolean = false;
    private rightPressed: boolean = false;
    private gapTimer: number = 0;
    private baseGapInterval: number = 80; // Base interval for gaps
    private gapInterval: number = 80; // Current gap interval (randomized)
    private inGap: boolean = false;
    private baseGapDuration: number = 15; // Base duration for gaps
    private gapDuration: number = 15; // Current gap duration (randomized)
    private colorNumber: number;
    private gapVariancePercent: number = 0.3; // 30% variance in gap timing

    constructor(scene: Phaser.Scene, config: PlayerConfig) {
        this.scene = scene;
        this.id = config.id;
        this.name = config.name;
        this.color = config.color;
        this.leftKey = config.leftKey;
        this.rightKey = config.rightKey;
        
        console.log(`Creating player ${this.name} with color ${this.color}`);
        
        // Convert color to number
        this.colorNumber = Phaser.Display.Color.HexStringToColor(this.color).color;
        
        // Create graphics object for trail
        this.trail = scene.add.graphics();
        
        console.log(`Player ${this.name} trail created with color:`, this.colorNumber);
        
        this.setupInputHandlers();
        
        // Initialize with randomized gap timings
        this.randomizeGapTimings();
    }

    private setupInputHandlers(): void {
        // Set up keyboard input
        this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (event.code === this.leftKey) {
                this.leftPressed = true;
            }
            if (event.code === this.rightKey) {
                this.rightPressed = true;
            }
        });

        this.scene.input.keyboard?.on('keyup', (event: KeyboardEvent) => {
            if (event.code === this.leftKey) {
                this.leftPressed = false;
            }
            if (event.code === this.rightKey) {
                this.rightPressed = false;
            }
        });
    }

    public spawn(x: number, y: number, angle: number): void {
        console.log(`Spawning player ${this.name} at (${x}, ${y}) with angle ${angle}`);
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.alive = true;
        this.gapTimer = 0;
        this.inGap = false;
        
        // Clear trail points and graphics
        this.trailPoints = [];
        this.trail.clear();
        
        // Draw starting position as a visible circle
        this.trail.fillStyle(this.colorNumber);
        this.trail.fillCircle(this.x, this.y, 4);
        
        // Add starting point to trail
        this.trailPoints.push({ x: this.x, y: this.y });
        
        console.log(`Player ${this.name} spawned and visible at (${x}, ${y})`);
    }

    public update(): void {
        if (!this.alive) return;

        // Handle turning
        if (this.leftPressed) {
            this.angle -= this.turnSpeed;
        }
        if (this.rightPressed) {
            this.angle += this.turnSpeed;
        }

        // Store previous position
        const prevX = this.x;
        const prevY = this.y;
        
        // Move forward
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Handle gaps in trail
        this.gapTimer++;
        if (this.gapTimer >= this.gapInterval && !this.inGap) {
            this.inGap = true;
            this.gapTimer = 0;
            console.log(`${this.name} entering gap`);
        }
        
        if (this.inGap) {
            this.gapTimer++;
            if (this.gapTimer >= this.gapDuration) {
                this.inGap = false;
                this.gapTimer = 0;
                // Randomize gap timings for next cycle
                this.randomizeGapTimings();
                console.log(`${this.name} exiting gap - next gap in ${this.gapInterval} frames`);
            }
        }

        // Draw trail segment and track points (unless in gap)
        if (!this.inGap) {
            // Set line style and draw line from previous position to current
            this.trail.lineStyle(4, this.colorNumber);
            this.trail.lineBetween(prevX, prevY, this.x, this.y);
            
            // Add points along the trail for collision detection
            // Sample points every few pixels for accurate collision detection
            const distance = Phaser.Math.Distance.Between(prevX, prevY, this.x, this.y);
            const steps = Math.ceil(distance / 2); // Sample every 2 pixels
            
            for (let i = 0; i <= steps; i++) {
                const t = steps > 0 ? i / steps : 0;
                const trailX = prevX + (this.x - prevX) * t;
                const trailY = prevY + (this.y - prevY) * t;
                this.trailPoints.push({ x: trailX, y: trailY });
            }
            
            // Draw current player position
            this.trail.fillStyle(this.colorNumber);
            this.trail.fillCircle(this.x, this.y, 2);
        }

        // Check boundaries
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;
        
        if (this.x < 0 || this.x > gameWidth || this.y < 0 || this.y > gameHeight) {
            console.log(`${this.name} hit boundary at (${this.x}, ${this.y})`);
            this.die();
        }
    }

    public checkCollision(_x: number, _y: number): boolean {
        // Check collision with this player's trail
        // This is a simplified collision detection - in a real implementation,
        // you'd want more sophisticated pixel-perfect collision detection
        
        // For now, we'll use a simple distance-based collision
        // In a more advanced implementation, you'd check the actual trail pixels
        return false; // Placeholder - implement proper collision detection
    }

    public die(): void {
        this.alive = false;
        // Add death effect or animation here if desired
    }

    /**
     * Randomizes the gap interval and duration for this player
     * Creates unique timing patterns for each player
     */
    private randomizeGapTimings(): void {
        // Randomize gap interval (time between gaps)
        const intervalVariance = this.baseGapInterval * this.gapVariancePercent;
        const intervalMin = this.baseGapInterval - intervalVariance;
        const intervalMax = this.baseGapInterval + intervalVariance;
        this.gapInterval = Math.round(intervalMin + Math.random() * (intervalMax - intervalMin));
        
        // Randomize gap duration (how long gaps last) - smaller variance to keep gaps visible
        const durationVariance = this.baseGapDuration * (this.gapVariancePercent * 0.5); // Half the variance of interval
        const durationMin = this.baseGapDuration - durationVariance;
        const durationMax = this.baseGapDuration + durationVariance;
        this.gapDuration = Math.round(durationMin + Math.random() * (durationMax - durationMin));
        
        // Ensure minimum values
        this.gapInterval = Math.max(this.gapInterval, Math.round(this.baseGapInterval * 0.5));
        this.gapDuration = Math.max(this.gapDuration, Math.round(this.baseGapDuration * 0.5));
        
        console.log(`${this.name} gap timings: interval=${this.gapInterval}, duration=${this.gapDuration}`);
    }

    public destroy(): void {
        this.trail.destroy();
    }
}
