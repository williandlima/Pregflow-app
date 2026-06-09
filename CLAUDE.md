# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running Locally

No build step or package manager — serve the static files directly:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080`. There are no tests, no linter config, and no CI pipeline.

## Architecture

Pregflow Pro is a **zero-dependency vanilla JavaScript PWA** for sermon editing and presentation. The entire app lives in four files:

- `index.html` — full HTML structure including all screen markup and inline SVG icons
- `styles.css` — design system (CSS variables) + all component styles
- `app.js` — all application logic (~1400 lines, `'use strict'`)
- `service-worker.js` — offline cache strategy

### Screen Navigation

The UI has three named screens (`homeScreen`, `editorScreen`, `preachScreen`) and a `splash`. Navigation uses `showScreen(id)` which toggles `.active` on `#appContainer > .screen` elements. Modals (Bible, Settings, AI Study) are fixed overlays toggled independently via their own `toggle*()` functions.

### State Management

All runtime state lives in a single global `STATE` object:

```js
STATE = { sermons: [], currentId: null, timer: null, seconds: 0, isRunning: false }
```

Persistence is entirely via `localStorage`:
- `pregflow_db` — JSON array of sermon objects
- `pregflow_theme` — `'dark'` or absent
- `pregflow_api_key` — Claude (Anthropic) API key

`loadDB()` / `saveDB()` handle serialization. Auto-save is debounced 800ms via `triggerSave()` → `performSave()`. Undo history is capped at 30 snapshots in `undoStack[]`.

### Sermon & Block Data Model

```js
// Sermon
{ id: Number, title: String, ref: String, content: Block[], updated: Number }

// Block
{ type: String, text: String, done: Boolean }
```

Block types: `p`, `h1`, `h2`, `h3`, `topic`, `subtopic`, `bullet`, `quote`, `warn`, `box`.

The editor renders blocks as `contentEditable` divs. `createBlockUI(type, text, after, done)` builds each block element and wires its events. `applyFormat(e, type)` converts a focused block to a new type in-place. `updateOutlineNumbers()` auto-numbers `topic` (e.g. `1.`) and `subtopic` (e.g. `1.1`) blocks after any structural change.

### Service Worker Cache

Cache name is `pregflow-v{N}` — **increment `N` in `service-worker.js` whenever static assets change** to bust the cache on next visit. Strategy:
- Cache-first for all local static assets
- Network-first for `bible-api.com` and `api.anthropic.com` requests
- Stale-while-revalidate for Google Fonts

### AI Integration

Uses Claude (`claude-opus-4-8`) via `https://api.anthropic.com/v1/messages`. The user supplies their own Anthropic API key (stored in `pregflow_api_key`; obtain at `console.anthropic.com`). Browser-side requests require the `anthropic-dangerous-direct-browser-access: true` header. Two generation modes: cell group study guide and daily devotional. The markdown response is rendered to HTML by a local `markdownToHtml()` function — no external markdown library.

Service worker treats `api.anthropic.com` as network-first (never cached).

### Design System

Purple primary (`#7C3AED`) with CSS custom properties at `:root` for all colors. Dark mode applies via `body.dark` class toggle, which overrides the same variables. Font stack: Inter (UI) and Merriweather (preach reading view), both loaded from Google Fonts.

## Conventions

- **Language**: All UI text, HTML IDs, CSS class names, and function/variable names are in **Portuguese (pt-BR)**.
- **No modules**: `app.js` is a single flat file. All functions are globally scoped. Do not introduce ES modules or bundlers.
- **DOM pattern**: Prefer `innerHTML` for building UI; use `insertBefore` / `parentNode` for DOM manipulation. Avoid frameworks.
- **Event handling**: Static UI elements are bound in `bindEvents()` on `DOMContentLoaded`. Dynamic elements (blocks) receive their listeners in `createBlockUI()`.
- **Toast notifications**: User feedback goes through `showToast(message)` — bottom-center, auto-dismiss at 2.8s. Do not use `alert()`.
