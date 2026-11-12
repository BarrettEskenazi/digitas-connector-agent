// Serverless function: sends the page's prompt to Google's free Gemini API and returns JSON.
// The API key stays on the server (set GEMINI_API_KEY in Vercel's Environment Variables).
const BASE = "https://generativelanguage.googleapis.com/v1beta";
let cachedModel = null;

async function pickModel(key) {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (cachedModel) return cachedModel;
  try {
    const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
    const j = await r.json();
    const models = (j.models || []).filter(m =>
      (m.supportedGenerationMethods || []).includes("generateContent") &&
      /flash/i.test(m.name) && !/image|tts|audio|live|exp|preview|embed/i.test(m.name));
    models.sort((a, b) => (/lite/i.test(a.name) - /lite/i.test(b.name)) || b.name.localeCompare(a.name));
    cachedModel = models[0] ? models[0].name.replace(/^models\//, "") : "gemini-flash-latest";
  } catch (_) {
    cachedModel = "gemini-flash-latest";
  }
  return cachedModel;
}

module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === "GET") { res.status(200).json({ ok: !!key }); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }
  if (!key) { res.status(500).json({ code: "no_key", error: "Add GEMINI_API_KEY in Vercel settings." }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const prompt = body && body.prompt;
  if (typeof prompt !== "string" || !prompt || prompt.length > 60000) {
    res.status(400).json({ error: "Bad request" }); return;
  }

  try {
    const model = await pickModel(key);
    const r = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
      })
    });
    const j = await r.json();
    if (r.status === 429) { res.status(429).json({ code: "rate_limited", error: "Free limit reached" }); return; }
    if (!r.ok) {
      if (r.status === 404) cachedModel = null;
      res.status(502).json({ code: "upstream", error: (j.error && j.error.message) || "AI error" }); return;
    }
    const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [])
      .map(p => p.text || "").join("");
    let out;
    try { out = JSON.parse(text); }
    catch (_) {
      const m = text.match(/\{[\s\S]*\}/);
      try { out = JSON.parse(m[0]); }
      catch (e) { res.status(502).json({ code: "invalid_json", error: "The AI answer was incomplete" }); return; }
    }
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ code: "error", error: String((e && e.message) || e) });
  }
};
