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
- 🌐 **Network Hosting**: Host servers for friends to join over local network or internet

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

## Hosting for Friends (Network Play)

You can host a server and let your friends join from their computers on the same network or over the internet!

### Hosting a Public Server

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Find your IP address:**
   - The server will automatically display your local IP address when it starts
   - Look for a message like: `🌐 Network access (for friends): http://192.168.1.100:8080`
   - Share this IP address with your friends

3. **Friends can join in two ways:**
   - **Option 1:** Click the "Connect to Server" button and enter your IP address
   - **Option 2:** Visit `http://YOUR_IP:8080?server=YOUR_IP` in their browser

### Hosting a Private Server

1. **Start the private server:**
   ```bash
   npm run private
   ```

2. **Share the connection info:**
   - Share your IP address (shown when server starts)
   - Share the password (default: `pixelcity2024`)

3. **Friends join by:**
   - Visiting `http://YOUR_IP:8081/private?server=YOUR_IP`
   - Entering the password when prompted
   - Or using the "Change Server" button to enter your IP

### Troubleshooting Network Connections

**If friends can't connect:**

1. **Check Firewall:**
   - Make sure your firewall allows connections on port 8080 (public) or 8081 (private)
   - On Windows: Allow Node.js through Windows Firewall
   - On Mac/Linux: Check firewall settings

2. **Same Network:**
   - For local network play, all players must be on the same Wi-Fi/network
   - Use the local IP address (usually starts with 192.168.x.x or 10.x.x.x)

3. **Internet Play (Advanced):**
   - For friends outside your network, you'll need to:
     - Set up port forwarding on your router (forward port 8080 or 8081)
     - Share your public IP address (find it at whatismyip.com)
     - Ensure your router allows incoming connections

4. **Connection Dialog:**
   - Use the "Connect to Server" button to manually enter any server IP
   - Try both the IP address and "localhost" if you're the host

### Quick Connection Tips

- **Host:** Use `localhost` in the connection dialog
- **Friends:** Enter the host's IP address (shown in server console)
- **URL Parameter:** You can also use `?server=IP_ADDRESS` in the URL for quick connection

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

