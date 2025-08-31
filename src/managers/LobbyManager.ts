import type { PlayerConfig, LobbyData, OnlinePlayer, ConnectionState } from '../types';
import { networkClient } from '../network/NetworkClient';
import { DEFAULT_PLAYER_COLORS } from '../types';

export class LobbyManager {
    private currentLobby: LobbyData | null = null;
    private localPlayer: OnlinePlayer | null = null;
    private onLobbyStateChange?: (lobby: LobbyData | null) => void;
    private onConnectionStateChange?: (state: ConnectionState) => void;
    private onGameStarted?: () => void;

    constructor() {
        this.setupNetworkListeners();
    }

    private setupNetworkListeners(): void {
        networkClient.on('connectionStateChanged', (state: ConnectionState) => {
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(state);
            }
        });

        networkClient.on('lobbyUpdated', (lobbyData: LobbyData) => {
            this.currentLobby = lobbyData;
            if (this.onLobbyStateChange) {
                this.onLobbyStateChange(lobbyData);
            }
        });

        networkClient.on('playerJoined', (player: OnlinePlayer) => {
            console.log('Player joined:', player.name);
        });

        networkClient.on('playerLeft', (playerId: string) => {
            console.log('Player left:', playerId);
        });

        networkClient.on('gameCanStart', () => {
            console.log('Game can start - all players ready');
        });

        networkClient.on('gameStarted', () => {
            if (this.onGameStarted) {
                this.onGameStarted();
            }
        });
    }

    public setLobbyStateChangeCallback(callback: (lobby: LobbyData | null) => void): void {
        this.onLobbyStateChange = callback;
    }

    public setConnectionStateChangeCallback(callback: (state: ConnectionState) => void): void {
        this.onConnectionStateChange = callback;
    }

    public setGameStartedCallback(callback: () => void): void {
        this.onGameStarted = callback;
    }

    public async connect(): Promise<boolean> {
        try {
            return await networkClient.connect();
        } catch (error) {
            console.error('Failed to connect to server:', error);
            return false;
        }
    }

    public disconnect(): void {
        networkClient.disconnect();
        this.currentLobby = null;
        this.localPlayer = null;
        if (this.onLobbyStateChange) {
            this.onLobbyStateChange(null);
        }
    }

    public async createLobby(playerName: string): Promise<{ success: boolean; lobbyCode?: string; error?: string }> {
        try {
            const playerData: Partial<PlayerConfig> = {
                name: playerName,
                color: DEFAULT_PLAYER_COLORS[0]
            };

            const result = await networkClient.createLobby(playerData);
            
            if (result.success && result.lobbyData) {
                this.currentLobby = result.lobbyData;
                this.localPlayer = result.lobbyData.players.find(p => p.name === playerName) || null;
                
                if (this.onLobbyStateChange) {
                    this.onLobbyStateChange(result.lobbyData);
                }
                
                return {
                    success: true,
                    lobbyCode: result.lobbyCode
                };
            }
            
            return {
                success: false,
                error: result.error || 'Unknown error creating lobby'
            };
        } catch (error) {
            return {
                success: false,
                error: `Connection error: ${(error as Error).message}`
            };
        }
    }

    public async joinLobby(lobbyCode: string, playerName: string): Promise<{ success: boolean; error?: string }> {
        try {
            const usedColors = this.currentLobby?.players.map(p => p.color) || [];
            const availableColor = DEFAULT_PLAYER_COLORS.find(color => !usedColors.includes(color)) || DEFAULT_PLAYER_COLORS[0];
            
            const playerData: Partial<PlayerConfig> = {
                name: playerName,
                color: availableColor
            };

            const result = await networkClient.joinLobby(lobbyCode, playerData);
            
            if (result.success && result.lobbyData) {
                this.currentLobby = result.lobbyData;
                this.localPlayer = result.lobbyData.players.find(p => p.name === playerName) || null;
                
                if (this.onLobbyStateChange) {
                    this.onLobbyStateChange(result.lobbyData);
                }
                
                return { success: true };
            }
            
            return {
                success: false,
                error: result.error || 'Unknown error joining lobby'
            };
        } catch (error) {
            return {
                success: false,
                error: `Connection error: ${(error as Error).message}`
            };
        }
    }

    public setReady(ready: boolean): void {
        if (this.localPlayer) {
            networkClient.setReady(ready);
        }
    }

    public startGame(): void {
        if (this.localPlayer?.isHost) {
            networkClient.startGame();
        }
    }

    public leaveLobby(): void {
        this.disconnect();
    }

    public getCurrentLobby(): LobbyData | null {
        return this.currentLobby;
    }

    public getLocalPlayer(): OnlinePlayer | null {
        return this.localPlayer;
    }

    public isHost(): boolean {
        return this.localPlayer?.isHost || false;
    }

    public canStartGame(): boolean {
        if (!this.currentLobby || !this.isHost()) return false;
        
        return this.currentLobby.players.length >= 2 && 
               this.currentLobby.players.every(p => p.isReady);
    }

    public getConnectionState(): ConnectionState {
        return networkClient.getConnectionState();
    }

    public getLobbyCode(): string | undefined {
        return this.currentLobby?.id;
    }

    public generateShareableLink(baseUrl: string = window.location.origin): string {
        const lobbyCode = this.getLobbyCode();
        if (!lobbyCode) return baseUrl;
        
        return `${baseUrl}?lobby=${lobbyCode}`;
    }

    public async copyLobbyCodeToClipboard(): Promise<boolean> {
        const lobbyCode = this.getLobbyCode();
        if (!lobbyCode) return false;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(lobbyCode);
                return true;
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                return false;
            }
        }
        
        return false;
    }

    public async copyLobbyLinkToClipboard(baseUrl?: string): Promise<boolean> {
        const link = this.generateShareableLink(baseUrl);
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(link);
                return true;
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                return false;
            }
        }
        
        return false;
    }

    public static parseLobbyCodeFromUrl(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('lobby');
    }

    public cleanup(): void {
        networkClient.off('connectionStateChanged');
        networkClient.off('lobbyUpdated');
        networkClient.off('playerJoined');
        networkClient.off('playerLeft');
        networkClient.off('gameCanStart');
        networkClient.off('gameStarted');
        
        this.currentLobby = null;
        this.localPlayer = null;
    }
}
