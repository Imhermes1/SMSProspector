export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { to, message, sender, received_at, type, original_message_id, original_custom_ref } = req.body;
    
    // Log the incoming message
    console.log('Inbound message received:', { to, message, sender, received_at, type, original_message_id, original_custom_ref });
    
    // Validate required fields
    if (!to || !message || !sender) {
      console.error('Missing required fields:', { to, message, sender });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store the message in a simple file-based storage
    // In a production app, you'd use a database
    const fs = require('fs');
    const path = require('path');
    
    try {
      const messagesFile = path.join(process.cwd(), 'data', 'incoming-messages.json');
      const messagesDir = path.dirname(messagesFile);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(messagesDir)) {
        fs.mkdirSync(messagesDir, { recursive: true });
      }
      
      // Read existing messages
      let messages = [];
      if (fs.existsSync(messagesFile)) {
        const fileContent = fs.readFileSync(messagesFile, 'utf8');
        messages = JSON.parse(fileContent);
      }
      
      // Add new message
      const newMessage = {
        id: Date.now(),
        from: sender, // Mobile Message sends 'sender' field
        to: to,
        message: message,
        timestamp: received_at || new Date().toISOString(),
        type: type || 'inbound',
        original_message_id: original_message_id,
        original_custom_ref: original_custom_ref,
        processed: false
      };
      
      messages.push(newMessage);
      
      // Save back to file
      fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
      
      console.log('Message stored successfully:', newMessage);
      
      // Broadcast the message to all connected clients
      try {
        const { broadcastMessage } = await import('./events.js');
        broadcastMessage(newMessage);
        console.log('Message broadcasted to connected clients');
      } catch (broadcastError) {
        console.error('Error broadcasting message:', broadcastError);
      }
    } catch (storageError) {
      console.error('Error storing message:', storageError);
    }
    
    // Check for opt-out keywords
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL'];
    const messageUpper = message.toUpperCase().trim();
    
    if (optOutKeywords.includes(messageUpper)) {
      console.log(`Opt-out request from ${sender}: ${messageUpper}`);
      // Handle opt-out logic here
    }
    
    // For now, just log the message
    console.log(`Message from ${sender} to ${to}: ${message}`);
    
    res.status(200).json({ 
      message: 'OK',
      received: {
        from: sender,
        to: to,
        message,
        timestamp: received_at || new Date().toISOString(),
        type: type || 'inbound'
      }
    });
    
  } catch (error) {
    console.error('Error processing inbound webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
