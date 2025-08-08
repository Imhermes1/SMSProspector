export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Prefer shared KV (Upstash) if configured
    let useKv = false;
    try {
      const { hasKvEnv } = await import('./_utils/kv.js');
      useKv = hasKvEnv();
    } catch {}
    if (useKv) {
      try {
        const { kvPopIncomingMessages } = await import('./_utils/kv.js');
        const popped = await kvPopIncomingMessages(100);
        res.setHeader('Cache-Control', 'no-store');
        console.log('[KV] get-incoming-messages popped:', Array.isArray(popped) ? popped.length : 0);
        return res.status(200).json({ messages: popped, total: popped.length, unprocessed: popped.length });
      } catch (kvErr) {
        console.error('KV read failed, falling back to /tmp:', kvErr);
      }
    }

    const fs = require('fs');
    const path = require('path');
    
    // Read from /tmp to match where the webhook writes in serverless
    const messagesFile = path.join('/tmp', 'incoming-messages.json');
    
    if (!fs.existsSync(messagesFile)) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ messages: [] });
    }
    
    const fileContent = fs.readFileSync(messagesFile, 'utf8');
    const messages = JSON.parse(fileContent);
    
    // Return unprocessed messages
    const unprocessedMessages = messages.filter(msg => !msg.processed);
    console.log('[TMP] get-incoming-messages unprocessed:', unprocessedMessages.length);
    
    // Mark messages as processed
    messages.forEach(msg => {
      if (!msg.processed) {
        msg.processed = true;
      }
    });
    
    // Save updated messages
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ 
      messages: unprocessedMessages,
      total: messages.length,
      unprocessed: unprocessedMessages.length
    });
    
  } catch (error) {
    console.error('Error fetching incoming messages:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
