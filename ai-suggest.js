/**
 * SkyCast AI — Claude Activity Suggestions Proxy
 * Keeps ANTHROPIC_API_KEY server-side. Accepts weather context,
 * returns AI-generated activity suggestions as JSON.
 */
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors(204, "");
  if (event.httpMethod !== "POST") return cors(405, JSON.stringify({ error: "Method not allowed" }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return cors(500, JSON.stringify({ error: "ANTHROPIC_API_KEY not set on server." }));

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return cors(400, JSON.stringify({ error: "Invalid JSON body." }));
  }

  const { city, country, condition, description, temp, feelsLike, humidity, windKph, visibility } = body;
  if (!city || !condition || temp === undefined) {
    return cors(400, JSON.stringify({ error: "Missing required weather fields." }));
  }

  const prompt = `Current weather in ${city}, ${country}:
- Condition: ${description} (${condition})
- Temperature: ${temp}°C, feels like ${feelsLike}°C
- Humidity: ${humidity}%
- Wind: ${windKph} km/h
- Visibility: ${visibility} km

Suggest exactly 6 activities perfectly suited for these weather conditions. Reply ONLY with a raw JSON array — no markdown, no preamble, no explanation. Each object must have exactly:
- "emoji": a fitting emoji string
- "title": max 5 words
- "description": 1-2 sentences with specific reasoning tied to the actual weather values
- "tag": exactly one of: Outdoor, Indoor, Social, Wellness, Food, Creative`;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) return cors(res.status, JSON.stringify({ error: data.error?.message || "Claude API error." }));

    const raw = (data.content || []).map((c) => c.text || "").join("").trim();
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let activities;
    try {
      activities = JSON.parse(clean);
    } catch {
      return cors(500, JSON.stringify({ error: "AI returned unparseable response.", raw }));
    }

    return cors(200, JSON.stringify({ activities }));
  } catch (err) {
    return cors(502, JSON.stringify({ error: "Failed to reach Claude API." }));
  }
};

function cors(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body,
  };
}
