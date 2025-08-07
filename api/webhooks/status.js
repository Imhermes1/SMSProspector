export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { to, message, sender, custom_ref, status, message_id, received_at } = req.body;
    
    // Log the status update
    console.log('Status update received:', { 
      to, 
      sender, 
      status, 
      message_id, 
      custom_ref,
      received_at 
    });
    
    // Validate required fields
    if (!to || !status || !message_id) {
      console.error('Missing required fields:', { to, status, message_id });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Here you would typically:
    // 1. Update message status in your database
    // 2. Update your application state
    // 3. Send notifications to your frontend
    // 4. Handle different status types (delivered, failed, etc.)
    
    // Handle different status types
    switch (status.toLowerCase()) {
      case 'delivered':
        console.log(`Message ${message_id} delivered to ${to}`);
        break;
      case 'failed':
        console.log(`Message ${message_id} failed to deliver to ${to}`);
        break;
      case 'sent':
        console.log(`Message ${message_id} sent to ${to}`);
        break;
      default:
        console.log(`Message ${message_id} status: ${status} for ${to}`);
    }
    
    res.status(200).json({ 
      message: 'OK',
      status_update: {
        to,
        status,
        message_id,
        timestamp: received_at || new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error processing status webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
