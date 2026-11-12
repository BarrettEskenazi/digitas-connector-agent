// Optional free-tier enhancement. Credentials never leave the server.
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const GROQ = 'https://api.groq.com/openai/v1';
const blocked = new Map();
const catalogs = new Map();
const TOTAL_MS = 17000;
async function request(url, options, deadline, cap = 5500) {
  const remaining = Math.min(cap, deadline - Date.now());
  if (remaining <= 0) throw new Error('deadline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const r = await fetch(url, {...options, signal: controller.signal});
    return {status:r.status, ok:r.ok, body:await r.json()};
  } finally { clearTimeout(timer); }
}
async function models(provider, key, deadline) {
  const cached = catalogs.get(provider);
  if (cached && cached.until > Date.now()) return cached.ids;
  const groq = provider === 'groq';
  const r = await request(`${groq ? GROQ : GEMINI}/models`, {headers:groq ? {Authorization:`Bearer ${key}`} : {'x-goog-api-key':key}}, deadline, 1500);
  if (!r.ok) throw new Error('catalog unavailable');
  const ids = groq ? (r.body.data || []).map(m=>m.id) : (r.body.models || []).filter(m=>(m.supportedGenerationMethods || []).includes('generateContent')).map(m=>m.name.replace(/^models\//,''));
  catalogs.set(provider, {ids, until:Date.now()+300000});
  return ids;
}
function parseJSON(text) {
  try {
    const value = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch (_) { return null; }
}
async function tryProvider(provider, key, deadline, tried) {
  if (!key) return null;
  const groq = provider === 'groq';
  const preferred = groq ? ['llama-3.3-70b-versatile','openai/gpt-oss-120b','llama-3.1-8b-instant'] : ['gemini-3.5-flash-lite','gemini-3.1-flash-lite'];
  const override = groq ? process.env.GROQ_MODEL : process.env.GEMINI_MODEL;
  let available;
  try { available = await models(provider, key, deadline); } catch (_) { available = preferred; }
  // Only known text models or an explicit operator override; never enumerate paid-only models.
  const candidates = [...new Set([override,...preferred].filter(m=>m && (m===override || available.includes(m))))];
  for (const model of candidates) {
    const id = `${provider}:${model}`;
    if ((blocked.get(id)||0)>Date.now()) continue;
    for (let attempt=0; attempt<2 && Date.now()<deadline; attempt++) {
      try {
        const r = await request(groq ? `${GROQ}/chat/completions` : `${GEMINI}/models/${encodeURIComponent(model)}:generateContent`, {
          method:'POST', headers:groq ? {'Content-Type':'application/json',Authorization:`Bearer ${key}`} : {'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify(groq ? {model,messages:[{role:'user',content:tried.prompt}],response_format:{type:'json_object'},temperature:0.3,max_completion_tokens:tried.fullProposal?6500:1200} : {contents:[{role:'user',parts:[{text:tried.prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.3,maxOutputTokens:tried.fullProposal?6500:1200}})
        }, deadline, tried.fullProposal?16000:5500);
        if (!r.ok) {
          tried.push(`${id}: ${r.status}`);
          if ([401,403].includes(r.status)) return null;
          if (r.status===404 || r.status===429) blocked.set(id,Date.now()+(r.status===404 || /limit[:\s]+0\b/i.test(r.body.error?.message||'') ? 3600000 : 60000));
          if (r.status===503 && attempt===0 && deadline-Date.now()>350) { await new Promise(resolve=>setTimeout(resolve,250)); continue; }
          break;
        }
        const text = groq ? r.body.choices?.[0]?.message?.content : r.body.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('');
        const out = typeof text==='string' && parseJSON(text);
        if (out) return {out,model};
        tried.push(`${id}: invalid_json`);
        break;
      } catch (_) { tried.push(`${id}: timeout_or_network`); break; }
    }
  }
  return null;
}
async function tryGroq(key, deadline, tried) { return tryProvider('groq',key,deadline,tried); }
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  const groq = process.env.GROQ_API_KEY, gemini = process.env.GEMINI_API_KEY;
  if (req.method==='GET') return res.status(200).json({ok:!!(groq||gemini),configured:{groq:!!groq,gemini:!!gemini}});
  if (req.method!=='POST') { res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'Use POST'}); }
  let body=req.body;
  if (typeof body==='string') { try { body=JSON.parse(body); } catch (_) { body=null; } }
  if (typeof body?.prompt!=='string' || !body.prompt.trim() || body.prompt.length>16000) return res.status(400).json({code:'bad_request',error:'Invalid prompt'});
  if (!groq&&!gemini) return res.status(503).json({code:'no_key',error:'Live tailoring is unavailable; use the instant draft.',tried:[]});
  const deadline=Date.now()+(body.fullProposal===true?25000:TOTAL_MS), tried=[];
  tried.prompt=body.prompt;tried.fullProposal=body.fullProposal===true;
  const result=await tryGroq(groq,Math.min(deadline,Date.now()+(tried.fullProposal?18000:10000)),tried) || await tryProvider('gemini',gemini,deadline,tried);
  if (result) { res.setHeader('X-Model',result.model); return res.status(200).json(result.out); }
  return res.status(503).json({code:'unavailable',error:'Live tailoring is busy; the instant draft is ready.',tried});
};
