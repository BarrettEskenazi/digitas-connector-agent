// Sends the page's prompt to Google's free Gemini API and returns JSON.
// The key stays on the server: set GEMINI_API_KEY in Vercel > Settings > Environment Variables.
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const PREFERRED = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];   // known to work on the free plan
let listed = null;
let lastGood = null;

async function candidates(key) {
  const out = [];
  if (process.env.GEMINI_MODEL) out.push(process.env.GEMINI_MODEL);
  if (lastGood) out.push(lastGood);
  out.push(...PREFERRED);
  if (!listed) {
    try {
      const r = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
      const j = await r.json();
      listed = (j.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes("generateContent") &&
          /flash/i.test(m.name) && !/image|tts|audio|live|exp|preview|embed|thinking|omni|pro|latest/i.test(m.name))
        .map(m => m.name.replace(/^models\//, ""))
        .sort((a, b) => (/lite/i.test(b) - /lite/i.test(a)) || b.localeCompare(a));
    } catch (_) { listed = []; }
  }
  out.push(...listed);
  return [...new Set(out)].slice(0, 5);
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch (_) {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === "GET") { res.status(200).json({ ok: !!key }); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }
  if (!key) { res.status(500).json({ code: "no_key", error: "Add GEMINI_API_KEY in Vercel settings." }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const prompt = body && body.prompt;
  if (typeof prompt !== "string" || !prompt || prompt.length > 60000) { res.status(400).json({ error: "Bad request" }); return; }

  let lastErr = { status: 502, code: "upstream", error: "No AI model answered" };
  const tried = [];
  for (const model of await candidates(key)) {
    try {
      const r = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 8192 }
        })
      });
      const j = await r.json().catch(() => ({}));
      const msg = (j.error && j.error.message) || `HTTP ${r.status}`;
      if (!r.ok) {
        console.log(`model ${model} failed: ${r.status} ${msg}`);
        tried.push(`${model}: ${r.status}`);
        lastErr = r.status === 429
          ? { status: 429, code: "rate_limited", error: `${model}: ${msg}` }
          : { status: 502, code: "upstream", error: `${model}: ${msg}` };
        if (r.status === 429 && /limit: 0/.test(msg)) { /* not on free plan */ }
        if (r.status === 400 && /api key/i.test(msg)) break;   // bad key: no point trying others
        continue;                                               // 404 / 429 / 403 / 5xx: try the next model
      }
      const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [])
        .map(p => p.text || "").join("");
      const out = parseJSON(text);
      if (!out) { tried.push(`${model}: incomplete JSON`); lastErr = { status: 502, code: "invalid_json", error: "The AI answer was incomplete" }; continue; }
      lastGood = model;
      res.setHeader("X-Model", model);
      res.status(200).json(out);
      return;
    } catch (e) {
      lastErr = { status: 500, code: "error", error: String((e && e.message) || e) };
    }
  }
  res.status(lastErr.status).json({ code: lastErr.code, error: lastErr.error, tried });
};
