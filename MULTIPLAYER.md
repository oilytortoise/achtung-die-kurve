# Online Multiplayer Setup

This document describes how to set up and use the online multiplayer functionality for Achtung die Kurve.

## Quick Start

### Development Mode

1. Install dependencies and start both client and server:
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

This will:
- Install client and server dependencies
- Start the WebSocket server on port 3001
- Start the Vite development server on port 3000
- Open your browser automatically

### Manual Setup

If you prefer to run client and server separately:

```bash
# Terminal 1: Start the server
cd server
npm install
npm start

# Terminal 2: Start the client
npm install
npm run dev
```

## How to Play Online

### Creating a Lobby

1. Open the game in your browser
2. Click "Online Multiplayer"
3. Click "Create Lobby"
4. Enter your name
5. Share the lobby code or link with friends

### Joining a Lobby

1. Get the lobby code from a friend
2. Click "Online Multiplayer"
3. Click "Join Lobby"
4. Enter your name and the lobby code
5. Click "Ready" when you're ready to play

### Starting the Game

- Only the lobby host can start the game
- All players must be marked as "Ready"
- At least 2 players are required

## Technical Architecture

### Client-Server Communication

- **WebSocket Protocol**: Uses Socket.IO for reliable real-time communication
- **Authoritative Server**: All game logic runs on the server to prevent cheating
- **Client Prediction**: Local input is applied immediately for responsiveness
- **Lag Compensation**: Server timestamps and client interpolation minimize lag effects

### Network Features

- **Automatic Reconnection**: Clients automatically attempt to reconnect if disconnected
- **Message Queuing**: Messages are queued during disconnections and sent when reconnected
- **Latency Monitoring**: Real-time latency display for network quality feedback
- **Graceful Degradation**: Game continues for remaining players if someone disconnects

### Lobby System

- **6-Character Codes**: Easy to share lobby codes (e.g., "ABC123")
- **Shareable Links**: Direct links to join specific lobbies
- **Host Migration**: If host leaves, another player becomes host
- **Player Limits**: Maximum 8 players per lobby

## Deployment

### Production Server

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start server
cd server
npm install --production
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit
pm2 logs achtung-server
```

#### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
cd server
docker build -t achtung-server .
docker run -p 3001:3001 achtung-server
```

### Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

### Client Configuration

Update the server URL in production by modifying the NetworkClient constructor in `src/network/NetworkClient.ts`:

```typescript
constructor(serverUrl: string = 'wss://your-server-domain.com')
```

## Troubleshooting

### Common Issues

1. **"Failed to connect to server"**
   - Ensure the server is running on port 3001
   - Check firewall settings
   - Verify the server URL in NetworkClient

2. **High Latency**
   - Check network connection
   - Consider server location relative to players
   - Monitor server resources

3. **Players Disconnecting**
   - Check network stability
   - Verify server logs for errors
   - Ensure server has adequate resources

### Server Logs

```bash
# If using PM2
pm2 logs achtung-server

# If running directly
node server.js

# If using Docker
docker logs container-name
```

### Client Debug Information

Open browser developer tools and check the console for:
- Connection status
- Network events
- Game state updates
- Error messages

## Performance Considerations

- **Server Resources**: Each lobby uses minimal memory (~1-5MB)
- **Network Bandwidth**: ~1-2KB/s per player during gameplay
- **Client Performance**: Online mode has minimal impact on client performance
- **Concurrent Players**: Server can handle 100+ concurrent players across multiple lobbies

## Security Notes

- Server validates all client inputs
- No sensitive data is transmitted
- Lobby codes expire when empty
- Rate limiting prevents spam connections

## Development Notes

### Adding New Features

1. Update types in `src/types/index.ts`
2. Add server logic in `server/server.js`
3. Update NetworkClient for new messages
4. Modify UI components as needed

### Testing

- Test with multiple browser tabs for local testing
- Use different browsers/devices for realistic testing
- Test network interruptions by stopping/starting server
- Verify reconnection behavior
