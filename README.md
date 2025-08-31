# Achtung die Kurve

A modern recreation of the classic browser-based multiplayer game "Achtung die Kurve" (also known as "Curve Fever").

## About the Game

Achtung die Kurve is a multiplayer game where players control colored lines that continuously move forward, leaving trails behind them. Players can only turn left or right, and must avoid crashing into walls, other players' trails, or their own trail. The last player standing wins the round!

## Features

- 🎮 Support for up to 8 players on one keyboard
- 🌈 Colorful player trails with customizable colors
- 🏆 Tournament-style scoring system
- ⚡ Smooth 60 FPS gameplay
- 🎯 Modern UI with responsive design
- 🕳️ Periodic gaps in trails (classic feature)

## Technology Stack

- **TypeScript** - Type-safe JavaScript for better development experience
- **Phaser.js** - Powerful 2D game framework
- **Vite** - Fast build tool and dev server
- **HTML5 Canvas** - Hardware-accelerated graphics

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd achtung-die-kurve
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

To build the game for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## How to Play

### Setup
1. Add players using the "Add Player" button (minimum 2 players required)
2. Each player is assigned a unique color and keyboard controls
3. Click "Start Game" to begin

### Controls
Default key bindings for players:
- **Player 1**: A (left) / S (right)
- **Player 2**: ← (left) / → (right)
- **Player 3**: Q (left) / W (right)
- **Player 4**: O (left) / P (right)
- **Player 5**: F (left) / G (right)
- **Player 6**: H (left) / J (right)
- **Player 7**: N (left) / M (right)
- **Player 8**: Z (left) / X (right)

### Gameplay
- Your line moves continuously forward
- Press your left key to turn left, right key to turn right
- Avoid hitting walls, other players' trails, or your own trail
- Gaps appear periodically in trails - use these strategically!
- Last player alive wins the round
- First to win 5 rounds wins the game

## Development

### Project Structure

```
src/
├── entities/        # Game entities (Player, etc.)
├── managers/        # Game logic managers (GameManager, UIManager)
├── scenes/          # Phaser.js scenes
├── styles/          # CSS styles
├── types/           # TypeScript type definitions
└── main.ts          # Application entry point
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking

## Roadmap

- [ ] Improve collision detection for pixel-perfect accuracy
- [ ] Add sound effects and background music
- [ ] Implement power-ups and special abilities
- [ ] Add online multiplayer support
- [ ] Mobile touch controls
- [ ] Customizable game settings (speed, trail thickness, etc.)
- [ ] Player statistics and leaderboards

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Original "Achtung die Kurve" game creators
- Phaser.js community for the excellent game framework
