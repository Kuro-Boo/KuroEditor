<div align="center">

# KuroEditor

> **共有コマンド（版を上げる／端末へ渡す）は [OPS.md](OPS.md) を読むこと。**
> `./lib_release.sh --gh <アカウント> --notes "…"`（版を上げる）。
> どれも `Entamy/ops/` への symlink で、**中身は書き換えない**。
> 手で版を書き換えない／手で `install` を叩かない理由もそこにある。

**A Vanilla JS WYSIWYG editor with a light/dark editing canvas**

[![License](https://img.shields.io/badge/license-Kuro%20License-blue.svg)](LICENSE.txt)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-38bdf8)](https://tailwindcss.com/)
[![No deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](#)

**English** | [日本語](README.ja.md)

Zero external JS libraries — an embeddable WYSIWYG editor that runs by loading a single `kuro-editor.js` file.

### 🌐 [Showcase](https://kuro.boo/kuroeditor/) &nbsp;·&nbsp; 🎮 [Live sample](https://kuro.boo/kuroeditor/sample/) &nbsp;·&nbsp; 📖 [User guide (JA)](https://kuro.boo/kuroeditor/guide/) &nbsp;·&nbsp; 🏠 [Author: Kuro.Boo](https://kuro.boo/)

</div>

---

## 📖 Documentation

| Audience | Where to look |
|---|---|
| **Writers** (people using the editor) | 📖 **[User guide](https://kuro.boo/kuroeditor/guide/)** — screen tour, paragraphs vs. line breaks, indenting, lists, tables, media, links and callouts, with **real screenshots and live examples**. *Japanese only for now.* |
| **Integrators** | This README (from Quick start down) and the [showcase page](https://kuro.boo/kuroeditor/) |
| **Just curious** | 🎮 [Live sample](https://kuro.boo/kuroeditor/sample/) — the real editor, in your browser |

The user guide also opens from the **“?” button** in the editor's tab bar (left of the table-of-contents
button). Point it at your own manual with `helpUrl`, or hide the button with `helpUi: false`.
The guide itself is **[`public/guide/index.html`](public/guide/index.html) in this repository**, so you can
host a copy on your own site and point `helpUrl` there.

---

## ⚠️ v2.0.0 — CSS architecture v2 (stronger WYSIWYG)

Content styling is now a **single source of truth** so the in-editor view and the
published page render identically (no drift on future editor changes).

- **`src/content.css`** — all CONTENT styling (headings, text, quotes, lists,
  links, hr, …) as plain CSS. The published page loads this file. Colors use
  `--kuro-*` variables (theme-neutral / `inherit` by default).
- **`src/editor.css`** — editor **UI (chrome) only**:
  `@import "tailwindcss"` + `@import "./content.css"` + toolbar/menu styles.
  The editing canvas is **light by default** (content.css keeps its theme-neutral
  defaults — the same values the public page uses), and the dark `--kuro-*`
  palette is scoped under the `.kuro-editor--canvas-dark` modifier so it never
  leaks into the light canvas or the published page.
- `src/main.js` imports `editor.css`.

Public scope: content.css targets both the `.kuro-content` wrapper (editor) and
KuroEditor's `id="kuro-h-*"` on headings, so authored headings get their sizes on
the public page (where the host template's Tailwind preflight would otherwise
shrink them) without touching the template's own headings.

### 🛟 Fallback to the old (pre-v2) CSS
Pin the embedding app (e.g. KuroCMS) to KuroEditor **v1.0.8** — its `dist/` has
the old monolithic `editor.css` + old `content.css`. (The v1 stylesheet was
kept in-tree for a while as `src/editor.css`; it has since been removed —
recover it from tag v1.0.8 / git history if ever needed. The current
`src/editor.css` is the v2 chrome-only stylesheet, formerly `editor2.css`.)

---

## ✨ Features

- 🪶 **No libraries** — Built with only Vanilla JS and Tailwind CSS. No React / Vue / jQuery
- 🎨 **Rich formatting** — Headings H1–H4, blockquotes, callouts (4 colors), lists, text color, font size, line height, alignment, code blocks. Code blocks support line numbers, copy, delete, and drag-to-reorder
- 📊 **Full-featured tables** — Cell merge/split, per-border style, drag-to-resize columns, cell background color, vertical alignment, table delete
- 🖼 **Media support** — Image / video / audio / YouTube & Vimeo embeds, drag & drop, clipboard paste
- 🔗 **Special link syntax** — WiKi-style links via `[[slug]]` / `[[[slug]]]` / `[[slug|label]]`, plus **URL cards** via `[[url|]]` (Dropbox Paper style). Links are edited/created in place through the in-editor link edit popup and the 🔗 toolbar button
- ↩️ **Undo / Redo** — custom snapshot history (up to 200 steps) that also reverts **direct-DOM operations** (table edits, link deletion, formatting); IME-safe (a conversion-commit Enter never misfires)
- 🌓 **Light/Dark canvas** — The editing canvas matches your site's look by default, and can be switched to dark (`canvasDark` option / `setCanvasDark()`; the tab-bar toggle checkbox is opt-in via `canvasDarkUi: true`)
- 💾 **Auto-save** — `onSave` callback at any interval
- 📝 **3 modes** — ✏️ edit / 👁 read-only view / `</>` HTML source, switched via tabs
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

Place the pre-built files on your server (pages that host the editor only need the first two):

| File | Contents |
|---|---|
| `dist/kuro-editor.js` | The editor itself (Vanilla JS, no dependencies) |
| `dist/kuro-editor.css` | Styles (Tailwind compiled, scoped) |
| `dist/kuro-content.css` | Content-only styles for **public pages that don't load the editor** (see [Rendering saved content](#-rendering-saved-content-public-pages)) |

To build locally:

```bash
npm install
npm run build
# → generates dist/kuro-editor.js, dist/kuro-editor.css, dist/kuro-content.css
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


### Copy button for code blocks (optional)

Code blocks render **with line numbers** on public pages too (the saved `<pre data-gutter="…">` is drawn by
`kuro-content.css`). The 📋 **copy button** needs a click handler, so it ships as a tiny opt-in script
(**zero dependencies, ~2KB**):

```html
<!-- only needed on pages that actually contain a code block -->
<script src="/path/to/kuro-code-copy.js" defer></script>
```

- It only touches `<pre data-gutter>` elements — **the saved HTML never changes** (the button is added at runtime)
- Pages that swap content in can call `window.kuroCodeCopy()` again (it never double-adds)
- No button is added where `navigator.clipboard` is unavailable (e.g. plain http)

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
| `modalMenu` | `boolean` | Default `true`. Set `false` to not mount the modal menu (mmenu) at all — the tab bar's inline buttons mirror every mmenu action. Takes precedence over `modalToolbar` |
| `saveUi` | `boolean` | Default `true`. Set `false` to hide the save UI (auto-save checkbox + Save button, both tab bar and mmenu) and disable the built-in auto-save timer — for hosts that fully manage saving via `onDirty` + `getContent()` |
| `onDirty()` | `function` | Called the moment an unsaved change appears (false→true transitions only; saving clears it, the next edit re-fires). Decoration-only DOM operations (text color, cell backgrounds, table ops) do **not** fire `input`, so hosts with their own save UI must subscribe to this instead of watching `input`. Call `clearDirty()` when your save completes |
| `canvasDark` | `boolean` | Optional. Force the initial canvas dark mode from the host. When set, it overrides the localStorage preference and toggling no longer writes to localStorage. When omitted, the persisted preference is restored as before (default light) |
| `canvasDarkUi` | `boolean` | Default `false` (hidden). Set `true` to show the "dark" toggle checkbox in the tab bar. Even when hidden, `canvasDark` / `setCanvasDark()` still switch the canvas |
| `helpUi` | `boolean` | Default `true` (shown). Set `false` to hide the “?” help button (tab bar, left of the ToC button) |
| `helpUrl` | `string \| null` | URL the “?” button opens in a **new tab**. Defaults to the official user guide `https://kuro.boo/kuroeditor/guide/` (Japanese). Point it at your own manual, or pass `null` to hide the button |
| `versionUi` | `boolean` | Default `true` (shown). Set `false` to hide the version badge (`vX.Y.Z`) at the top-left of the tab bar. The version stays readable via the `data-kuro-editor` attribute and `window.KUROEDITOR_VERSION` |
| `canvasColors` | `object` | Optional. Match the light-mode canvas palette to your site's real colors: `{ bg, text, caret, placeholder, cellFocusBg, dragOverBg }` (each a CSS color; all keys optional). Omitted keys keep the stylesheet defaults (white / slate-900). Change at runtime with `setCanvasColors()` |
| `canvasDarkColors` | `object` | Optional. Dark-mode canvas palette, same shape as `canvasColors`; applied only while the canvas is dark. Omitted keys keep the dark defaults (`#171717` / `#f5f5f5`). Change at runtime with `setCanvasDarkColors()` |
| `clipControl` | `boolean` | Default `false` (hidden). Set `true` to add copy / cut / paste buttons at the end of the text-selection popup — for hosts (e.g. WebView embeds) that mediate clipboard access themselves |
| `onClipCopy({text, html})` | `function` | Called when the copy button is tapped, with the selection as plain text and HTML. Falls back to `navigator.clipboard.writeText(text)` when omitted |
| `onClipCut({text, html})` | `function` | Called when the cut button is tapped, with the selection payload; the editor then deletes the selected range. Falls back to `navigator.clipboard.writeText(text)` when omitted |
| `onClipPaste()` | `function` | Called when the paste button is tapped. Return a `string` (or a `Promise<string>`) to have it inserted as plain text at the selection; return nothing to handle insertion on the host side. Falls back to `navigator.clipboard.readText()` when omitted |
| `onFetchUrlMeta(slug)` | `async function` | Optional. Fetches rich metadata for URL cards (`[[slug\|]]`). Return `{ title?, description?, favicon?, image? }` (or `null`). **Two-step display**: the card renders immediately from the URL alone (never blocks the screen), then, once this resolves, that one card is upgraded in place with the title/description/favicon/thumbnail. Omitted / `null` / failure keeps the simple display |
| `mediaAccept` | `string` | Default `'image/*,video/*,audio/*'`. The `accept` of the media dialog's file `<input>`. Narrow it to what your host actually accepts (e.g. `'image/*'`). **On iOS (WKWebView/Safari), mixing in types the photo library cannot provide (such as audio) drops the picker to Files only** — image-only hosts should pass `'image/*'` to get the native "Photo Library / Take Photo" sheet |
| `blockIds` | `boolean` | Default `false`. Set `true` to assign and maintain a stable `data-bid` (UUID) on every top-level block — the foundation for block-level 3-way merge in an external sync layer (see the `mergeBlocks()` named export). Persist with `getContent()` (keeps ids); publish with `getBuildImage()` (strips them) |

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
editor.getContent()       // Current HTML (converted back to [[...]] syntax; keeps data-bid when blockIds is on)
editor.getBuildImage()    // Publish-ready HTML — getContent() minus the editing-only data-bid metadata
editor.setMode('source')  // Switch to 'wysiwyg' | 'view' | 'source'
editor.getMode()          // Current mode
editor.setCanvasDark(true)     // Switch the editing canvas light/dark (read with isCanvasDark())
editor.setCanvasColors({...})  // Override the light canvas palette at runtime (setCanvasDarkColors for dark)
editor.isDirty()          // Any unsaved changes? (pairs with the onDirty callback)
editor.clearDirty()       // Tell the editor the host finished saving
editor.destroy()          // Clean up (remove listeners + restore the original element)
```

### Modes

The tab bar has three modes:

| Tab | Mode | Behaviour |
|-----|------|-----------|
| ✏️ | `wysiwyg` | Editing. All popups / toolbars active (the default) |
| 👁 | `view` | Read-only. `contenteditable` is off, code blocks are read-only, insert actions are disabled and no editing popup (format / table / image / link edit) is shown. Clicking a link does not navigate — a dialog asks whether to open it in a new tab |
| `</>` | `source` | HTML source |

---

## 🔖 Special link syntax

The editor supports the following link syntaxes:

| Syntax | Purpose | Example |
|---|---|---|
| `[[slug]]` | Hyperlink (inline; display text = slug) | `[[about]]` |
| `[[slug\|label]]` | WiKi style (custom display text) | `[[about\|About us]]` |
| `[[slug\|]]` | **URL card** (explicitly no title → Dropbox Paper–style card) | `[[https://example.com\|]]` |
| `[[[slug]]]` | Card-style link (opens in a new tab) | `[[[recipe-curry]]]` |
| `[[mid\|60%,right]]` | Media (size & alignment) | `[[mid-001\|50%,center]]` |
| `[[url\|60%\|https://...]]` | Click image to open in a new tab | — |

A `slug` starting with `http` is treated as an external link.

**URL card (`[[slug|]]`)** — leaving the display text empty (an explicit "no title") renders an icon + title + URL card (Dropbox Paper style) instead of a blue text link. Clear the display-text field in the link edit popup to turn any link into a card, and re-enter text to turn it back. In the editor the card is a single `contenteditable="false"` object; clicking it opens the link edit popup instead of navigating (on the published page it navigates like a normal link).

**Two-step (rich) display** — by default the card title uses only what can be derived from the URL (the hostname for http(s) URLs, the slug string for internal slugs), because the browser can't read a foreign page's `<title>` due to CORS. Pass `onFetchUrlMeta` and it becomes two steps: ① the simple card is rendered **synchronously** (never blocks the screen), then ② when the host resolves the metadata (title / description / favicon / thumbnail) via a server-side fetch or unfurl service, that one card is **swapped** to the rich display. A slow or failed fetch simply leaves the simple card in place.

> **⚠️ By design** — the rich metadata is **not saved** (`getContent()` always restores `[[slug|]]`); it is re-fetched via `onFetchUrlMeta` every time the card renders. Therefore, **if the target URL's article (its title, favicon, OG image, etc.) changes between edit time and production display time, the card's appearance may change. This is intentional** — the link itself (`[[slug|]]`) is immutable; the card always paints "the current state of that URL".

---

## 🛠 Development

```bash
npm install
npm run dev      # Dev server → open http://localhost:5177/src/index.html
npm test         # Unit tests (Vitest)
npm run build    # Build to dist/
```

### Directory layout

```
src/
  editor.js     # KuroEditor core (class + utilities)
  editor.css    # Editor UI (chrome) styles — imports content.css
  content.css   # Content styles (shared with the published page)
  main.js       # Demo page entry point
  index.html    # Development demo (dev server serves it at /src/index.html)
tests/          # Vitest tests
build-scripts/  # Build/release tooling (bump.js / emit-version.js / landing CSS input)
public/         # Static files for the showcase/demo site (vite build input)
dist/           # Build artifacts (kuro-editor.js / kuro-editor.css / kuro-content.css)
```

---

## 📜 License

[Kuro License](LICENSE.txt) — MIT-based, with an attribution requirement.

> When you publish a user-facing interface built with this software, the credit `Editor: Kuro.Boo` ([https://kuro.boo/](https://kuro.boo/)) must be shown somewhere such as the footer or a credits section.
