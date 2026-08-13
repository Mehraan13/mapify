# Mapify

Turn any block of text into a clean, minimal mind map — instantly.

## Why this exists

This started after watching a video by Ali Abdaal on spider maps as a study
technique — the idea that looking at everything you've learned on a topic
laid out at a high level, as a web of connected ideas, mirrors how your mind
actually works. Your brain doesn't store facts in a list; it links concepts
together. A spider map just puts that on paper.

Mapify is a small tool to do that instantly: paste in whatever you're
studying, and get a clean visual map of the core ideas and how they connect
— minimal and fast enough that you'd actually use it, and simple enough to
screenshot straight into your notes.

## Features

- Paste any text and generate a visual mind map from the core concepts
- Uses Google Gemini to extract a central topic plus meaningful related branches
- Minimal editorial-style layout with soft shadows and premium typography
- Drag, pan, zoom, and connect nodes on the canvas
- Edit node labels, add notes, and expand concepts from the original text
- Label relationships between ideas and export the map as PNG or Markdown
- Keep a local history of recent maps in the browser

## Tech stack

- **React + Vite** — app framework and dev tooling
- **Tailwind CSS v4** — styling
- **React Flow (`@xyflow/react`)** — interactive node/edge canvas
- **Motion** — screen transitions and panel animations
- **Google Gemini API** — concept extraction and concept expansion

## Getting started

```bash
npm install
```

Create a `.env.local` file in the project root with your own Gemini API key (get one at [aistudio.google.com](https://aistudio.google.com)):

```bash
VITE_GEMINI_API_KEY=your_key_here
```

Do not commit `.env.local` to version control.

## Development workflow

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

- `npm run dev` starts the Vite app locally
- `npm run build` creates a production build
- `npm run preview` serves the built app
- `npm run lint` runs the repository linter

## How the app works

1. Paste a text passage into the input screen.
2. Gemini extracts the main topic and related concepts.
3. The app converts that structure into a node-and-edge graph.
4. You can refine the map by renaming nodes, adding notes, labeling relationships, and expanding concepts from the original text.
5. Export the map as a PNG or export your notes as Markdown.

## Planned improvements

- Add a clearer project-level architecture section and diagram
- Improve persistence and import/export UX
- Add a server-side proxy for Gemini requests to avoid exposing the API key in client code
- Add a more formal test suite and smoke checks

## License

Not licensed yet — add an MIT license if you'd like to make reuse terms explicit later.


