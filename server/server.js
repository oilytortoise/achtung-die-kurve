import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve static files function
function serveStaticFile(filePath, res) {
    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        let contentType = 'text/html';
        
        switch (ext) {
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
            case '.ico':
                contentType = 'image/x-icon';
                break;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return true;
    } catch (error) {
        return false;
    }
}

// Create HTTP server with basic request handling
const httpServer = createServer((req, res) => {
    // Add CORS headers for all requests
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ["http://localhost:3000", "http://localhost:5173"];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check endpoint
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            server: 'achtung-websocket-server',
            timestamp: new Date().toISOString(),
            lobbies: lobbies.size,
            connectedPlayers: playerSockets.size
        }));
        return;
    }
    
    // Socket.IO routes are handled automatically by Socket.IO server
    if (req.url.startsWith('/socket.io/')) {
        return; // Let Socket.IO handle this
    }
    
    // Serve static files from dist directory
    const distPath = join(__dirname, '..', 'dist');
    let filePath;
    
    if (req.url === '/') {
        filePath = join(distPath, 'index.html');
    } else {
        filePath = join(distPath, req.url.replace(/\?.*$/, '')); // Remove query params
    }
    
    // Try to serve the requested file
    if (existsSync(filePath) && serveStaticFile(filePath, res)) {
        return;
    }
    
    // If file not found and not an API route, serve index.html for SPA routing
    if (!req.url.startsWith('/api/')) {
        const indexPath = join(distPath, 'index.html');
        if (existsSync(indexPath) && serveStaticFile(indexPath, res)) {
            return;
        }
    }
    
    // Default 404 response
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

// Game state management
const lobbies = new Map();
const playerSockets = new Map();

// Lobby configuration
const MAX_PLAYERS_PER_LOBBY = 8;
const LOBBY_CODE_LENGTH = 6;
const GAME_TICK_RATE = 60; // 60 FPS server tick rate

// Player key bindings (matches client-side DEFAULT_KEY_BINDINGS)
const DEFAULT_KEY_BINDINGS = [
    { left: 'KeyA', right: 'KeyS' },
    { left: 'ArrowLeft', right: 'ArrowRight' },
    { left: 'KeyQ', right: 'KeyW' },
    { left: 'KeyO', right: 'KeyP' },
    { left: 'KeyF', right: 'KeyG' },
    { left: 'KeyH', right: 'KeyJ' },
    { left: 'KeyN', right: 'KeyM' },
    { left: 'KeyZ', right: 'KeyX' }
];

// Player colors (matches client-side DEFAULT_PLAYER_COLORS)
const DEFAULT_PLAYER_COLORS = [
    '#ff0000', // Red
    '#0000ff', // Blue
    '#00ff00', // Green
    '#ffff00', // Yellow
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ff8000', // Orange
    '#8000ff'  // Purple
];

class Lobby {
    constructor(hostSocketId) {
        this.id = generateLobbyCode();
        this.hostSocketId = hostSocketId;
        this.players = new Map();
        this.gameState = {
            phase: 'lobby', // 'lobby', 'playing', 'roundOver', 'gameOver'
            currentRound: 1,
            roundsToWin: 5,
            scores: new Map(),
            gameConfig: {
                width: 1200,
                height: 800
            }
        };
        this.gameLoop = null;
        this.gameStartTime = 0;
        this.tickCount = 0;
        this.countdownTimer = null;
        this.countdownValue = 0;
    }

    addPlayer(socketId, playerData) {
        if (this.players.size >= MAX_PLAYERS_PER_LOBBY) {
            return { success: false, error: 'Lobby is full' };
        }

        // Assign color based on player index (order joined)
        const playerIndex = this.players.size;
        const assignedColor = DEFAULT_PLAYER_COLORS[playerIndex] || DEFAULT_PLAYER_COLORS[0];

        // Use same controls for all online players (left and right arrow keys)
        const onlineKeyBinding = { left: 'ArrowLeft', right: 'ArrowRight' };

        const player = {
            id: playerData.id || nanoid(8),
            socketId,
            name: playerData.name,
            color: assignedColor, // Use server-assigned color to ensure uniqueness
            isReady: false,
            isHost: socketId === this.hostSocketId,
            leftKey: onlineKeyBinding.left,
            rightKey: onlineKeyBinding.right,
            position: { x: 0, y: 0 },
            rotation: 0,
            alive: true,
            trailPoints: [],
            inputs: {
                left: false,
                right: false
            },
            lastInputTime: 0,
            // Gap handling properties
            gapTimer: 0,
            baseGapInterval: 80, // Base frames between gaps
            gapInterval: 80, // Current gap interval (will be randomized)
            inGap: false,
            baseGapDuration: 15, // Base frames during gap
            gapDuration: 15, // Current gap duration (will be randomized)
            gapVariancePercent: 0.3 // 30% variance in gap timing
        };

        // Initialize with randomized gap timings
        this.randomizePlayerGapTimings(player);
        
        this.players.set(socketId, player);
        this.gameState.scores.set(player.id, { playerId: player.id, rounds: 0 });

        return { success: true, player };
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
            this.gameState.scores.delete(player.id);
            
            // If host leaves, transfer host to another player
            if (socketId === this.hostSocketId && this.players.size > 0) {
                const newHost = this.players.values().next().value;
                this.hostSocketId = newHost.socketId;
                newHost.isHost = true;
            }
        }
        return this.players.size === 0; // Return true if lobby is empty
    }

    setPlayerReady(socketId, ready) {
        const player = this.players.get(socketId);
        if (player) {
            player.isReady = ready;
        }
    }

    canStartGame() {
        return this.players.size >= 2 && 
               Array.from(this.players.values()).every(p => p.isReady) &&
               this.gameState.phase === 'lobby';
    }

    startGame() {
        if (!this.canStartGame()) return false;

        this.gameState.phase = 'playing';
        this.gameState.currentRound = 1;
        this.gameStartTime = Date.now();
        this.tickCount = 0;

        // Initialize player positions
        this.spawnPlayers();

        // Start game loop
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, 1000 / GAME_TICK_RATE);

        return true;
    }

    spawnPlayers() {
        const playerArray = Array.from(this.players.values());
        const centerX = this.gameState.gameConfig.width / 2;
        const centerY = this.gameState.gameConfig.height / 2;
        const spawnDistance = 250;

        playerArray.forEach((player, index) => {
            const spawnAngle = (index * (Math.PI * 2)) / playerArray.length;
            const spawnX = centerX + Math.cos(spawnAngle) * spawnDistance;
            const spawnY = centerY + Math.sin(spawnAngle) * spawnDistance;
            const faceAngle = spawnAngle + Math.PI + (Math.random() - 0.5) * 0.5;

            player.position = { x: spawnX, y: spawnY };
            player.rotation = faceAngle;
            player.alive = true;
            player.trailPoints = [];
            // Reset gap properties
            player.gapTimer = 0;
            player.inGap = false;
        });
    }

    updateGame() {
        if (this.gameState.phase !== 'playing') return;

        this.tickCount++;
        
        // Update player positions based on inputs
        for (const player of this.players.values()) {
            if (!player.alive) continue;

            // Apply rotation based on input
            const rotationSpeed = 3; // degrees per frame
            if (player.inputs.left) {
                player.rotation -= rotationSpeed * (Math.PI / 180);
            }
            if (player.inputs.right) {
                player.rotation += rotationSpeed * (Math.PI / 180);
            }

            // Move player forward
            const speed = 2; // pixels per frame
            const newX = player.position.x + Math.cos(player.rotation) * speed;
            const newY = player.position.y + Math.sin(player.rotation) * speed;

            // Boundary collision
            if (newX < 0 || newX > this.gameState.gameConfig.width || 
                newY < 0 || newY > this.gameState.gameConfig.height) {
                player.alive = false;
                continue;
            }

            player.position.x = newX;
            player.position.y = newY;

            // Handle gaps in trail
            player.gapTimer++;
            if (player.gapTimer >= player.gapInterval && !player.inGap) {
                player.inGap = true;
                player.gapTimer = 0;
            }
            
            if (player.inGap) {
                player.gapTimer++;
                if (player.gapTimer >= player.gapDuration) {
                    player.inGap = false;
                    player.gapTimer = 0;
                    // Randomize gap timings for next cycle
                    this.randomizePlayerGapTimings(player);
                }
            }

            // Add trail point every 2 pixels (only when not in gap)
            if (this.tickCount % 2 === 0 && !player.inGap) {
                player.trailPoints.push({ x: newX, y: newY });
            }
        }

        // Check collisions
        this.checkCollisions();

        // Check round end condition
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        if (alivePlayers.length <= 1) {
            this.endRound(alivePlayers[0] || null);
        }

        // Send game state to all clients
        this.broadcastGameState();
    }

    checkCollisions() {
        const collisionRadius = 6;
        
        for (const player of this.players.values()) {
            if (!player.alive) continue;

            // Check collision with all players' trails
            for (const otherPlayer of this.players.values()) {
                // For self-collision, skip recent trail points
                if (player.id === otherPlayer.id) {
                    // Only check self-collision if we have enough trail points
                    if (otherPlayer.trailPoints.length < 30) {
                        continue; // Skip self-collision check entirely
                    }
                    
                    // Check against trail points that are far enough away (exclude recent 20 points)
                    for (let i = 0; i < otherPlayer.trailPoints.length - 20; i++) {
                        const trailPoint = otherPlayer.trailPoints[i];
                        const distance = Math.sqrt(
                            Math.pow(player.position.x - trailPoint.x, 2) + 
                            Math.pow(player.position.y - trailPoint.y, 2)
                        );

                        if (distance < collisionRadius) {
                            player.alive = false;
                            break;
                        }
                    }
                } else {
                    // Check collision with other player's entire trail
                    for (const trailPoint of otherPlayer.trailPoints) {
                        const distance = Math.sqrt(
                            Math.pow(player.position.x - trailPoint.x, 2) + 
                            Math.pow(player.position.y - trailPoint.y, 2)
                        );

                        if (distance < collisionRadius) {
                            player.alive = false;
                            break;
                        }
                    }
                }

                if (!player.alive) break;
            }
        }
    }

    endRound(winner) {
        this.gameState.phase = 'roundOver';
        
        if (winner) {
            const score = this.gameState.scores.get(winner.id);
            if (score) {
                score.rounds++;
            }
        }

        // Check if game is over
        const maxScore = Math.max(...Array.from(this.gameState.scores.values()).map(s => s.rounds));
        if (maxScore >= this.gameState.roundsToWin) {
            this.gameState.phase = 'gameOver';
            this.stopGameLoop();
        } else {
            // Increment round but don't auto-start - wait for host to start next round
            this.gameState.currentRound++;
            this.gameState.phase = 'waitingForNextRound';
        }

        this.broadcastGameState();
    }

    canStartNextRound() {
        return this.gameState.phase === 'waitingForNextRound';
    }

    startNextRound() {
        if (!this.canStartNextRound()) return false;

        // Start countdown
        this.gameState.phase = 'countdown';
        this.countdownValue = 3;
        this.broadcastGameState();

        // Countdown timer
        this.countdownTimer = setInterval(() => {
            this.countdownValue--;
            
            if (this.countdownValue > 0) {
                // Continue countdown
                this.broadcastCountdown(this.countdownValue);
            } else {
                // Countdown finished, start round
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.gameState.phase = 'playing';
                this.spawnPlayers();
                this.broadcastGameState();
                
                // Restart game loop if not running
                if (!this.gameLoop) {
                    this.gameLoop = setInterval(() => {
                        this.updateGame();
                    }, 1000 / GAME_TICK_RATE);
                }
            }
        }, 1000); // 1 second intervals

        return true;
    }

    canReturnToLobby() {
        return this.gameState.phase === 'gameOver';
    }

    returnToLobby() {
        if (!this.canReturnToLobby()) return false;

        console.log(`[Server] Returning lobby ${this.id} to lobby state`);
        
        // Stop any running game loops
        this.stopGameLoop();
        
        // Reset game state to lobby
        this.gameState.phase = 'lobby';
        this.gameState.currentRound = 1;
        this.tickCount = 0;
        
        console.log(`[Server] Game state reset - phase: ${this.gameState.phase}`);
        
        // Reset scores to 0 for all players
        for (const score of this.gameState.scores.values()) {
            score.rounds = 0;
        }
        
        // Reset all players to not ready and clear their game state
        for (const player of this.players.values()) {
            player.isReady = false;
            player.alive = true;
            player.position = { x: 0, y: 0 };
            player.rotation = 0;
            player.trailPoints = [];
            player.inputs = { left: false, right: false };
            player.gapTimer = 0;
            player.inGap = false;
            // Randomize gap timings for fresh start
            this.randomizePlayerGapTimings(player);
        }
        
        console.log(`[Server] Broadcasting game state update to lobby ${this.id}`);
        console.log(`[Server] Game state being broadcast:`, {
            phase: this.gameState.phase,
            currentRound: this.gameState.currentRound,
            scores: Array.from(this.gameState.scores.values())
        });
        
        // Broadcast the updated lobby state
        this.broadcastGameState();
        io.to(this.id).emit('lobbyUpdated', this.getPublicData());
        
        console.log(`[Server] Broadcasts sent for lobby ${this.id}`);
        
        return true;
    }

    broadcastCountdown(count) {
        io.to(this.id).emit('countdownUpdate', { count });
    }

    stopGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    broadcastGameState() {
        const stateData = {
            gameState: {
                phase: this.gameState.phase,
                currentRound: this.gameState.currentRound,
                roundsToWin: this.gameState.roundsToWin,
                scores: Array.from(this.gameState.scores.values()),
                gameConfig: this.gameState.gameConfig
            },
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                leftKey: p.leftKey,
                rightKey: p.rightKey,
                position: p.position,
                rotation: p.rotation,
                alive: p.alive,
                trailPoints: p.trailPoints
            })),
            serverTime: Date.now(),
            tickCount: this.tickCount
        };

        io.to(this.id).emit('gameStateUpdate', stateData);
    }

    handlePlayerInput(socketId, inputData) {
        const player = this.players.get(socketId);
        if (player && this.gameState.phase === 'playing') {
            player.inputs = inputData.inputs;
            player.lastInputTime = Date.now();
        }
    }

    /**
     * Randomizes the gap interval and duration for a player
     * Creates unique timing patterns for each player
     */
    randomizePlayerGapTimings(player) {
        // Randomize gap interval (time between gaps)
        const intervalVariance = player.baseGapInterval * player.gapVariancePercent;
        const intervalMin = player.baseGapInterval - intervalVariance;
        const intervalMax = player.baseGapInterval + intervalVariance;
        player.gapInterval = Math.round(intervalMin + Math.random() * (intervalMax - intervalMin));
        
        // Randomize gap duration (how long gaps last) - smaller variance to keep gaps visible
        const durationVariance = player.baseGapDuration * (player.gapVariancePercent * 0.5); // Half the variance of interval
        const durationMin = player.baseGapDuration - durationVariance;
        const durationMax = player.baseGapDuration + durationVariance;
        player.gapDuration = Math.round(durationMin + Math.random() * (durationMax - durationMin));
        
        // Ensure minimum values
        player.gapInterval = Math.max(player.gapInterval, Math.round(player.baseGapInterval * 0.5));
        player.gapDuration = Math.max(player.gapDuration, Math.round(player.baseGapDuration * 0.5));
        
        console.log(`[Server] ${player.name} gap timings: interval=${player.gapInterval}, duration=${player.gapDuration}`);
    }

    getPublicData() {
        return {
            id: this.id,
            playerCount: this.players.size,
            maxPlayers: MAX_PLAYERS_PER_LOBBY,
            phase: this.gameState.phase,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                isReady: p.isReady,
                isHost: p.isHost,
                leftKey: p.leftKey,
                rightKey: p.rightKey
            }))
        };
    }
}

function generateLobbyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    playerSockets.set(socket.id, socket);

    socket.on('createLobby', (playerData, callback) => {
        try {
            const lobby = new Lobby(socket.id);
            const result = lobby.addPlayer(socket.id, playerData);
            
            if (result.success) {
                lobbies.set(lobby.id, lobby);
                socket.join(lobby.id);
                
                console.log(`Lobby ${lobby.id} created by ${socket.id}`);
                callback({ 
                    success: true, 
                    lobbyCode: lobby.id,
                    lobbyData: lobby.getPublicData()
                });
                
                // Notify lobby about new player
                socket.to(lobby.id).emit('playerJoined', result.player);
            } else {
                callback({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('Error creating lobby:', error);
            callback({ success: false, error: 'Failed to create lobby' });
        }
    });

    socket.on('joinLobby', (data, callback) => {
        try {
            const { lobbyCode, playerData } = data;
            const lobby = lobbies.get(lobbyCode.toUpperCase());
            
            if (!lobby) {
                callback({ success: false, error: 'Lobby not found' });
                return;
            }

            const result = lobby.addPlayer(socket.id, playerData);
            
            if (result.success) {
                socket.join(lobby.id);
                console.log(`Player ${socket.id} joined lobby ${lobby.id}`);
                
                callback({ 
                    success: true, 
                    lobbyData: lobby.getPublicData()
                });
                
                // Notify lobby about new player
                socket.to(lobby.id).emit('playerJoined', result.player);
                socket.to(lobby.id).emit('lobbyUpdated', lobby.getPublicData());
            } else {
                callback({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('Error joining lobby:', error);
            callback({ success: false, error: 'Failed to join lobby' });
        }
    });

    socket.on('setReady', (ready) => {
        try {
            // Find lobby containing this player
            for (const lobby of lobbies.values()) {
                if (lobby.players.has(socket.id)) {
                    lobby.setPlayerReady(socket.id, ready);
                    
                    // Broadcast lobby update
                    io.to(lobby.id).emit('lobbyUpdated', lobby.getPublicData());
                    
                    // Check if game can start
                    if (lobby.canStartGame()) {
                        io.to(lobby.id).emit('gameCanStart');
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error setting ready status:', error);
        }
    });

    socket.on('startGame', () => {
        try {
            for (const lobby of lobbies.values()) {
                if (lobby.players.has(socket.id)) {
                    const player = lobby.players.get(socket.id);
                    
                    // Only host can start game
                    if (player.isHost && lobby.canStartGame()) {
                        if (lobby.startGame()) {
                            console.log(`Game started in lobby ${lobby.id}`);
                            io.to(lobby.id).emit('gameStarted', {
                                gameState: lobby.gameState,
                                players: Array.from(lobby.players.values())
                            });
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error starting game:', error);
        }
    });

    socket.on('startNextRound', () => {
        try {
            for (const lobby of lobbies.values()) {
                if (lobby.players.has(socket.id)) {
                    const player = lobby.players.get(socket.id);
                    
                    // Only host can start next round
                    if (player.isHost && lobby.canStartNextRound()) {
                        if (lobby.startNextRound()) {
                            console.log(`Next round started in lobby ${lobby.id}`);
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error starting next round:', error);
        }
    });

    socket.on('returnToLobby', () => {
        console.log(`[Server] Received returnToLobby message from ${socket.id}`);
        try {
            for (const lobby of lobbies.values()) {
                if (lobby.players.has(socket.id)) {
                    const player = lobby.players.get(socket.id);
                    console.log(`[Server] Found player in lobby ${lobby.id}: ${player.name}, isHost: ${player.isHost}`);
                    console.log(`[Server] Lobby can return to lobby: ${lobby.canReturnToLobby()}`);
                    console.log(`[Server] Current lobby phase: ${lobby.gameState.phase}`);
                    
                    // Only host can return to lobby
                    if (player.isHost && lobby.canReturnToLobby()) {
                        console.log(`[Server] Host ${player.name} returning lobby ${lobby.id} to lobby state`);
                        if (lobby.returnToLobby()) {
                            console.log(`[Server] Successfully returned lobby ${lobby.id} to lobby by host`);
                        } else {
                            console.log(`[Server] Failed to return lobby ${lobby.id} to lobby`);
                        }
                    } else {
                        console.log(`[Server] Cannot return to lobby - isHost: ${player.isHost}, canReturn: ${lobby.canReturnToLobby()}`);
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('Error returning to lobby:', error);
        }
    });

    socket.on('playerInput', (inputData) => {
        try {
            for (const lobby of lobbies.values()) {
                if (lobby.players.has(socket.id)) {
                    lobby.handlePlayerInput(socket.id, inputData);
                    break;
                }
            }
        } catch (error) {
            console.error('Error handling player input:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        playerSockets.delete(socket.id);

        // Remove player from any lobby they're in
        for (const [lobbyId, lobby] of lobbies) {
            if (lobby.players.has(socket.id)) {
                const isEmpty = lobby.removePlayer(socket.id);
                
                if (isEmpty) {
                    // Clean up empty lobby
                    lobby.stopGameLoop();
                    lobbies.delete(lobbyId);
                    console.log(`Lobby ${lobbyId} deleted (empty)`);
                } else {
                    // Notify remaining players
                    io.to(lobby.id).emit('playerLeft', socket.id);
                    io.to(lobby.id).emit('lobbyUpdated', lobby.getPublicData());
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Achtung die Kurve server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Server shutting down...');
    
    // Clean up all game loops
    for (const lobby of lobbies.values()) {
        lobby.stopGameLoop();
    }
    
    httpServer.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});
