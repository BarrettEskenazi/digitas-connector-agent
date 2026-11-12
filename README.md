# Digitas Connector Agent (BUS 365 prototype)

Student prototype; not a Digitas product. Do not enter confidential information.
The dark, self-contained `index.html` runs without a build step or database. Host on
Vercel Hobby. Use only Groq / Gemini free-tier accounts; do not enable paid billing.

## Demo behavior

Internal company drafts, chat commands, all four chips, and 1–3 critique rounds
work locally even when AI is unavailable. Drafts are hypothetical and based on
general public knowledge. Verify assumptions before using them. Editing a share
redistributes the remainder to keep 100%; fees, team changes and shares update
the agreement. R/A appears when an agency holds both roles. PepsiCo source links
are retained after changes; the original example and citations remain intact.

AI is an optional wording enhancement. It receives a compact draft and may change
only need, ranking reasons and workstream names. It cannot replace agencies,
RACI, scores, fees, shares, source attribution or contract structure. Sections 2
and 3 are filled from the local plan. Editing while AI runs discards stale replies.
The client stops waiting after 19 seconds; the server has a 17-second total budget
(including discovery, response bodies and retries), well below Vercel's 60 seconds.
Groq is preferred, with up to 10 seconds before Gemini fallback. A 503 is retried
once after 250ms. Unavailable/zero-quota models are temporarily skipped within a
warm function instance; cold instances must discover availability again.

## Vercel settings

- Framework: Other. No build command is required; serve the repository root.
- Keep Vercel Hobby and `vercel.json`'s 60-second function limit.
- Add `GROQ_API_KEY` from a **free-tier** Groq account to Production (Preview optional).
- Keep `GEMINI_API_KEY` from free Google AI Studio as fallback.
- Optional `GROQ_MODEL` / `GEMINI_MODEL`: exact text-model ID enabled on your free
  account. Remove stale overrides if they fail. Model discovery does not prove
  quota is available. See [Groq models](https://console.groq.com/docs/models) and
  [Gemini models](https://ai.google.dev/gemini-api/docs/models).
- Redeploy after changing environment variables. Never add keys to HTML or Git.
- `GET /api/agent` reports configured providers only, **not** proven availability.
- `POST /api/agent` with `{"prompt":"Return JSON {\"ok\":true}"}` tests generation.
  A successful response includes `X-Model`; failures return a safe message and
  model/status diagnostics without provider error bodies or credentials.

No paid service, database, runtime package, or build dependency was added.
The root-level duplicate `agent.js` was removed; `api/agent.js` is the endpoint.

## Tests (development only)

Node 18+ and Playwright are required for browser tests; neither is a site build step.

```sh
npm install
npx playwright install chromium webkit
npm test
npm run test:demo
```

`tests/api.test.js` covers configuration/input validation, Groq preference,
Gemini fallback, one 503 retry, unavailable/zero-quota model cooldown, invalid
JSON and timeout of a hung response body. No real keys are used.

`tests/demo.spec.js` covers Nike, Chase, Toyota, Acme Widgets, rentahuman ai,
the detailed $500,000 social brief, all chips, lead/add/remove/fee/greeting chat
commands, 1/2/3 critique rounds, PepsiCo citations, manual share edits, External
and ROI smoke tests, safe AI patches and stale replies. It runs in Chromium
and WebKit at desktop and 390px phone width, checking JavaScript errors and
page overflow. WebKit is Safari's engine; this is not a manual Safari-app test.
