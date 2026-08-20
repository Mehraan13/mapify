# AGENTS.md — Agent guidance for this repository

Purpose: Help AI coding agents be productive in this Vite + React project by providing quick commands, key links, conventions, and safety notes. Keep this file minimal and link to existing docs for details.

Quick Commands
- **Install:** `npm ci` or `npm install`
- **Dev:** `npm run dev` — starts Vite dev server
- **Build:** `npm run build` — create production build
- **Preview:** `npm run preview` — serve built site
- **Lint:** `npm run lint` — runs `oxlint` (see [.oxlintrc.json](.oxlintrc.json))

Key Files (quick links)
- [README.md](README.md)
- [package.json](package.json)
- [vite.config.js](vite.config.js)
- [index.html](index.html)
- [src/main.jsx](src/main.jsx)
- [src/App.jsx](src/App.jsx)
- [src/index.css](src/index.css)
- [.oxlintrc.json](.oxlintrc.json)
- [public/](public/)

Project conventions & notes
- **Framework:** React + Vite (ESM). Use `import` and modern JS.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite`. Additional CSS is in `src/index.css`.
- **Env vars:** Vite env pattern (`VITE_`) — access via `import.meta.env`.
- **Animations & flow:** Uses `motion` and `@xyflow/react` in `src/App.jsx`.
- **Linter:** `oxlint` configured via `.oxlintrc.json`.

Safety & pitfalls for agents
- There is a local `.env.local` containing `VITE_GEMINI_API_KEY` (do not commit). Avoid editing or committing secrets — prefer a server-side proxy for API keys.
- Some imports used in `src/App.jsx` (e.g., `@xyflow/react`, `html-to-image`) may not be listed in `package.json`. If a runtime error occurs, check and add missing dependencies instead of guessing versions.

Agent workflow recommendations
- When changing code, run `npm ci && npm run dev` locally to validate behavior.
- For dependency changes, update `package.json` and run `npm ci`; prefer exact versions if uncertain.
- For any network/API changes, do not add secrets to the repo. Create a short issue instead recommending a server-side proxy.

Suggested next customizations
- Create `.github/copilot-instructions.md` with contributor-level onboarding and CI commands.
- Add a small skill to verify missing dependencies against imports (`detect-missing-deps`).
- Add a hook that warns about committed `.env.local` or exposed `VITE_` keys.

If you want, I can create `.github/copilot-instructions.md` or the dependency-check skill next.
