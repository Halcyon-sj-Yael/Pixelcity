// Game Configuration
const CONFIG = {
    GRID_SIZE: 50, // 50x50 grid
    CELL_SIZE: 12, // pixels per cell
    INITIAL_BLOCKS: 100, // starting blocks per player
    WS_URL: 'ws://localhost:8080' // No trailing slash
};

// Game State
const gameState = {
    grid: [],
    selectedColor: '#667eea',
    blocksRemaining: CONFIG.INITIAL_BLOCKS,
    totalPlaced: 0,
    ws: null,
    connected: false,
    playerId: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,
    isConnecting: false,
    playerName: 'Player' + Math.floor(Math.random() * 1000),
    serverName: 'Local Server', // Server name for display
    chatMessages: [],
    eraseMode: false,
    history: [] // Track placed blocks for undo
};

// Color Palette - Organized by Categories
const colorCategories = {
    'Red Colors': [
        '#ff1744', '#e91e63', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
        '#f43f5e', '#ec4899', '#ff6b9d', '#ff9a9e', '#fa709a', '#c41e3a'
    ],
    'Orange Colors': [
        '#ff9800', '#ff6f00', '#ff5722', '#f97316', '#fb923c', '#ea580c',
        '#c2410c', '#d97706', '#f59e0b', '#fbbf24', '#ff8a50', '#ff7043'
    ],
    'Yellow Colors': [
        '#fee140', '#ffc107', '#ffeb3b', '#ffd700', '#ffd54f', '#fff176',
        '#fff59d', '#ffff00', '#fdd835', '#fbc02d', '#f9a825', '#f57f17'
    ],
    'Green Colors': [
        '#43e97b', '#10b981', '#059669', '#047857', '#34d399', '#6ee7b7',
        '#22c55e', '#16a34a', '#15803d', '#4ade80', '#86efac', '#a7f3d0',
        '#4caf50', '#8bc34a', '#66bb6a', '#81c784'
    ],
    'Blue Colors': [
        '#4facfe', '#00d4ff', '#0099ff', '#0066cc', '#3b82f6', '#2563eb',
        '#1d4ed8', '#1e40af', '#2196f3', '#03a9f4', '#00bcd4', '#0288d1',
        '#1976d2', '#1565c0', '#0d47a1', '#0277bd'
    ],
    'Purple Colors': [
        '#667eea', '#764ba2', '#8b5cf6', '#6366f1', '#9c27b0', '#7b1fa2',
        '#6a1b9a', '#4a148c', '#ab47bc', '#ba68c8', '#ce93d8', '#e1bee7',
        '#9575cd', '#7986cb', '#5c6bc0', '#3f51b5'
    ],
    'Pink Colors': [
        '#f093fb', '#ec4899', '#f43f5e', '#ff6b9d', '#ff9a9e', '#fa709a',
        '#fed6e3', '#ffd1ff', '#fbcfe8', '#fce4ec', '#fff0f5', '#ffe0f0',
        '#e91e63', '#c2185b', '#ad1457', '#880e4f'
    ],
    'Brown Colors': [
        '#8b4513', '#a0522d', '#cd853f', '#d2691e', '#b8860b', '#daa520',
        '#c9a961', '#d4a574', '#bc8f8f', '#a0826d', '#8b7355', '#6b4423',
        '#795548', '#6d4c41', '#5d4037', '#4e342e'
    ],
    'Black Colors': [
        '#000000', '#1a1a1a', '#1f1f1f', '#2d2d2d', '#212121', '#0d0d0d'
    ],
    'Gray Colors': [
        '#333333', '#4a4a4a', '#666666', '#888888', '#aaaaaa', '#cccccc',
        '#e0e0e0', '#9e9e9e', '#757575', '#616161', '#424242', '#303030'
    ],
    'White Colors': [
        '#ffffff', '#fafafa', '#f5f5f5', '#f0f0f0', '#eeeeee', '#e8e8e8',
        '#faf9f6', '#fffef7', '#fefefe', '#fdfdfd', '#fcfcfc', '#fbfbfb'
    ]
};

// Flatten colors array for backward compatibility
const colors = Object.values(colorCategories).flat();

// Initialize Game
function init() {
    // Initialize grid first before drawing
    initializeGrid();
    setupCanvas();
    setupColorPalette();
    setupEventListeners();
    updateUI();
    
    // Auto-connect to localhost if no server parameter in URL
    // Users can use the "Connect to Server" button to connect to a different server
    const urlParams = new URLSearchParams(window.location.search);
    const serverParam = urlParams.get('server');
    
    if (!serverParam) {
        // Auto-connect to localhost for local play
        setTimeout(() => { connectWebSocket(); }, 1000);
    } else {
        // Server specified in URL, will be handled by connection dialog
        updateConnectionStatus('offline', 'Click "Connect to Server" to join');
    }
}

// Setup Canvas
function setupCanvas() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas internal size (resolution)
    const canvasWidth = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE;
    const canvasHeight = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Set canvas display size (CSS)
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // Ensure canvas is visible and interactive
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    
    // Draw initial grid
    drawGrid();
    
    console.log('Canvas initialized:', {
        internalSize: `${canvas.width}x${canvas.height}`,
        displaySize: `${canvas.style.width}x${canvas.style.height}`,
        gridSize: `${CONFIG.GRID_SIZE}x${CONFIG.GRID_SIZE}`,
        cellSize: CONFIG.CELL_SIZE
    });
}

// Initialize Grid
function initializeGrid() {
    gameState.grid = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
            gameState.grid[y][x] = null; // null means empty
        }
    }
    drawGrid();
}

// Draw Grid
function drawGrid() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, canvas.height);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(canvas.width, i * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
    
    // Draw placed blocks
    if (gameState.grid && gameState.grid.length > 0) {
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            if (gameState.grid[y]) {
                for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                    if (gameState.grid[y][x]) {
                        ctx.fillStyle = gameState.grid[y][x];
                        ctx.fillRect(
                            x * CONFIG.CELL_SIZE + 1,
                            y * CONFIG.CELL_SIZE + 1,
                            CONFIG.CELL_SIZE - 2,
                            CONFIG.CELL_SIZE - 2
                        );
                    }
                }
            }
        }
    }
}

// Setup Color Palette
function setupColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = '';
    
    // Create color swatches organized by category
    Object.entries(colorCategories).forEach(([categoryName, categoryColors]) => {
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'color-category-header';
        categoryHeader.textContent = categoryName;
        palette.appendChild(categoryHeader);
        
        // Create category container
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'color-category';
        
        // Add color swatches for this category
        categoryColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.setAttribute('title', color);
            if (color === gameState.selectedColor) {
                swatch.classList.add('selected');
            }
            swatch.addEventListener('click', () => selectColor(color, swatch));
            categoryContainer.appendChild(swatch);
        });
        
        palette.appendChild(categoryContainer);
    });
}

// Select Color
function selectColor(color, element) {
    gameState.selectedColor = color;
    
    // Update UI
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('selected');
    });
    element.classList.add('selected');
}

// Setup Event Listeners
function setupEventListeners() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found for event listeners!');
        return;
    }
    
    // Mouse events
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasHover);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
    
    // Button events
    const clearBtn = document.getElementById('clearBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInput = document.getElementById('chatInput');
    const eraseModeBtn = document.getElementById('eraseModeBtn');
    const undoBtn = document.getElementById('undoBtn');
    
    if (clearBtn) clearBtn.addEventListener('click', clearSelection);
    if (resetBtn) resetBtn.addEventListener('click', resetGrid);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImage);
    if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
    if (eraseModeBtn) eraseModeBtn.addEventListener('click', toggleEraseMode);
    if (undoBtn) undoBtn.addEventListener('click', undoLast);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    console.log('Event listeners set up');
}

// Handle Canvas Click
function handleCanvasClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found in click handler');
        return;
    }
    
    // Get canvas position and actual size
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Calculate scale factors
    const scaleX = canvasWidth / displayWidth;
    const scaleY = canvasHeight / displayHeight;
    
    // Get click position relative to canvas
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to canvas coordinates
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    // Calculate grid cell coordinates
    const x = Math.floor(canvasX / CONFIG.CELL_SIZE);
    const y = Math.floor(canvasY / CONFIG.CELL_SIZE);
    
    if (x >= 0 && x < CONFIG.GRID_SIZE && y >= 0 && y < CONFIG.GRID_SIZE) {
        // Check if in erase mode
        if (gameState.eraseMode) {
            removeBlock(x, y);
        } else {
            // Normal placement mode
            if (!gameState.selectedColor) {
                alert('Please select a color first!');
                return;
            }
            
            if (gameState.blocksRemaining <= 0) {
                alert('You have no blocks remaining! Work with others to build.');
                return;
            }
            
            placeBlock(x, y, gameState.selectedColor);
        }
    } else {
        console.warn('Click outside grid bounds:', x, y);
    }
}

// Handle Canvas Hover
function handleCanvasHover(e) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CONFIG.CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CONFIG.CELL_SIZE);
    
    if (x >= 0 && x < CONFIG.GRID_SIZE && y >= 0 && y < CONFIG.GRID_SIZE) {
        if (gameState.eraseMode) {
            canvas.style.cursor = 'not-allowed';
        } else {
            canvas.style.cursor = gameState.blocksRemaining > 0 ? 'crosshair' : 'not-allowed';
        }
    } else {
        canvas.style.cursor = 'default';
    }
}

// Place Block
function placeBlock(x, y, color) {
    // Validate coordinates
    if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) {
        console.warn('Invalid coordinates:', x, y);
        return;
    }
    
    // Validate color
    if (!color) {
        console.error('No color provided for block placement');
        return;
    }
    
    // Ensure grid array exists
    if (!gameState.grid[y]) {
        gameState.grid[y] = [];
    }
    
    // Check if cell is already occupied
    if (gameState.grid[y][x] !== null) {
        console.log('Cell already occupied at:', x, y, 'Current color:', gameState.grid[y][x]);
        return; // Can't place on occupied cell
    }
    
    // Place block in grid
    gameState.grid[y][x] = color;
    gameState.blocksRemaining--;
    gameState.totalPlaced++;
    
    // Add to history for undo
    gameState.history.push({ x, y, color, action: 'place' });
    
    // Draw the block
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found when placing block');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }
    
    // Draw the filled block
    ctx.fillStyle = color;
    ctx.fillRect(
        x * CONFIG.CELL_SIZE + 1,
        y * CONFIG.CELL_SIZE + 1,
        CONFIG.CELL_SIZE - 2,
        CONFIG.CELL_SIZE - 2
    );
    
    // Add subtle border for visual feedback
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(
        x * CONFIG.CELL_SIZE + 1,
        y * CONFIG.CELL_SIZE + 1,
        CONFIG.CELL_SIZE - 2,
        CONFIG.CELL_SIZE - 2
    );
    
    console.log('✓ Block placed successfully at:', x, y, 'Color:', color, 'Remaining:', gameState.blocksRemaining);
    
    // Send to server if connected
    if (gameState.ws && gameState.connected) {
        gameState.ws.send(JSON.stringify({
            type: 'placeBlock',
            x: x,
            y: y,
            color: color,
            playerId: gameState.playerId
        }));
    }
    
    updateUI();
}

// Remove Block
function removeBlock(x, y) {
    // Validate coordinates
    if (x < 0 || x >= CONFIG.GRID_SIZE || y < 0 || y >= CONFIG.GRID_SIZE) {
        console.warn('Invalid coordinates:', x, y);
        return;
    }
    
    // Ensure grid array exists
    if (!gameState.grid[y]) {
        gameState.grid[y] = [];
    }
    
    // Check if cell is empty
    if (gameState.grid[y][x] === null) {
        console.log('Cell is already empty at:', x, y);
        return;
    }
    
    // Store old color for history
    const oldColor = gameState.grid[y][x];
    
    // Remove block from grid
    gameState.grid[y][x] = null;
    gameState.blocksRemaining++;
    gameState.totalPlaced--;
    
    // Add to history for undo
    gameState.history.push({ x, y, color: oldColor, action: 'remove' });
    
    // Redraw the grid to show the removed block
    drawGrid();
    
    console.log('✓ Block removed at:', x, y);
    
    // Send to server if connected
    if (gameState.ws && gameState.connected) {
        gameState.ws.send(JSON.stringify({
            type: 'removeBlock',
            x: x,
            y: y,
            playerId: gameState.playerId
        }));
    }
    
    updateUI();
}

// Toggle Erase Mode
function toggleEraseMode() {
    gameState.eraseMode = !gameState.eraseMode;
    const eraseBtn = document.getElementById('eraseModeBtn');
    const canvas = document.getElementById('gameCanvas');
    
    if (eraseBtn) {
        if (gameState.eraseMode) {
            eraseBtn.textContent = 'Place Mode';
            eraseBtn.classList.add('active');
            if (canvas) canvas.style.cursor = 'not-allowed';
        } else {
            eraseBtn.textContent = 'Erase Mode';
            eraseBtn.classList.remove('active');
            if (canvas) canvas.style.cursor = 'crosshair';
        }
    }
}

// Undo Last Action
function undoLast() {
    if (gameState.history.length === 0) {
        alert('Nothing to undo!');
        return;
    }
    
    const lastAction = gameState.history.pop();
    
    if (lastAction.action === 'place') {
        // Undo a placement - remove the block
        if (gameState.grid[lastAction.y] && gameState.grid[lastAction.y][lastAction.x] === lastAction.color) {
            gameState.grid[lastAction.y][lastAction.x] = null;
            gameState.blocksRemaining++;
            gameState.totalPlaced--;
            drawGrid();
            updateUI();
            console.log('✓ Undone: Removed block at', lastAction.x, lastAction.y);
        }
    } else if (lastAction.action === 'remove') {
        // Undo a removal - restore the block
        if (gameState.grid[lastAction.y]) {
            gameState.grid[lastAction.y][lastAction.x] = lastAction.color;
            gameState.blocksRemaining--;
            gameState.totalPlaced++;
            drawGrid();
            updateUI();
            console.log('✓ Undone: Restored block at', lastAction.x, lastAction.y);
        }
    }
    
    // Send to server if connected
    if (gameState.ws && gameState.connected) {
        if (lastAction.action === 'place') {
            gameState.ws.send(JSON.stringify({
                type: 'removeBlock',
                x: lastAction.x,
                y: lastAction.y,
                playerId: gameState.playerId
            }));
        } else {
            gameState.ws.send(JSON.stringify({
                type: 'placeBlock',
                x: lastAction.x,
                y: lastAction.y,
                color: lastAction.color,
                playerId: gameState.playerId
            }));
        }
    }
}

// Clear Selection
function clearSelection() {
    // This could be extended to clear a selection area
    alert('Selection cleared. Click on the grid to place blocks.');
}

// Reset Grid
function resetGrid() {
    if (confirm('Are you sure you want to reset the entire grid? This will clear all blocks.')) {
        initializeGrid();
        gameState.blocksRemaining = CONFIG.INITIAL_BLOCKS;
        gameState.totalPlaced = 0;
        gameState.history = []; // Clear history
        
        if (gameState.ws && gameState.connected) {
            gameState.ws.send(JSON.stringify({
                type: 'resetGrid',
                playerId: gameState.playerId
            }));
        }
        
        updateUI();
    }
}

// Download Image
function downloadImage() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        alert('Canvas not found!');
        return;
    }
    
    // Create a temporary canvas with higher resolution for better quality
    const scale = 2; // 2x resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * scale;
    tempCanvas.height = canvas.height * scale;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Scale up the image
    tempCtx.imageSmoothingEnabled = false; // Keep pixelated look
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Convert to blob and download
    tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `pixel-city-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// Send Chat Message
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add message to local chat
    addChatMessage(gameState.playerName, message, 'user');
    
    // Send to server if connected
    if (gameState.ws && gameState.connected) {
        gameState.ws.send(JSON.stringify({
            type: 'chatMessage',
            playerId: gameState.playerId,
            playerName: gameState.playerName,
            message: message
        }));
    }
    
    // Clear input
    chatInput.value = '';
}

// Add Chat Message to UI
function addChatMessage(username, message, type = 'other') {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Remove welcome message if it exists
    const welcomeMsg = chatMessages.querySelector('.chat-message.system');
    if (welcomeMsg && welcomeMsg.textContent.includes('Welcome')) {
        welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (type === 'system') {
        messageDiv.innerHTML = `<span class="chat-time">${time}</span><span class="chat-text">${message}</span>`;
    } else {
        messageDiv.innerHTML = `
            <span class="chat-time">${time}</span>
            <span class="chat-username">${username}:</span>
            <span class="chat-text">${message}</span>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store message
    gameState.chatMessages.push({ username, message, type, time });
}

// Update UI
function updateUI() {
    const blocksRemainingEl = document.getElementById('blocksRemaining');
    if (blocksRemainingEl) {
        blocksRemainingEl.textContent = gameState.blocksRemaining;
    }
    document.getElementById('totalPlaced').textContent = gameState.totalPlaced;
}

// WebSocket Connection (Optional - only connects if server is available)
function connectWebSocket() {
    // Prevent multiple connection attempts
    if (gameState.isConnecting || gameState.connected) {
        return;
    }
    
    // Stop trying if we've exceeded max attempts
    if (gameState.reconnectAttempts >= gameState.maxReconnectAttempts) {
        updateConnectionStatus('offline', 'Local Mode');
        return;
    }
    
    // Set initial status
    if (gameState.reconnectAttempts === 0) {
        updateConnectionStatus('offline', 'Local Mode');
    }
    
    try {
        gameState.isConnecting = true;
        gameState.reconnectAttempts++;
        
        // Validate and clean WebSocket URL - be extremely aggressive
        let wsUrl = String(CONFIG.WS_URL || 'ws://localhost:8080').trim();
        
        // Remove ALL trailing slashes, spaces, and any path components
        wsUrl = wsUrl.replace(/\/+$/, ''); // Remove trailing slashes
        wsUrl = wsUrl.replace(/\s+.*$/, ''); // Remove everything after first space
        wsUrl = wsUrl.trim();
        
        // Extract only the protocol, hostname, and port using regex
        // Pattern: ws:// or wss:// followed by hostname:port (no path, no trailing slash)
        const cleanUrlMatch = wsUrl.match(/^(wss?:\/\/)([^\/\s:]+)(?::(\d+))?/);
        if (!cleanUrlMatch) {
            console.error('Invalid WebSocket URL format:', wsUrl);
            updateConnectionStatus('offline', 'Invalid server address');
            gameState.isConnecting = false;
            return;
        }
        
        // Reconstruct URL from matched parts - this ensures no trailing slash
        const protocol = cleanUrlMatch[1]; // ws:// or wss://
        const hostname = cleanUrlMatch[2]; // hostname or IP
        const port = cleanUrlMatch[3] || (protocol === 'wss://' ? '443' : '8080'); // port or default
        
        // Build clean URL: protocol + hostname + port (NO trailing slash, NO path)
        wsUrl = `${protocol}${hostname}:${port}`;
        
        // Final validation - URL should be exactly: ws://hostname:port or wss://hostname:port
        // NO trailing slash, NO path, NO extra characters
        if (!/^wss?:\/\/[^\/\s]+:\d+$/.test(wsUrl)) {
            console.error('WebSocket URL format invalid after cleaning:', wsUrl);
            updateConnectionStatus('offline', 'Invalid server address format');
            gameState.isConnecting = false;
            return;
        }
        
        // Log the final URL for debugging
        console.log('Connecting to WebSocket:', wsUrl);
        console.log('URL verification - Last 5 chars:', wsUrl.slice(-5), 'Has trailing slash:', wsUrl.endsWith('/'));
        
        // Create WebSocket - the URL is now guaranteed to be clean
        let ws;
        try {
            ws = new WebSocket(wsUrl);
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            updateConnectionStatus('offline', 'Connection failed');
            gameState.isConnecting = false;
            return;
        }
        
        gameState.ws = ws;
        
        // Set a timeout to give up quickly if connection fails
        const connectionTimeout = setTimeout(() => {
            if (!gameState.connected && ws.readyState === WebSocket.CONNECTING) {
                ws.close();
                gameState.isConnecting = false;
                if (gameState.reconnectAttempts >= gameState.maxReconnectAttempts) {
                    updateConnectionStatus('offline', 'Local Mode');
                }
            }
        }, 2000); // 2 second timeout
        
        ws.onopen = () => {
            clearTimeout(connectionTimeout);
            gameState.connected = true;
            gameState.isConnecting = false;
            gameState.reconnectAttempts = 0; // Reset on successful connection
            gameState.playerId = Math.random().toString(36).substr(2, 9);
            updateConnectionStatus('online', `Connected to ${gameState.serverName || 'Server'}`);
            
            // Send join message with username
            ws.send(JSON.stringify({
                type: 'join',
                playerId: gameState.playerId,
                playerName: gameState.playerName
            }));
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (error) {
                // Silently handle parse errors
            }
        };
        
        ws.onerror = (error) => {
            clearTimeout(connectionTimeout);
            gameState.isConnecting = false;
            // Check if server is running
            updateConnectionStatus('offline', 'Server not running - Start server with: npm start');
            console.log('WebSocket connection error. Make sure the server is running with: npm start');
        };
        
        ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            gameState.connected = false;
            gameState.isConnecting = false;
            
            // Provide helpful message if connection was never established
            if (!gameState.connected && gameState.reconnectAttempts >= gameState.maxReconnectAttempts) {
                updateConnectionStatus('offline', 'Server not running - Click "Host Server" for instructions');
            } else {
                updateConnectionStatus('offline', 'Local Mode');
            }
        };
    } catch (error) {
        // Silently fail - local mode is fine
        gameState.isConnecting = false;
        updateConnectionStatus('offline', 'Local Mode');
    }
}

// Handle WebSocket Messages
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'blockPlaced':
            // Another player placed a block
            if (message.playerId !== gameState.playerId) {
                gameState.grid[message.y][message.x] = message.color;
                drawGrid();
            }
            break;
            
        case 'blockRemoved':
            // Another player removed a block
            if (message.playerId !== gameState.playerId) {
                if (gameState.grid[message.y]) {
                    gameState.grid[message.y][message.x] = null;
                    drawGrid();
                }
            }
            break;
            
        case 'gridState':
            // Receive full grid state
            gameState.grid = message.grid;
            drawGrid();
            break;
            
        case 'playerJoined':
            updatePlayersList(message.players);
            break;
            
        case 'playerLeft':
            updatePlayersList(message.players);
            break;
            
        case 'gridReset':
            initializeGrid();
            gameState.blocksRemaining = CONFIG.INITIAL_BLOCKS;
            gameState.totalPlaced = 0;
            gameState.history = []; // Clear history
            updateUI();
            break;
            
        case 'chatMessage':
            // Receive chat message from another player
            if (message.playerId !== gameState.playerId) {
                addChatMessage(message.playerName || 'Player', message.message, 'other');
            }
            break;
    }
}

// Update Connection Status
function updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.className = `status-indicator ${status}`;
    statusEl.textContent = text;
}

// Update Players List
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    // Handle both old format (array of IDs) and new format (array of objects)
    if (players && players.length > 0) {
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            // Check if new format (object with playerId and playerName)
            if (typeof player === 'object' && player.playerId) {
                const isYou = player.playerId === gameState.playerId;
                playerItem.textContent = isYou ? `You (${player.playerName || 'Unknown'})` : player.playerName || `Player ${player.playerId.substr(0, 6)}`;
            } else {
                // Old format (just player ID string)
                playerItem.textContent = player === gameState.playerId ? 'You' : `Player ${player.substr(0, 6)}`;
            }
            
            playersList.appendChild(playerItem);
        });
    }
}

// Initialize when page loads
window.addEventListener('load', init);

