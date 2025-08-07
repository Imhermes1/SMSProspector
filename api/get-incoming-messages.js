export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const messagesFile = path.join(process.cwd(), 'data', 'incoming-messages.json');
    
    if (!fs.existsSync(messagesFile)) {
      return res.status(200).json({ messages: [] });
    }
    
    const fileContent = fs.readFileSync(messagesFile, 'utf8');
    const messages = JSON.parse(fileContent);
    
    // Return unprocessed messages
    const unprocessedMessages = messages.filter(msg => !msg.processed);
    
    // Mark messages as processed
    messages.forEach(msg => {
      if (!msg.processed) {
        msg.processed = true;
      }
    });
    
    // Save updated messages
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    
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
