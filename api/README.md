# SMS Prospector API Routes

This directory contains the API routes for the SMS Prospector application, specifically for handling webhooks from Mobile Message.

## Webhook Endpoints

### `/api/webhooks/inbound`
Handles incoming SMS messages from Mobile Message.

**Method:** POST  
**Content-Type:** application/json

**Request Body:**
```json
{
  "from": "+61412345678",
  "message": "Hello, this is a test message",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "message": "OK",
  "received": {
    "from": "+61412345678",
    "message": "Hello, this is a test message",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### `/api/webhooks/status`
Handles delivery status updates from Mobile Message.

**Method:** POST  
**Content-Type:** application/json

**Request Body:**
```json
{
  "to": "+61412345678",
  "message": "Hello, this is a test message",
  "sender": "SMSProspector",
  "custom_ref": "msg_1234567890",
  "status": "delivered",
  "message_id": "abcd1234-efgh-5678-ijkl-9876543210mn",
  "received_at": "2025-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "message": "OK",
  "status_update": {
    "to": "+61412345678",
    "status": "delivered",
    "message_id": "abcd1234-efgh-5678-ijkl-9876543210mn",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

## Configuration

These webhook URLs should be configured in your Mobile Message dashboard:

- **Inbound Messages:** `https://sms-prospector.vercel.app/api/webhooks/inbound`
- **Status Updates:** `https://sms-prospector.vercel.app/api/webhooks/status`

## Status Types

The status webhook handles various delivery statuses:
- `sent` - Message has been sent to the carrier
- `delivered` - Message has been delivered to the recipient
- `failed` - Message delivery failed
- `pending` - Message is pending delivery

## Opt-out Keywords

The inbound webhook automatically detects opt-out keywords:
- `STOP`
- `UNSUBSCRIBE`
- `QUIT`
- `CANCEL`

## Error Handling

Both endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing required fields)
- `405` - Method Not Allowed (non-POST requests)
- `500` - Internal Server Error
