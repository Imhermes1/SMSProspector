export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { from, message, timestamp } = req.body;
    
    // Log the incoming message
    console.log('Inbound message received:', { from, message, timestamp });
    
    // Validate required fields
    if (!from || !message) {
      console.error('Missing required fields:', { from, message });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Here you would typically:
    // 1. Store the message in your database
    // 2. Update your application state
    // 3. Send notifications to your frontend
    // 4. Handle opt-out keywords (STOP, UNSUBSCRIBE, etc.)
    
    // Check for opt-out keywords
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL'];
    const messageUpper = message.toUpperCase().trim();
    
    if (optOutKeywords.includes(messageUpper)) {
      console.log(`Opt-out request from ${from}: ${messageUpper}`);
      // Handle opt-out logic here
    }
    
    // For now, just log the message
    console.log(`Message from ${from}: ${message}`);
    
    res.status(200).json({ 
      message: 'OK',
      received: {
        from,
        message,
        timestamp: timestamp || new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error processing inbound webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
