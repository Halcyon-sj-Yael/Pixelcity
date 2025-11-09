const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Server Configuration
const PORT = 8080;
const GRID_SIZE = 50;

// Game State (shared across all clients)
let gridState = [];
let players = new Set();

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

    // Send current players list
    ws.send(JSON.stringify({
        type: 'playerJoined',
        players: Array.from(players)
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    players.add(data.playerId);
                    console.log(`Player ${data.playerId} joined. Total players: ${players.size}`);
                    
                    // Broadcast updated player list to all clients
                    broadcast({
                        type: 'playerJoined',
                        players: Array.from(players)
                    }, ws);
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
                    // Broadcast chat message to all other clients (sender already sees it locally)
                    broadcast({
                        type: 'chatMessage',
                        playerId: data.playerId,
                        playerName: data.playerName || 'Player',
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
        // Note: In a production app, you'd track which playerId belongs to which connection
        // and remove that specific player. For simplicity, we'll keep all players in the list.
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
server.listen(PORT, () => {
    console.log(`🚀 Pixel City Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready for connections`);
    console.log(`🎮 Open http://localhost:${PORT} in your browser to play!`);
});

