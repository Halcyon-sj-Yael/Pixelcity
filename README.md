# 🏙️ Pixel City — Build Together Simulator

A collaborative pixel art building game where players work together to create pixel art or cities on a shared grid. Features limited resources to encourage strategic collaboration.

## Features

- 🎨 **Interactive Grid**: 50x50 pixel grid for building
- 🌈 **Color Palette**: 24 vibrant colors to choose from
- 👥 **Real-time Collaboration**: Multiple players can build together using WebSockets
- 💎 **Resource Management**: Each player starts with 100 blocks - use them wisely!
- 🎮 **Modern UI**: Beautiful, responsive design with smooth animations
- 🔄 **Live Updates**: See other players' blocks appear in real-time
- 🔒 **Private Server**: Password-protected private server option for exclusive sessions

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:8080
```

4. Open multiple browser windows/tabs to see real-time collaboration!

### Private Server

You can also run a password-protected private server for exclusive sessions:

1. Start the private server:
```bash
npm run private
```

2. Open your browser and navigate to:
```
http://localhost:8081/private
```

3. Enter the password when prompted (default: `pixelcity2024`)

4. You can customize the password by setting the `PRIVATE_PASSWORD` environment variable:
```bash
PRIVATE_PASSWORD=yourpassword npm run private
```

### Running Both Servers

To run both the public and private servers simultaneously:
```bash
npm run both
```

- Public server: `http://localhost:8080`
- Private server: `http://localhost:8081/private`

## How to Play

1. **Select a Color**: Click on any color in the palette
2. **Place Blocks**: Click on the grid to place blocks
3. **Manage Resources**: You have 100 blocks - use them strategically!
4. **Collaborate**: Work with other players to build together
5. **Reset**: Use the "Reset Grid" button to start over (requires confirmation)

## Project Structure

```
Pixel City/
├── index.html          # Main HTML file (public server)
├── private.html         # Private server HTML file
├── style.css            # Styling and UI design
├── app.js               # Client-side game logic
├── server.js            # Public WebSocket server
├── private-server.js    # Private WebSocket server (password protected)
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## Technical Details

- **Frontend**: Vanilla JavaScript, HTML5 Canvas, CSS3
- **Backend**: Node.js with WebSocket (ws library)
- **Grid Size**: 50x50 cells (configurable in `app.js`)
- **Cell Size**: 12 pixels per cell
- **Initial Blocks**: 100 per player

## Future Enhancements

- [ ] User authentication and persistent sessions
- [ ] Different block types (wood, stone, etc.)
- [ ] 3D rendering for a "mini-Minecraft" experience
- [ ] Chat system for communication
- [ ] Save/load grid states
- [ ] Leaderboards and achievements
- [ ] Mobile support with touch controls
- [ ] Custom color picker
- [ ] Undo/redo functionality

## License

MIT License - feel free to use and modify!

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

---

**Enjoy building together! 🎨✨**

