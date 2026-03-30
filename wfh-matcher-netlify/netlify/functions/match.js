const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { role, industry, experience, prefs, timezone, extra } = body;

  if (!role || !industry || !experience) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  const prompt = `You are a remote job placement expert for The Official WFH Club, a brand that helps people transition from phone-heavy roles (call centers, healthcare, banking, insurance) into non-phone remote corporate positions.

A user has submitted this profile:
- Current/recent role: ${role}
- Industry: ${industry}
- Experience: ${experience}
- What they want: ${prefs && prefs.length ? prefs.join(', ') : 'Not specified'}
- Timezone: ${timezone || 'Not specified'}
- Additional context: ${extra || 'None'}

Based on this profile, recommend exactly 5 remote-friendly companies this person should target. These should be real, well-known companies known for hiring remote workers in non-phone roles (e.g., customer success, account management, operations, data entry, billing, admin, QA, claims, scheduling, etc.).

Respond ONLY with a valid JSON array. No preamble, no markdown, no explanation outside the JSON. Format:

[
  {
    "name": "Company Name",
    "type": "Role type they'd qualify for",
    "why": "2-3 sentences explaining exactly why this company fits this person's specific background. Be direct and specific — reference their actual role, industry, or preferences.",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

Tags should be short (2-3 words max): things like "No Phones", "Async OK", "Benefits", "Entry Level", "Healthcare Background", "Finance Background", "Flexible Hours", etc.

Make the "why" feel personal and specific — not generic. Speak directly to their transition from ${industry} into remote corporate work.`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content.map((b) => b.text || "").join("").trim();
    const clean = raw.replace(/```json|```/g, "").trim();
    const matches = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong. Please try again." }),
    };
  }
};
