import type { TouchInputData, PlayerInput } from '../types';
import { getTouchZoneDimensions, shouldShowTouchControls } from '../utils/mobile';

export class TouchControlManager {
    private touchData: TouchInputData = {
        leftPressed: false,
        rightPressed: false,
        leftTouchId: null,
        rightTouchId: null
    };
    
    private touchZones: {
        left: { x: number; y: number; width: number; height: number };
        right: { x: number; y: number; width: number; height: number };
    } | null = null;
    
    private container: HTMLElement | null = null;
    private leftButton: HTMLElement | null = null;
    private rightButton: HTMLElement | null = null;
    private isEnabled = false;
    
    constructor(private gameContainer: HTMLElement) {
        this.setupTouchControls();
        this.setupEventListeners();
    }
    
    public enable(): void {
        if (!shouldShowTouchControls()) {
            return;
        }
        
        this.isEnabled = true;
        this.createTouchUI();
        this.updateTouchZones();
    }
    
    public disable(): void {
        this.isEnabled = false;
        this.removeTouchUI();
        this.resetTouchData();
    }
    
    public getCurrentInput(): PlayerInput {
        return {
            left: this.touchData.leftPressed,
            right: this.touchData.rightPressed,
            timestamp: Date.now()
        };
    }
    
    public isLeftPressed(): boolean {
        return this.touchData.leftPressed;
    }
    
    public isRightPressed(): boolean {
        return this.touchData.rightPressed;
    }
    
    private setupTouchControls(): void {
        // Only setup if touch is supported
        if (!shouldShowTouchControls()) return;
        
        this.updateTouchZones();
    }
    
    private updateTouchZones(): void {
        const dimensions = getTouchZoneDimensions();
        
        // Position touch zones at bottom of viewport for easy thumb access
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const yPosition = viewportHeight - dimensions.height - dimensions.padding;
        
        this.touchZones = {
            left: {
                x: dimensions.padding,
                y: yPosition,
                width: dimensions.width,
                height: dimensions.height
            },
            right: {
                x: viewportWidth - dimensions.width - dimensions.padding,
                y: yPosition,
                width: dimensions.width,
                height: dimensions.height
            }
        };
    }
    
    private setupEventListeners(): void {
        // Touch events - listen on document since controls are viewport-positioned
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
        
        // Prevent default touch behaviors that might interfere with gameplay
        this.gameContainer.addEventListener('gesturestart', this.preventDefault.bind(this), { passive: false });
        this.gameContainer.addEventListener('gesturechange', this.preventDefault.bind(this), { passive: false });
        this.gameContainer.addEventListener('gestureend', this.preventDefault.bind(this), { passive: false });
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateTouchZones();
                if (this.isEnabled) {
                    this.updateTouchUI();
                }
            }, 100);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateTouchZones();
            if (this.isEnabled) {
                this.updateTouchUI();
            }
        });
    }
    
    private preventDefault(event: Event): void {
        event.preventDefault();
    }
    
    private handleTouchStart(event: TouchEvent): void {
        if (!this.isEnabled || !this.touchZones) return;
        
        event.preventDefault();
        
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            // Use viewport coordinates since touch zones are positioned relative to viewport
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Check if touch is in left zone
            if (this.isPointInZone(x, y, this.touchZones.left) && this.touchData.leftTouchId === null) {
                this.touchData.leftTouchId = touch.identifier;
                this.touchData.leftPressed = true;
                this.updateButtonState(this.leftButton, true);
                continue;
            }
            
            // Check if touch is in right zone
            if (this.isPointInZone(x, y, this.touchZones.right) && this.touchData.rightTouchId === null) {
                this.touchData.rightTouchId = touch.identifier;
                this.touchData.rightPressed = true;
                this.updateButtonState(this.rightButton, true);
                continue;
            }
        }
    }
    
    private handleTouchMove(event: TouchEvent): void {
        if (!this.isEnabled) return;
        event.preventDefault();
    }
    
    private handleTouchEnd(event: TouchEvent): void {
        if (!this.isEnabled) return;
        
        event.preventDefault();
        this.processTouchEnd(event.changedTouches);
    }
    
    private handleTouchCancel(event: TouchEvent): void {
        if (!this.isEnabled) return;
        
        event.preventDefault();
        this.processTouchEnd(event.changedTouches);
    }
    
    private processTouchEnd(changedTouches: TouchList): void {
        for (let i = 0; i < changedTouches.length; i++) {
            const touch = changedTouches[i];
            
            // Check if this was the left touch
            if (touch.identifier === this.touchData.leftTouchId) {
                this.touchData.leftTouchId = null;
                this.touchData.leftPressed = false;
                this.updateButtonState(this.leftButton, false);
            }
            
            // Check if this was the right touch
            if (touch.identifier === this.touchData.rightTouchId) {
                this.touchData.rightTouchId = null;
                this.touchData.rightPressed = false;
                this.updateButtonState(this.rightButton, false);
            }
        }
    }
    
    private isPointInZone(x: number, y: number, zone: { x: number; y: number; width: number; height: number }): boolean {
        return x >= zone.x && 
               x <= zone.x + zone.width && 
               y >= zone.y && 
               y <= zone.y + zone.height;
    }
    
    private createTouchUI(): void {
        if (this.container) {
            return;
        }
        
        if (!this.touchZones) {
            return;
        }
        
        // Create container for touch controls - fixed to viewport
        this.container = document.createElement('div');
        this.container.className = 'touch-controls-overlay';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Append to body instead of game container for viewport positioning
        document.body.appendChild(this.container);
        
        // Create left button
        this.leftButton = document.createElement('div');
        this.leftButton.className = 'touch-control-button touch-control-left';
        this.leftButton.innerHTML = '<div class="touch-control-arrow">←</div>';
        this.leftButton.style.cssText = `
            position: absolute;
            left: ${this.touchZones.left.x}px;
            top: ${this.touchZones.left.y}px;
            width: ${this.touchZones.left.width}px;
            height: ${this.touchZones.left.height}px;
            pointer-events: auto;
            background-color: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            transition: all 0.1s ease;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
        `;
        
        // Create right button
        this.rightButton = document.createElement('div');
        this.rightButton.className = 'touch-control-button touch-control-right';
        this.rightButton.innerHTML = '<div class="touch-control-arrow">→</div>';
        this.rightButton.style.cssText = `
            position: absolute;
            left: ${this.touchZones.right.x}px;
            top: ${this.touchZones.right.y}px;
            width: ${this.touchZones.right.width}px;
            height: ${this.touchZones.right.height}px;
            pointer-events: auto;
            background-color: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            transition: all 0.1s ease;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
        `;
        
        this.container.appendChild(this.leftButton);
        this.container.appendChild(this.rightButton);
    }
    
    private updateTouchUI(): void {
        if (!this.container || !this.leftButton || !this.rightButton || !this.touchZones) return;
        
        // Update button positions
        this.leftButton.style.left = `${this.touchZones.left.x}px`;
        this.leftButton.style.top = `${this.touchZones.left.y}px`;
        this.leftButton.style.width = `${this.touchZones.left.width}px`;
        this.leftButton.style.height = `${this.touchZones.left.height}px`;
        
        this.rightButton.style.left = `${this.touchZones.right.x}px`;
        this.rightButton.style.top = `${this.touchZones.right.y}px`;
        this.rightButton.style.width = `${this.touchZones.right.width}px`;
        this.rightButton.style.height = `${this.touchZones.right.height}px`;
    }
    
    private updateButtonState(button: HTMLElement | null, pressed: boolean): void {
        if (!button) return;
        
        if (pressed) {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            button.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            button.style.transform = 'scale(0.95)';
        } else {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            button.style.transform = 'scale(1)';
        }
    }
    
    private removeTouchUI(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        this.leftButton = null;
        this.rightButton = null;
    }
    
    private resetTouchData(): void {
        this.touchData = {
            leftPressed: false,
            rightPressed: false,
            leftTouchId: null,
            rightTouchId: null
        };
    }
    
    public destroy(): void {
        this.disable();
        // Remove event listeners if needed
        window.removeEventListener('orientationchange', this.updateTouchZones);
        window.removeEventListener('resize', this.updateTouchZones);
    }
}
