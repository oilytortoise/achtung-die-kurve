import * as Phaser from 'phaser';
import type { OnlinePlayer as OnlinePlayerData } from '../types';

export class OnlinePlayer {
    public id: string;
    public name: string;
    public color: string;
    public alive: boolean = true;
    
    private trail: Phaser.GameObjects.Graphics;
    private playerDot: Phaser.GameObjects.Graphics;
    private colorNumber: number;
    private lastTrailLength: number = 0;

    constructor(scene: Phaser.Scene, playerData: OnlinePlayerData) {
        this.id = playerData.id;
        this.name = playerData.name;
        this.color = playerData.color;
        this.alive = playerData.alive || true;

        // Convert color to number for Phaser
        this.colorNumber = Phaser.Display.Color.HexStringToColor(this.color).color;

        // Create graphics objects for trail and player position
        this.trail = scene.add.graphics();
        this.playerDot = scene.add.graphics();

        console.log(`Created online player ${this.name} with color ${this.color}`);
    }

    public updateFromServer(playerData: OnlinePlayerData): void {
        this.alive = playerData.alive || false;

        // Update trail if there are new trail points
        if (playerData.trailPoints && playerData.trailPoints.length > 0) {
            const newPoints = playerData.trailPoints;
            
            // Always redraw the trail to ensure it's current
            this.redrawTrail(newPoints);
            this.lastTrailLength = newPoints.length;
        }

        // Update player position dot
        if (playerData.position && this.alive) {
            this.updatePlayerPosition(playerData.position.x, playerData.position.y);
        } else if (!this.alive) {
            this.playerDot.clear();
        }
    }

    private redrawTrail(trailPoints: { x: number; y: number }[]): void {
        // Clear previous trail
        this.trail.clear();

        if (trailPoints.length < 2) return;

        // Set line style
        this.trail.lineStyle(4, this.colorNumber);

        // Draw the complete trail from server data
        let isDrawing = true;
        let lastPoint = trailPoints[0];

        for (let i = 1; i < trailPoints.length; i++) {
            const currentPoint = trailPoints[i];
            
            // Calculate distance between points to detect gaps
            const distance = Math.sqrt(
                Math.pow(currentPoint.x - lastPoint.x, 2) + 
                Math.pow(currentPoint.y - lastPoint.y, 2)
            );

            // If distance is too large, it's likely a gap in the trail
            if (distance > 15) { // Threshold for detecting gaps
                isDrawing = false;
            } else if (distance > 0.1) { // Very small movements are ignored
                if (!isDrawing) {
                    // Start new line segment after gap
                    isDrawing = true;
                }
                
                if (isDrawing) {
                    this.trail.lineBetween(lastPoint.x, lastPoint.y, currentPoint.x, currentPoint.y);
                }
            }

            lastPoint = currentPoint;
        }

        // Add small circles at key points for better visibility
        this.trail.fillStyle(this.colorNumber);
        for (let i = 0; i < trailPoints.length; i += 5) { // Every 5th point
            const point = trailPoints[i];
            this.trail.fillCircle(point.x, point.y, 1);
        }
    }

    private updatePlayerPosition(x: number, y: number): void {
        // Clear previous position
        this.playerDot.clear();

        if (this.alive) {
            // Draw current player position as a small circle
            this.playerDot.fillStyle(this.colorNumber);
            this.playerDot.fillCircle(x, y, 3);
            
            // Add a slight glow effect
            this.playerDot.lineStyle(2, this.colorNumber, 0.5);
            this.playerDot.strokeCircle(x, y, 6);
        }
    }

    public destroy(): void {
        this.trail.destroy();
        this.playerDot.destroy();
    }

    public setVisible(visible: boolean): void {
        this.trail.setVisible(visible);
        this.playerDot.setVisible(visible);
    }
}
