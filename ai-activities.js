/**
 * Netlify Serverless Function — Claude AI Activities Proxy
 * Securely proxies requests to Anthropic's Claude API.
 * The ANTHROPIC_API_KEY environment variable is never exposed to the browser.
 *
 * POST /api/ai-activities
 * Body: { weather: { name, country, temp, feelsLike, humidity, wind, visibility, description } }
 */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI API key not configured on server.' }) };
  }

  let weather;
  try {
    const body = JSON.parse(event.body || '{}');
    weather = body.weather;
    if (!weather) throw new Error('Missing weather data');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const prompt = `Current weather in ${weather.name}, ${weather.country}:
- Condition: ${weather.description}
- Temperature: ${weather.temp}°C (feels like ${weather.feelsLike}°C)
- Humidity: ${weather.humidity}%
- Wind: ${weather.wind} km/h
- Visibility: ${weather.visibility} km

Suggest exactly 6 activities perfectly suited to these conditions. Return ONLY a valid JSON array — no markdown, no explanation. Each object must have:
- emoji (a single relevant emoji)
- title (max 5 words)
- description (1-2 sentences with specific reasoning tied to the actual weather data)
- tag (exactly one: Outdoor | Indoor | Social | Wellness | Food | Creative)`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Anthropic API error:', data);
      return { statusCode: res.status, headers, body: JSON.stringify({ error: data.error?.message || 'AI service error' }) };
    }

    const text = (data.content || []).map(c => c.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const activities = JSON.parse(clean);

    return { statusCode: 200, headers, body: JSON.stringify({ activities }) };
  } catch (err) {
    console.error('AI proxy error:', err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to reach AI service.' }) };
  }
};
