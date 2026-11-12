# Digitas Connector Agent (BUS 365 prototype)

Student prototype; not a Digitas product. Do not enter confidential information.
The dark, self-contained `index.html` runs without a build step or database. Host on
Vercel Hobby. Use only Groq / Gemini free-tier accounts; do not enable paid billing.

## Digitas coordinator workflow

The default workspace starts empty and explicitly identifies the user as a
Digitas coordinator. Publicis Groupe is the parent network; sister agencies
are delivery partners. Enter a company name in the company box or chat; a goal
and budget are optional. Existing examples and the separate prototype ROI model
remain available, with the PepsiCo example and its two sources preserved.

1. Identify the company. `POST /api/agent` with
   `{"action":"research","company":"Nike"}` runs without AI credentials.
   `lib/company.js` supplies cited, maintained identities for Nike, Chase,
   Toyota and RentAHuman, and searches the free Wikipedia API for other
   matching company names. Unrelated matches are rejected. A missing match is
   shown as provisional, with a request for an official website/description;
   the app does not claim an invented company identity is verified.
2. Build a Digitas-led proposal using the identified business as evidence.
   Fast free-tier Groq models are preferred, with low reasoning effort for GPT-OSS; Gemini is fallback. The full response includes strategy,
   scope, agency recommendations, deliverables, a phased plan, KPIs and fees.
   Source-backed company descriptions are retained instead of overwritten by
   model guesses. The user can explicitly change the lead afterward.
3. Show the complete client budget: agency delivery fees + paid media +
   external production/tools + client contingency. A supplied **budget** is
   treated as the total client investment; an explicitly supplied **fee** is
   treated as agency fee revenue. The total-budget control scales the four
   components together. Each component and agency fee is also editable.
4. Split agency fees by workstream and show hours × estimated internal cost,
   delivery reserve and contribution before overhead/tax. Media, suppliers and
   client contingency are excluded from agency fee shares. The six-section
   agreement and full-copy export follow the current plan and finances.

All proposed scopes, rates, targets, fee splits and project budgets are estimates;
they are not the company's actual spend or quoted agency prices. Relationships
and scope must be confirmed before use. Public-source identity is distinct from
an assumed marketing opportunity. No confidential information should be entered.

Local drafts, commands, all chips and 1–3 critique rounds remain usable when AI
or lookup is unavailable. Invalid or stale AI answers cannot overwrite edits.
Full responses accept wrapped/unwrapped JSON, normalize known agency aliases,
and validate Publicis-only agencies, Digitas scope, scores, RACI and four phases.
Shares normalize to 100%. Capability checks keep creative production with Digitas rather than media-buying agencies and remove invented numeric baselines from KPI arrows. Concise three-stream replies receive an explicit
Digitas governance workstream. An identified sector also updates the offline draft; RentAHuman receives a concrete task-buyer and human-worker activation plan even if AI fails. Full generation is capped at 4,500 output tokens. Lookup has a 4-second server / 5.5-second client
limit. Full AI requests have a 25-second server / 28-second client limit, below
Vercel's 60-second function limit. No paid search, database, service or build step
is required; Wikipedia lookups and maintained company profiles need no new key.

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

`tests/api.test.js` and `tests/company.test.js` cover company identification,
rejection of unrelated search results, lookup failure, configuration/input validation, Groq preference,
Gemini fallback, one 503 retry, unavailable/zero-quota model cooldown, invalid
JSON and timeout of a hung response body. No real keys are used.

`tests/demo.spec.js` covers Nike, Chase, Toyota, Acme Widgets, rentahuman ai,
the detailed $500,000 social brief, all chips, lead/add/remove/fee/greeting chat
commands, 1/2/3 critique rounds, PepsiCo citations, manual share edits, External
and ROI smoke tests, complete AI proposals, financial calculations, malformed proposals and stale replies. It runs in Chromium
and WebKit at desktop and 390px phone width, checking JavaScript errors and
page overflow. WebKit is Safari's engine; this is not a manual Safari-app test.
