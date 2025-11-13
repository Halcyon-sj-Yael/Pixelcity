const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Private Server Configuration
const PORT = 8081;
const GRID_SIZE = 100;
const PRIVATE_PASSWORD = process.env.PRIVATE_PASSWORD || 'pixelcity2024'; // Default password, can be set via environment variable

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
let players = new Map(); // Map of playerId -> { ws, name, authenticated }
let authenticatedClients = new Set();

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
    // Check if requesting private client page
    if (req.url === '/private' || req.url === '/private.html') {
        let filePath = './private.html';
        fs.readFile(filePath, (error, content) => {
            if (error) {
                // If private.html doesn't exist, serve index.html with private config
                filePath = './index.html';
                fs.readFile(filePath, (error, content) => {
                    if (error) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content, 'utf-8');
            }
        });
        return;
    }

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

wss.on('connection', (ws, req) => {
    console.log('New client connected to private server');
    const clientId = Math.random().toString(36).substr(2, 9);
    let authenticated = false;

    // Send authentication request
    ws.send(JSON.stringify({
        type: 'authRequired',
        message: 'Please enter the private server password'
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Handle authentication
            if (!authenticated && data.type === 'authenticate') {
                if (data.password === PRIVATE_PASSWORD) {
                    authenticated = true;
                    authenticatedClients.add(ws);
                    players.set(clientId, { ws, name: data.playerName || `Player${clientId.substr(0, 6)}`, authenticated: true });
                    
                    ws.send(JSON.stringify({
                        type: 'authSuccess',
                        message: 'Authentication successful! Welcome to the private server.'
                    }));

                    // Send current grid state to authenticated client
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

                    // Broadcast new player to all authenticated clients
                    broadcast({
                        type: 'playerJoined',
                        players: playersList
                    }, ws);

                    console.log(`Player ${clientId} authenticated. Total authenticated players: ${authenticatedClients.size}`);
                } else {
                    ws.send(JSON.stringify({
                        type: 'authFailed',
                        message: 'Invalid password. Access denied.'
                    }));
                    console.log(`Authentication failed for client ${clientId}`);
                    // Close connection after failed auth
                    setTimeout(() => {
                        if (!authenticated) {
                            ws.close();
                        }
                    }, 2000);
                }
                return;
            }

            // Only process messages from authenticated clients
            if (!authenticated) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'You must authenticate first'
                }));
                return;
            }

            switch (data.type) {
                case 'join':
                    players.set(clientId, { ws, name: data.playerName || `Player${clientId.substr(0, 6)}`, authenticated: true });
                    console.log(`Player ${clientId} (${data.playerName || 'Unknown'}) joined. Total players: ${players.size}`);
                    
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
                    if (players.has(clientId)) {
                        const playerInfo = players.get(clientId);
                        playerInfo.name = data.playerName || `Player${clientId.substr(0, 6)}`;
                        players.set(clientId, playerInfo);
                        console.log(`Player ${clientId} updated username to: ${data.playerName}`);
                        
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
                        
                        // Broadcast to all other authenticated clients
                        broadcast({
                            type: 'blockPlaced',
                            x: data.x,
                            y: data.y,
                            color: data.color,
                            playerId: clientId
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
                        
                        // Broadcast to all other authenticated clients
                        broadcast({
                            type: 'blockRemoved',
                            x: data.x,
                            y: data.y,
                            playerId: clientId
                        }, ws);
                    }
                    break;

                case 'resetGrid':
                    // Reset grid
                    initializeGrid();
                    
                    // Broadcast reset to all authenticated clients
                    broadcast({
                        type: 'gridReset'
                    }, ws);
                    break;

                case 'chatMessage':
                    // Broadcast chat message to all other authenticated clients
                    const player = players.get(clientId);
                    const chatPlayerName = player ? player.name : (data.playerName || 'Player');
                    broadcast({
                        type: 'chatMessage',
                        playerId: clientId,
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
        console.log('Client disconnected from private server');
        authenticatedClients.delete(ws);
        players.delete(clientId);
        
        // Broadcast updated player list
        broadcast({
            type: 'playerLeft',
            players: Array.from(players.keys())
        }, null);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast message to all authenticated clients except sender (or all if sender is null)
function broadcast(message, sender) {
    authenticatedClients.forEach((client) => {
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
    console.log(`🔒 Private Pixel City Server running!`);
    console.log(`📡 WebSocket server ready for authenticated connections`);
    console.log(`🔑 Default password: ${PRIVATE_PASSWORD}`);
    console.log(`💡 Set PRIVATE_PASSWORD environment variable to change the password`);
    console.log(``);
    console.log(`📍 Local access:`);
    console.log(`   http://localhost:${PORT}/private`);
    console.log(``);
    console.log(`🌐 Network access (for friends):`);
    console.log(`   http://${localIP}:${PORT}/private`);
    console.log(``);
    console.log(`💡 Share this IP address with your friends: ${localIP}:${PORT}`);
    console.log(`   They can connect by visiting: http://${localIP}:${PORT}/private`);
});

