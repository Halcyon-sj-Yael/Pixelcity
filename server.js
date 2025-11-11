const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Server Configuration
const PORT = 8080;
const GRID_SIZE = 50;

// Get local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Game State (shared across all clients)
let gridState = [];
let players = new Map(); // Map of playerId -> { name, ... }

// Initialize empty grid
function initializeGrid() {
    gridState = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        gridState[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            gridState[y][x] = null;
        }
    }
}

// HTTP Server for serving static files
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

// Initialize grid on server start
initializeGrid();

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send current grid state to new client
    ws.send(JSON.stringify({
        type: 'gridState',
        grid: gridState
    }));

    // Send current players list with usernames
    const playersList = Array.from(players.entries()).map(([id, info]) => ({
        playerId: id,
        playerName: info.name || `Player${id.substr(0, 6)}`
    }));
    ws.send(JSON.stringify({
        type: 'playerJoined',
        players: playersList
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    players.set(data.playerId, { name: data.playerName || `Player${data.playerId.substr(0, 6)}` });
                    console.log(`Player ${data.playerId} (${data.playerName || 'Unknown'}) joined. Total players: ${players.size}`);
                    
                    // Broadcast updated player list to all clients
                    const playersList = Array.from(players.entries()).map(([id, info]) => ({
                        playerId: id,
                        playerName: info.name || `Player${id.substr(0, 6)}`
                    }));
                    broadcast({
                        type: 'playerJoined',
                        players: playersList
                    }, ws);
                    break;
                
                case 'updateUsername':
                    if (players.has(data.playerId)) {
                        players.set(data.playerId, { name: data.playerName || `Player${data.playerId.substr(0, 6)}` });
                        console.log(`Player ${data.playerId} updated username to: ${data.playerName}`);
                        
                        // Broadcast updated player list
                        const updatedPlayersList = Array.from(players.entries()).map(([id, info]) => ({
                            playerId: id,
                            playerName: info.name || `Player${id.substr(0, 6)}`
                        }));
                        broadcast({
                            type: 'playerJoined',
                            players: updatedPlayersList
                        }, null);
                    }
                    break;

                case 'placeBlock':
                    // Validate placement
                    if (data.x >= 0 && data.x < GRID_SIZE && 
                        data.y >= 0 && data.y < GRID_SIZE &&
                        gridState[data.y][data.x] === null) {
                        
                        // Place block in server state
                        gridState[data.y][data.x] = data.color;
                        
                        // Broadcast to all other clients
                        broadcast({
                            type: 'blockPlaced',
                            x: data.x,
                            y: data.y,
                            color: data.color,
                            playerId: data.playerId
                        }, ws);
                    }
                    break;

                case 'removeBlock':
                    // Validate removal
                    if (data.x >= 0 && data.x < GRID_SIZE && 
                        data.y >= 0 && data.y < GRID_SIZE &&
                        gridState[data.y] && gridState[data.y][data.x] !== null) {
                        
                        // Remove block from server state
                        gridState[data.y][data.x] = null;
                        
                        // Broadcast to all other clients
                        broadcast({
                            type: 'blockRemoved',
                            x: data.x,
                            y: data.y,
                            playerId: data.playerId
                        }, ws);
                    }
                    break;

                case 'resetGrid':
                    // Reset grid
                    initializeGrid();
                    
                    // Broadcast reset to all clients
                    broadcast({
                        type: 'gridReset'
                    }, ws);
                    break;

                case 'chatMessage':
                    // Get player name from stored data or use provided name
                    const playerInfo = players.get(data.playerId);
                    const chatPlayerName = playerInfo ? playerInfo.name : (data.playerName || 'Player');
                    
                    // Broadcast chat message to all other clients (sender already sees it locally)
                    broadcast({
                        type: 'chatMessage',
                        playerId: data.playerId,
                        playerName: chatPlayerName,
                        message: data.message
                    }, ws);
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Remove player from list (find by connection - in production, track ws -> playerId mapping)
        // For now, we'll keep players until they reconnect with same ID
        // In a real implementation, you'd track ws -> playerId mapping
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast message to all connected clients except sender (or all if sender is null)
function broadcast(message, sender) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            if (sender === null || client !== sender) {
                client.send(JSON.stringify(message));
            }
        }
    });
}

// Start server
const HOST = '0.0.0.0'; // Listen on all network interfaces
const localIP = getLocalIPAddress();

server.listen(PORT, HOST, () => {
    console.log(`🚀 Pixel City Server running!`);
    console.log(`📡 WebSocket server ready for connections`);
    console.log(``);
    console.log(`📍 Local access:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(``);
    console.log(`🌐 Network access (for friends):`);
    console.log(`   http://${localIP}:${PORT}`);
    console.log(``);
    console.log(`💡 Share this IP address with your friends: ${localIP}:${PORT}`);
    console.log(`   They can connect by visiting: http://${localIP}:${PORT}`);
});

