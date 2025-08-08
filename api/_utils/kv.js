// Minimal Upstash Redis REST helper (no external deps)
// Uses env vars injected by the Upstash for Redis integration:
// - UPSTASH_REDIS_REST_URL
// - UPSTASH_REDIS_REST_TOKEN

function getRestUrl() {
  return (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    ''
  );
}

function getRestToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    ''
  );
}

export function hasKvEnv() {
  return Boolean(getRestUrl() && getRestToken());
}

async function upstashPipeline(commands) {
  const url = getRestUrl();
  const token = getRestToken();
  if (!url || !token) throw new Error('Upstash env vars not configured');

  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ commands })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upstash pipeline error: ${response.status} ${text}`);
  }

  return response.json();
}

// Push a message onto the incoming queue and cap list length
export async function kvPushIncomingMessage(messageObject, max = 1000) {
  const payload = JSON.stringify(messageObject);
  try {
    const res = await upstashPipeline([
      ['LPUSH', 'incoming_messages', payload],
      ['LTRIM', 'incoming_messages', '0', String(max - 1)]
    ]);
    return res;
  } catch (err) {
    console.error('kvPushIncomingMessage error:', err.message);
    throw err;
  }
}

// Pop up to `count` newest messages from the queue (FIFO-ish via LPOP on LPUSHed list)
export async function kvPopIncomingMessages(count = 100) {
  try {
    const res = await upstashPipeline([
      ['LPOP', 'incoming_messages', String(count)]
    ]);
    const first = Array.isArray(res) ? res[0] : res; // [{ result: [...] }]
    const items = (first && first.result) ? first.result : [];
    if (!items || items.length === 0) return [];
    // Items are JSON strings
    return items.map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.error('kvPopIncomingMessages error:', err.message);
    throw err;
  }
}


