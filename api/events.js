export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

  // Store this connection for broadcasting
  if (!global.sseConnections) {
    global.sseConnections = [];
  }
  
  const clientId = Date.now();
  global.sseConnections.push({ id: clientId, res });

  // Remove connection when client disconnects
  req.on('close', () => {
    global.sseConnections = global.sseConnections.filter(conn => conn.id !== clientId);
    console.log('SSE client disconnected:', clientId);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
  }, 30000); // Send ping every 30 seconds

  req.on('close', () => {
    clearInterval(keepAlive);
  });
}

// Function to broadcast messages to all connected clients
export function broadcastMessage(message) {
  if (!global.sseConnections) return;
  
  const data = JSON.stringify({ type: 'new_message', data: message });
  
  global.sseConnections.forEach(connection => {
    try {
      connection.res.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
    }
  });
}
