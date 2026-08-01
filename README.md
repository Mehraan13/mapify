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

- Paste any text, get an instant visual mind map of its core concepts
- Central topic + key related ideas extracted automatically (Google Gemini)
- Minimal, editorial-style design — soft shadows, premium typography, no clutter
- Drag, pan, zoom, and manually connect nodes on the canvas
- Smooth transition between the input screen and the generated map

## Tech stack

- **React + Vite** — app framework and dev tooling
- **Tailwind CSS v4** — styling
- **React Flow (`@xyflow/react`)** — the interactive node/edge canvas
- **Motion** — screen transition animation
- **Google Gemini API** — text-to-concepts extraction

## Getting started

```bash
git clone https://github.com/Mehraan13/mapify.git
cd mapify
npm install
```

Create a `.env.local` file in the project root with your own free Gemini API
key (get one at [aistudio.google.com](https://aistudio.google.com)):
VITE_GEMINI_API_KEY=your_key_here

Then run it:

```bash
npm run dev
```

## Roadmap

Being built incrementally, one feature at a time:

- [ ] Reset / back-to-input button
- [ ] Click a node to see a short explanation of that concept
- [ ] Click a node to expand it into a deeper sub-map
- [ ] Relationship labels on the connecting edges
- [ ] Export the map as an image
- [ ] Editable node labels
- [ ] Local history of past maps

## License

Not licensed yet — add an MIT license if you'd like to make reuse terms explicit later.