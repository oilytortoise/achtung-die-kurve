# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Achtung die Kurve is a modern recreation of the classic multiplayer browser game using TypeScript, Phaser.js, and Vite. Players control colored lines that move continuously, avoiding collisions with walls, other trails, and their own trail.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (opens browser at http://localhost:3000)
npm run dev

# Start full development environment (client + server for online multiplayer)
npm run dev:full
# OR
./scripts/dev.sh

# Start only the WebSocket server
npm run server

# Build for production
npm run build

# Preview production build
npm run preview

# Run TypeScript type checking
npm run type-check
```

## Architecture Overview

The game follows a modular architecture with clear separation of concerns:

### Core Components
- **main.ts**: Entry point that initializes Phaser game and coordinates between UI and game logic
- **GameScene**: Phaser scene that manages the game canvas and rendering
- **GameManager**: Central game logic controller handling rounds, scoring, and game state (local multiplayer)
- **OnlineGameManager**: Handles online multiplayer game logic and network synchronization
- **Player**: Entity representing each player with movement, collision detection, and trail rendering
- **UIManager**: Handles all DOM-based UI including player setup, HUD, lobby management, and game over screens

### Online Multiplayer Components
- **NetworkClient**: WebSocket client with automatic reconnection and message queuing
- **LobbyManager**: Handles lobby creation, joining, player management, and ready states
- **WebSocket Server**: Node.js server managing game lobbies and authoritative game state
- **ErrorHandler**: Centralized error handling and user notifications

### Key Architecture Patterns
- **Entity-Manager Pattern**: GameManager controls Player entities
- **Event-Driven Communication**: UI and game communicate through callbacks
- **State Management**: Centralized game state with phases (setup, playing, roundOver, gameOver)
- **Canvas + DOM Hybrid**: Phaser renders game graphics while DOM handles UI overlays

### Game Loop Flow
1. GameManager.update() called each frame
2. All Player.update() methods called for movement/trail rendering
3. Collision detection runs against all trail points
4. Game state transitions handled (round end, game over)
5. UI updates reflect current game state

## Key Technical Details

### Player Controls
- 8 players max with predefined key bindings (A/S, Arrow keys, Q/W, etc.)
- Keyboard input handled via Phaser input system
- Continuous movement with left/right turning only

### Collision System
- Trail points stored as coordinate arrays for each player
- Distance-based collision detection with configurable radius
- Self-collision prevention for recent trail segments
- Boundary collision detection for canvas edges

### Trail Rendering
- Real-time trail drawing using Phaser Graphics objects
- Periodic gaps in trails (classic game feature)
- Collision points sampled every 2 pixels for accuracy

### Game Configuration
- Default game: 5 rounds to win
- Canvas size: 1200x800 pixels
- Configurable player colors and controls via types/index.ts

## Development Notes

- Game state is managed centrally but UI updates are callback-driven
- Player spawning uses circular positioning around canvas center
- TypeScript strict mode enabled with comprehensive type definitions
- Vite handles hot module replacement and fast rebuilds
