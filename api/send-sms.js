export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { messages, apiConfig } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!apiConfig || !apiConfig.key || !apiConfig.secret || !apiConfig.endpoint) {
      return res.status(400).json({ error: 'API configuration is required' });
    }

    // Create Basic Auth header
    const credentials = Buffer.from(`${apiConfig.key}:${apiConfig.secret}`).toString('base64');
    
    // Mobile Message payload
    const payload = {
      messages: messages.map(msg => {
        let phoneNumber = msg.to;
        if (phoneNumber.startsWith('+61')) {
          phoneNumber = '0' + phoneNumber.substring(3); // +61412345678 -> 0412345678
        } else if (phoneNumber.startsWith('61')) {
          phoneNumber = '0' + phoneNumber.substring(2); // 61412345678 -> 0412345678
        }
        return {
          to: phoneNumber,
          message: msg.message,
          sender: msg.sender || 'SMSProspector',
          custom_ref: msg.custom_ref || `msg_${Date.now()}`
        };
      })
    };

    console.log('Sending to Mobile Message API:', {
      endpoint: apiConfig.endpoint,
      messageCount: messages.length,
      firstMessage: messages[0],
      credentials: `${apiConfig.key}:***`
    });

    // Make the API call to Mobile Message
    console.log('Making fetch request to:', apiConfig.endpoint);
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Mobile Message API error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      let errorMessage = 'Failed to send message';
      if (response.status === 401) {
        errorMessage = 'Invalid API credentials';
      } else if (response.status === 403) {
        errorMessage = 'Insufficient credits or unauthorized sender ID';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded';
      } else if (responseData.error) {
        errorMessage = responseData.error;
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: responseData
      });
    }

    console.log('Mobile Message API success:', responseData);

    // Mobile Message success path
    if (responseData.status === 'complete' && responseData.results) {
      const failedMessages = responseData.results.filter(result => result.status !== 'success');
      if (failedMessages.length > 0) {
        return res.status(400).json({ error: 'Some messages failed to send', details: responseData, failedMessages });
      }
      return res.status(200).json({ success: true, message: 'Messages sent successfully', data: responseData });
    }
    return res.status(200).json({ success: true, data: responseData });

  } catch (error) {
    console.error('Error sending SMS:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
