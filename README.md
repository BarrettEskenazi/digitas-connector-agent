# Digitas Connector Agent (BUS 365 prototype)

Free to run: the page is hosted on Vercel's free plan, and the AI is Google's free Gemini API.

1. Get a free key at https://aistudio.google.com/apikey (Google sign-in, no credit card).
2. Create a GitHub repo and upload these files (keep the `api` folder).
3. On https://vercel.com (sign in with GitHub, Hobby plan), click Add New > Project, import the repo.
4. Before deploying, add Environment Variable `GEMINI_API_KEY` = your key. Click Deploy.
5. Open the link Vercel gives you. The badge should say "Live AI".

Optional: set `GEMINI_MODEL` to a model name from AI Studio if the default choice fails.
Free-tier prompts may be used by Google to improve its products, so don't enter confidential information.
