import { io, Socket } from 'socket.io-client';
import type { 
    PlayerConfig, 
    LobbyData, 
    NetworkGameState, 
    ConnectionState, 
    PlayerInput,
    OnlinePlayer 
} from '../types';
import { ENV } from '../config/env';

export class NetworkClient {
    private socket: Socket | null = null;
    private connectionState: ConnectionState = {
        isConnected: false,
        isConnecting: false,
        error: null,
        latency: 0
    };
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private latencyCheckInterval: NodeJS.Timeout | null = null;
    private lastPingTime = 0;
    private messageQueue: any[] = [];
    private eventHandlers = new Map<string, Function[]>();

    // Server configuration
    private readonly serverUrl: string;

    constructor(serverUrl?: string) {
        // Use provided URL or environment configuration
        let finalUrl = serverUrl || ENV.WEBSOCKET_URL;
        
        // Override any template literals that might have slipped through
        if (finalUrl.includes('${') || finalUrl.includes('__VITE_')) {
            console.warn('Detected unresolved template in WebSocket URL:', finalUrl);
            // Fallback to runtime config or hardcoded production URL
            if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.WEBSOCKET_URL) {
                finalUrl = (window as any).APP_CONFIG.WEBSOCKET_URL;
                console.log('Using window.APP_CONFIG fallback:', finalUrl);
            } else if (window.location.hostname !== 'localhost') {
                // Production fallback - construct from current location
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const hostname = window.location.hostname;
                finalUrl = `${protocol}//${hostname}`;
                console.log('Using location-based fallback:', finalUrl);
            } else {
                finalUrl = 'http://localhost:3001';
                console.log('Using localhost fallback:', finalUrl);
            }
        }
        
        this.serverUrl = finalUrl;
        
        console.log('NetworkClient initialized with server URL:', this.serverUrl);
    }

    // Connection Management
    async connect(): Promise<boolean> {
        if (this.connectionState.isConnected || this.connectionState.isConnecting) {
            return Promise.resolve(this.connectionState.isConnected);
        }

        return new Promise((resolve, reject) => {
            try {
                this.connectionState.isConnecting = true;
                this.connectionState.error = null;

                this.socket = io(this.serverUrl, {
                    transports: ['websocket', 'polling'],
                    timeout: 5000,
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: this.reconnectDelay
                });

                this.setupSocketEventHandlers();

                // Connection success
                this.socket.on('connect', () => {
                    console.log('Connected to server:', this.socket?.id);
                    this.connectionState.isConnected = true;
                    this.connectionState.isConnecting = false;
                    this.connectionState.error = null;
                    this.reconnectAttempts = 0;

                    this.startLatencyCheck();
                    this.flushMessageQueue();
                    this.emit('connectionStateChanged', this.connectionState);
                    
                    resolve(true);
                });

                // Connection error
                this.socket.on('connect_error', (error) => {
                    console.error('Connection error:', error);
                    this.connectionState.isConnected = false;
                    this.connectionState.isConnecting = false;
                    this.connectionState.error = error.message;
                    this.emit('connectionStateChanged', this.connectionState);
                    
                    reject(new Error(`Failed to connect: ${error.message}`));
                });

                // Disconnect handling
                this.socket.on('disconnect', (reason) => {
                    console.log('Disconnected from server:', reason);
                    this.connectionState.isConnected = false;
                    this.connectionState.error = `Disconnected: ${reason}`;
                    
                    this.stopLatencyCheck();
                    this.emit('connectionStateChanged', this.connectionState);
                    
                    // Attempt reconnection for certain disconnect reasons
                    if (reason === 'io server disconnect') {
                        // Server initiated disconnect, don't reconnect automatically
                        this.connectionState.error = 'Server closed connection';
                    } else {
                        this.attemptReconnection();
                    }
                });

            } catch (error) {
                this.connectionState.isConnecting = false;
                this.connectionState.error = (error as Error).message;
                this.emit('connectionStateChanged', this.connectionState);
                reject(error);
            }
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.stopLatencyCheck();
        this.connectionState = {
            isConnected: false,
            isConnecting: false,
            error: null,
            latency: 0
        };
        
        this.messageQueue = [];
        this.emit('connectionStateChanged', this.connectionState);
    }

    private attemptReconnection(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.connectionState.error = 'Max reconnection attempts reached';
            this.emit('connectionStateChanged', this.connectionState);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.connectionState.isConnected) {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, delay);
    }

    private setupSocketEventHandlers(): void {
        if (!this.socket) return;

        // Lobby events
        this.socket.on('playerJoined', (player: OnlinePlayer) => {
            this.emit('playerJoined', player);
        });

        this.socket.on('playerLeft', (playerId: string) => {
            this.emit('playerLeft', playerId);
        });

        this.socket.on('lobbyUpdated', (lobbyData: LobbyData) => {
            this.emit('lobbyUpdated', lobbyData);
        });

        this.socket.on('gameCanStart', () => {
            this.emit('gameCanStart');
        });

        this.socket.on('gameStarted', (data: any) => {
            this.emit('gameStarted', data);
        });

        // Game events
        this.socket.on('gameStateUpdate', (networkGameState: NetworkGameState) => {
            // Calculate latency
            const now = Date.now();
            this.connectionState.latency = now - networkGameState.serverTime;
            
            this.emit('gameStateUpdate', networkGameState);
        });

        this.socket.on('countdownUpdate', (data: { count: number }) => {
            this.emit('countdownUpdate', data);
        });

        // Error events
        this.socket.on('error', (error: any) => {
            console.error('Socket error:', error);
            this.connectionState.error = error.message || 'Unknown socket error';
            this.emit('connectionStateChanged', this.connectionState);
        });
    }

    // Latency monitoring
    private startLatencyCheck(): void {
        this.latencyCheckInterval = setInterval(() => {
            if (this.socket && this.connectionState.isConnected) {
                this.lastPingTime = Date.now();
                this.socket.emit('ping');
            }
        }, 2000); // Check every 2 seconds

        // Listen for pong response
        this.socket?.on('pong', () => {
            const now = Date.now();
            this.connectionState.latency = now - this.lastPingTime;
        });
    }

    private stopLatencyCheck(): void {
        if (this.latencyCheckInterval) {
            clearInterval(this.latencyCheckInterval);
            this.latencyCheckInterval = null;
        }
    }

    // Message queue for handling disconnections
    private queueMessage(event: string, data: any, callback?: Function): void {
        this.messageQueue.push({ event, data, callback });
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message && this.socket) {
                this.socket.emit(message.event, message.data, message.callback);
            }
        }
    }

    // Reliable message sending
    private sendMessage(event: string, data: any, callback?: Function): void {
        if (this.socket && this.connectionState.isConnected) {
            this.socket.emit(event, data, callback);
        } else {
            this.queueMessage(event, data, callback);
            
            // Attempt to reconnect if not connected
            if (!this.connectionState.isConnecting) {
                this.connect().catch(error => {
                    console.error('Auto-reconnection failed:', error);
                });
            }
        }
    }

    // Lobby Management API
    async createLobby(playerData: Partial<PlayerConfig>): Promise<{ success: boolean; lobbyCode?: string; lobbyData?: LobbyData; error?: string }> {
        return new Promise((resolve) => {
            this.sendMessage('createLobby', playerData, (response: any) => {
                if (response.success) {
                    this.connectionState.lobbyCode = response.lobbyCode;
                }
                resolve(response);
            });
        });
    }

    async joinLobby(lobbyCode: string, playerData: Partial<PlayerConfig>): Promise<{ success: boolean; lobbyData?: LobbyData; error?: string }> {
        return new Promise((resolve) => {
            this.sendMessage('joinLobby', { lobbyCode, playerData }, (response: any) => {
                if (response.success) {
                    this.connectionState.lobbyCode = lobbyCode;
                }
                resolve(response);
            });
        });
    }

    setReady(ready: boolean): void {
        this.sendMessage('setReady', ready);
    }

    startGame(): void {
        this.sendMessage('startGame', {});
    }

    startNextRound(): void {
        this.sendMessage('startNextRound', {});
    }

    sendPlayerInput(input: PlayerInput): void {
        // Send in format expected by server
        const inputData = {
            inputs: {
                left: input.left,
                right: input.right
            },
            timestamp: Date.now()
        };
        
        this.sendMessage('playerInput', inputData);
    }

    // Event handling
    on(event: string, handler: Function): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    off(event: string, handler?: Function): void {
        if (!handler) {
            this.eventHandlers.delete(event);
        } else {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }
    }

    private emit(event: string, data?: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Getters
    getConnectionState(): ConnectionState {
        return { ...this.connectionState };
    }

    isConnected(): boolean {
        return this.connectionState.isConnected;
    }

    getLatency(): number {
        return this.connectionState.latency;
    }

    getLobbyCode(): string | undefined {
        return this.connectionState.lobbyCode;
    }
}

// Singleton instance
export const networkClient = new NetworkClient();
