<div align="center">

# KuroEditor

**Dark-mode-only WYSIWYG editor in Vanilla JS**

[![License](https://img.shields.io/badge/license-Kuro%20License-blue.svg)](LICENSE.txt)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-38bdf8)](https://tailwindcss.com/)
[![No deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](#)

**English** | [日本語](README.ja.md)

Zero external JS libraries — an embeddable WYSIWYG editor that runs by loading a single `kuro-editor.js` file.

### 🌐 [Showcase](https://kuro.boo/kuroeditor/) &nbsp;·&nbsp; 🎮 [Live sample](https://kuro.boo/kuroeditor/sample/) &nbsp;·&nbsp; 🏠 [Author: Kuro.Boo](https://kuro.boo/)

</div>

---

## ⚠️ v2.0.0 — CSS architecture v2 (stronger WYSIWYG)

Content styling is now a **single source of truth** so the in-editor view and the
published page render identically (no drift on future editor changes).

- **`src/content.css`** — all CONTENT styling (headings, text, quotes, lists,
  links, hr, …) as plain CSS. The published page loads this file. Colors use
  `--kuro-*` variables (theme-neutral / `inherit` by default).
- **`src/editor2.css`** (renamed from `editor.css`) — editor **UI (chrome) only**:
  `@import "tailwindcss"` + `@import "./content.css"` + `.kuro-content { --kuro-*: <dark values> }`.
- `src/main.js` imports `editor2.css`.

Public scope: content.css targets both the `.kuro-content` wrapper (editor) and
KuroEditor's `id="kuro-h-*"` on headings, so authored headings get their sizes on
the public page (where the host template's Tailwind preflight would otherwise
shrink them) without touching the template's own headings.

### 🛟 Fallback to the old CSS
- **Recommended (full revert):** pin the embedding app (e.g. KuroCMS) to
  KuroEditor **v1.0.8** — its `dist/` has the old `editor.css` + old `content.css`.
- **In-place (partial):** change `src/main.js` import `editor2.css` → `editor.css`
  and `npm run build`. Note `content.css` changed in v2, so this is a partial
  revert; use v1.0.8 for a full one. The old `editor.css` is kept for this purpose.

---

## ✨ Features

- 🪶 **No libraries** — Built with only Vanilla JS and Tailwind CSS. No React / Vue / jQuery
- 🎨 **Rich formatting** — Headings H1–H4, blockquotes, callouts (4 colors), lists, text color, font size, line height, alignment, code blocks. Code blocks support line numbers, copy, delete, and drag-to-reorder
- 📊 **Full-featured tables** — Cell merge/split, per-border style, drag-to-resize columns, cell background color, vertical alignment, table delete
- 🖼 **Media support** — Image / video / audio / YouTube & Vimeo embeds, drag & drop, clipboard paste
- 🔗 **Special link syntax** — WiKi-style links via `[[slug]]` / `[[[slug]]]` / `[[slug|label]]`
- 🌙 **Dark mode only** — A cohesive dark UI
- 💾 **Auto-save** — `onSave` callback at any interval
- 📝 **Source editing** — Toggle between WYSIWYG and HTML source via tabs
- 🪄 **Auto table of contents** — Builds an outline automatically from headings

---

## 🚀 Quick start

The minimal setup is a single `<script>` line plus a mount `<div>`.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/path/to/kuro-editor.css">
</head>
<body>
  <div id="editor"></div>

  <script src="/path/to/kuro-editor.js"></script>
  <script>
    const editor = new KuroEditor(document.getElementById('editor'), {
      initialContent: '<p>Hello, KuroEditor!</p>',
      onSave(html) {
        console.log('saved:', html)
      },
    })
  </script>
</body>
</html>
```

That's all it takes to launch.

---

## 📦 Embedding

### 1. Get the files

Place the two pre-built files on your server:

| File | Contents |
|---|---|
| `dist/kuro-editor.js` | The editor itself (Vanilla JS, no dependencies) |
| `dist/kuro-editor.css` | Styles (Tailwind compiled, scoped) |

To build locally:

```bash
npm install
npm run build
# → generates dist/kuro-editor.js, dist/kuro-editor.css
```

### 2. Add it to your HTML

Load the CSS in `<head>` and the JS at the end of `<body>` (or with `defer`):

```html
<link rel="stylesheet" href="/assets/kuro-editor.css">

<div id="my-editor"></div>

<script src="/assets/kuro-editor.js" defer></script>
<script defer>
  document.addEventListener('DOMContentLoaded', () => {
    new KuroEditor(document.getElementById('my-editor'), {
      // ...options
    })
  })
</script>
```

> 💡 Loading `kuro-editor.js` defines `window.KuroEditor` and `window.KUROEDITOR_VERSION`.

### 3. Using ES Modules

```js
import { KuroEditor } from './path/to/dist/kuro-editor.js'
import './path/to/dist/kuro-editor.css'

new KuroEditor(document.getElementById('editor'), { /* options */ })
```

### 4. As a CMS / form widget

A typical pattern that replaces an existing `<textarea>` in a form:

```html
<form id="article-form">
  <input name="title" placeholder="Article title">
  <div id="editor-mount"></div>
  <input type="hidden" name="body" id="body-field">
  <button type="submit">Submit</button>
</form>

<script>
  const editor = new KuroEditor(document.getElementById('editor-mount'), {
    initialContent: document.getElementById('body-field').value,
  })

  document.getElementById('article-form').addEventListener('submit', () => {
    document.getElementById('body-field').value = editor.getContent()
  })
</script>
```

---

## 🖥 Rendering saved content (public pages)

The HTML produced by KuroEditor uses class-based blocks (rounded boxes, tables, custom list markers). To render that saved HTML on your **public site** — where the editor is *not* loaded — include the lightweight, theme-neutral `kuro-content.css` instead of the full editor CSS:

```html
<link rel="stylesheet" href="/assets/kuro-content.css">
<article><!-- saved KuroEditor HTML --></article>
```

- `kuro-content.css` is plain CSS (no Tailwind, no CSS reset) so it won't fight your page styles. The block classes (`.kuro-roundbox`, `.kuro-table`, `ul.kuro-ul-*`, `ol.kuro-list-*`) are already present in the saved HTML — no wrapper element is required.
- It is theme-neutral via `--kuro-*` CSS variables with neutral defaults. To match a dark (or custom) theme, override them:

```css
:root {
  --kuro-box-border: #525252;
  --kuro-box-bg: #1a1a1e;
  --kuro-table-border: #525252;
  --kuro-table-head-bg: #262626;
}
```

> The editor bundle `kuro-editor.css` already includes these content styles, so you do **not** need `kuro-content.css` on pages that load the editor itself.

---

## ⚙️ Options

Main options you can pass to `new KuroEditor(mountEl, options)`:

| Option | Type | Description |
|---|---|---|
| `initialContent` | `string` | Initial HTML. `[[...]]` syntax is expanded automatically |
| `onSave(html)` | `function` | Callback invoked on the Save button press / auto-save |
| `autoSaveInterval` | `number` | Auto-save interval in milliseconds. Default `30000` |
| `urlResolver(slug)` | `function` | Function that resolves a slug (e.g. `[[slug]]`) to a URL |
| `onMediaUpload(file)` | `async function` | Image/video upload handler. Return a `mid` and it is inserted automatically as `[[mid]]` |
| `modalToolbar` | `HTMLElement` | Specify to mount the modal menu (mmenu) into an arbitrary DOM slot |

### onSave example

```js
new KuroEditor(mount, {
  onSave(html) {
    fetch('/api/articles/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: html }),
    })
  },
})
```

### onMediaUpload example

When you pass `onMediaUpload`, it is called when the user drags & drops, pastes, or selects an image. The returned `mid` is inserted into the article as `[[mid-xxx]]`, and resolved to a real URL via `urlResolver` at display time.

```js
new KuroEditor(mount, {
  async onMediaUpload(file) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/media', { method: 'POST', body: fd })
    const { mid } = await res.json()
    return mid   // e.g. "mid-abc123"
  },

  urlResolver(slug) {
    if (slug.startsWith('mid-')) return `/media/${slug}`
    if (slug.startsWith('http')) return slug
    return `/articles/${slug}`
  },
})
```

---

## 🎮 Public API

```js
const editor = new KuroEditor(mountEl, options)

editor.setContent(html)   // Overwrite the content
editor.getContent()       // Get the current HTML (converted back to [[...]] syntax)
editor.setMode('source')  // Switch to 'wysiwyg' | 'source'
editor.getMode()          // Current mode
editor.destroy()          // Clean up (remove listeners + restore the original element)
```

---

## 🔖 Special link syntax

The editor supports the following link syntaxes:

| Syntax | Purpose | Example |
|---|---|---|
| `[[slug]]` | Hyperlink (inline) | `[[about]]` |
| `[[[slug]]]` | Card-style link (opens in a new tab) | `[[[recipe-curry]]]` |
| `[[slug\|label]]` | WiKi style (custom display text) | `[[about\|About us]]` |
| `[[mid\|60%,right]]` | Media (size & alignment) | `[[mid-001\|50%,center]]` |
| `[[url\|60%\|https://...]]` | Click image to open in a new tab | — |

A `slug` starting with `http` is treated as an external link.

---

## 🛠 Development

```bash
npm install
npm run dev      # Dev server (http://localhost:5177)
npm test         # Unit tests (Vitest)
npm run build    # Build to dist/
```

### Directory layout

```
src/
  editor.js     # KuroEditor core (class + utilities)
  editor.css    # Tailwind CSS styles
  main.js       # Demo page entry point
  index.html    # Development demo
tests/          # Vitest tests
dist/           # Build artifacts (kuro-editor.js / .css)
```

---

## 📜 License

[Kuro License](LICENSE.txt) — MIT-based, with an attribution requirement.

> When you publish a user-facing interface built with this software, the credit `Editor: Kuro.Boo` ([https://kuro.boo/](https://kuro.boo/)) must be shown somewhere such as the footer or a credits section.
