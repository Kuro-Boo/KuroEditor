/**
 * KuroEditor v0.2.0
 * Vanilla JS WYSIWYG editor — Tailwind CSS, dark mode only, single-file embed target.
 *
 * Repo: https://github.com/Kuro-Boo/KuroEditor
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const VERSION = '2.0.10'

/** Special link regex patterns — processed in this order: card > wiki > hyper */
export const LINK_RE = {
  card:  /\[\[\[([^\]]+)\]\]\]/g,
  wiki:  /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
  hyper: /\[\[([^\]]+)\]\]/g,
}

/** Grouped preset colours — 5 categories × 9 colours (3 cols × 3 rows each) */
const COLOR_GROUPS = [
  { name: 'モノトーン', colors: [
    '#ffffff', '#e5e7eb', '#d1d5db',
    '#9ca3af', '#6b7280', '#4b5563',
    '#374151', '#1f2937', '#111827',
  ]},
  { name: '赤系', colors: [
    '#fecdd3', '#fca5a5', '#f87171',
    '#ef4444', '#dc2626', '#b91c1c',
    '#fb7185', '#f43f5e', '#e11d48',
  ]},
  { name: '青系', colors: [
    '#bae6fd', '#93c5fd', '#60a5fa',
    '#3b82f6', '#2563eb', '#1d4ed8',
    '#38bdf8', '#0ea5e9', '#0284c7',
  ]},
  { name: '緑系', colors: [
    '#bbf7d0', '#86efac', '#4ade80',
    '#22c55e', '#16a34a', '#15803d',
    '#a3e635', '#5eead4', '#14b8a6',
  ]},
  { name: 'その他', colors: [
    '#fed7aa', '#fb923c', '#f97316',
    '#fde68a', '#fbbf24', '#eab308',
    '#e9d5ff', '#c084fc', '#a855f7',
  ]},
]
/** Flat preset list (backward compat for any external use) */
const PRESET_COLORS = COLOR_GROUPS.flatMap(g => g.colors)

/** Font size presets (% of base).  100% = standard = highlighted as baseline. */
const FONT_SIZE_OPTIONS = [
  { label: '75%',  value: '75%'  },
  { label: '85%',  value: '85%'  },
  { label: '100%', value: '100%', base: true },
  { label: '120%', value: '120%' },
  { label: '150%', value: '150%' },
  { label: '175%', value: '175%' },
  { label: '200%', value: '200%' },
]

/**
 * Font family presets — CSS generic families only (no font-name list, no web
 * font loading). In Japanese typography `sans-serif` ≈ ゴシック and `serif` ≈ 明朝;
 * the browser/OS resolves them to its default gothic / mincho face, so the exact
 * typeface is system-dependent (documented as such on the KuroCMS side). Using the
 * bare generics keeps authored HTML simple and reliably overrides any inherited
 * site web font back to plain gothic / mincho.
 * Mono-space stays exclusive to code blocks (already styled in <pre><code>).
 */
const FONT_FAMILY_OPTIONS = [
  {
    label: 'ゴシック',
    value: 'sans-serif',
    base:  true,
  },
  {
    label: '明朝',
    value: 'serif',
  },
]

/** Line-height presets.  1.6 = editor default (leading-relaxed). */
const LINE_HEIGHT_OPTIONS = [
  { label: '詰め',    value: '1.2' },
  { label: '狭め',    value: '1.4' },
  { label: '標準',    value: '1.6', base: true },
  { label: '広め',    value: '1.8' },
  { label: '2倍',     value: '2.0' },
  { label: '2.5倍',   value: '2.5' },
]

/**
 * Ordered-list style presets — applied as CSS class on <ol>.
 * The CSS @counter-style rules in editor.css define the custom counters.
 * base:true marks the default (decimal) style.
 */
const OL_STYLE_OPTIONS = [
  { label: '1.',   value: 'kuro-list-decimal'    },
  { label: '①',   value: 'kuro-list-circled'    },
  { label: '(1)', value: 'kuro-list-paren-num'             },
  { label: 'A.',   value: 'kuro-list-alpha'                 },
  { label: '(A)', value: 'kuro-list-paren-alpha'           },
  { label: 'ア',  value: 'kuro-list-kata'                  },
  { label: '(ア)',value: 'kuro-list-paren-kata'            },
]

/**
 * Unordered-list style presets — applied as CSS class on <ul>.
 * Standard CSS keywords (disc/circle/square) + string-literal list-style-type values.
 * base:true marks the default (disc) style.
 */
const UL_STYLE_OPTIONS = [
  { label: '●',  value: 'kuro-ul-disc'     },   // CSS disc
  { label: '○',  value: 'kuro-ul-circle'   },   // CSS circle
  { label: '■',  value: 'kuro-ul-square'              },   // CSS square
  { label: '-',  value: 'kuro-ul-dash'                },   // half-width -
  { label: '#',  value: 'kuro-ul-hash'                },   // half-width #
  { label: '*',  value: 'kuro-ul-asterisk'            },   // half-width *
  { label: '>',  value: 'kuro-ul-arrow'               },   // half-width >
  { label: '◎',  value: 'kuro-ul-bullseye'            },   // full-width ◎
  { label: '★',  value: 'kuro-ul-star'                },   // full-width ★
  { label: '☆',  value: 'kuro-ul-star-open'           },   // full-width ☆
  { label: '▶',  value: 'kuro-ul-tri'                 },   // full-width ▶
  { label: '▷',  value: 'kuro-ul-tri-open'            },   // full-width ▷
]

// ─── SVG icon helpers ─────────────────────────────────────────────────────────
const _icn = (body) =>
  `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">${body}</svg>`
const _bar = (x, y, w, h = 1.8) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.9"/>`

/** Inline SVG icons used in the popup menu and toolbar buttons */
const ICON = {
  alignLeft:    _icn(_bar(0,0,14)+_bar(0,4,9)+_bar(0,8,14)+_bar(0,12,6)),
  alignCenter:  _icn(_bar(0,0,14)+_bar(2.5,4,9)+_bar(0,8,14)+_bar(4,12,6)),
  alignRight:   _icn(_bar(0,0,14)+_bar(5,4,9)+_bar(0,8,14)+_bar(8,12,6)),
  alignJustify: _icn(_bar(0,0,14)+_bar(0,4,14)+_bar(0,8,14)+_bar(0,12,14)),
  listUl: _icn(
    `<circle cx="1.5" cy="1.5" r="1.4"/>`+_bar(4,0.5,10)+
    `<circle cx="1.5" cy="7"   r="1.4"/>`+_bar(4,6,10)+
    `<circle cx="1.5" cy="12.5" r="1.4"/>`+_bar(4,11.5,10)
  ),
  listOl: _icn(
    `<text x="0" y="4"  font-size="4.5" font-family="monospace">1.</text>`+_bar(5,0.5,9)+
    `<text x="0" y="9"  font-size="4.5" font-family="monospace">2.</text>`+_bar(5,5.5,9)+
    `<text x="0" y="14" font-size="4.5" font-family="monospace">3.</text>`+_bar(5,10.5,9)
  ),
  // ── toolbar action icons ──────────────────────────────────────────────────
  table: _icn(
    `<rect x="0.5" y="0.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/>` +
    `<line x1="0.5" y1="5"  x2="13.5" y2="5"  stroke="currentColor" stroke-width="1"/>` +
    `<line x1="0.5" y1="9"  x2="13.5" y2="9"  stroke="currentColor" stroke-width="1"/>` +
    `<line x1="5"   y1="5"  x2="5"    y2="13.5" stroke="currentColor" stroke-width="1"/>`
  ),
  code: `<svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5,1 1,7 5,13"/><polyline points="11,1 15,7 11,13"/></svg>`,
  hr:   _icn(`<rect x="0" y="6" width="14" height="2" rx="1"/>`),
  roundbox: _icn(
    `<rect x="0.5" y="1" width="13" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>` +
    _bar(2.5, 4, 9) + _bar(2.5, 7, 6) + _bar(2.5, 10, 7.5)
  ),
  // Undo: 矢印が左に折れ曲がってカーブ
  undo: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5,4 2,4 2,1"/><path d="M2 4 a5 5 0 0 1 5 -1 h2 a4 4 0 0 1 0 8 h-3"/></svg>`,
  // Redo: undo の左右対称
  redo: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9,4 12,4 12,1"/><path d="M12 4 a5 5 0 0 0 -5 -1 h-2 a4 4 0 0 0 0 8 h3"/></svg>`,
  // Keyboard key (kbd) — minimalistic keyboard outline + dot keys
  kbd: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true">` +
    `<rect x="0.5" y="3.5" width="13" height="7" rx="1.2"/>` +
    `<rect x="2.4" y="5.2" width="1.4" height="1.4" rx="0.3" fill="currentColor" stroke="none"/>` +
    `<rect x="5.3" y="5.2" width="1.4" height="1.4" rx="0.3" fill="currentColor" stroke="none"/>` +
    `<rect x="8.2" y="5.2" width="1.4" height="1.4" rx="0.3" fill="currentColor" stroke="none"/>` +
    `<rect x="2.4" y="7.6" width="7.5" height="1.3" rx="0.3" fill="currentColor" stroke="none"/>` +
  `</svg>`,
  // Eye — Preview tab
  eye: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="M1 8 c2,-4 5,-5 7,-5 s5,1 7,5 c-2,4 -5,5 -7,5 s-5,-1 -7,-5z"/>` +
    `<circle cx="8" cy="8" r="2"/>` +
  `</svg>`,
  // HTML source — document frame containing </>  (distinct from raw <> code icon)
  source: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<rect x="1.5" y="2" width="13" height="12" rx="1.5"/>` +
    `<polyline points="6,6.5 4.2,9 6,11.5"/>` +
    `<polyline points="10,6.5 11.8,9 10,11.5"/>` +
    `<line x1="8.6" y1="5.5" x2="7.4" y2="12.5" opacity="0.7"/>` +
  `</svg>`,
  // Blockquote — left vertical bar + three horizontal text lines
  quote: _icn(
    `<rect x="0" y="0" width="2" height="14" rx="1"/>` +
    _bar(4, 2,  9) +
    _bar(4, 6,  7) +
    _bar(4, 10, 9)
  ),
  // Callout — speech-bubble-like square with a small mark inside
  callout: _icn(
    `<rect x="0.5" y="0.5" width="13" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/>` +
    `<circle cx="3.5" cy="6" r="1"/>` +
    `<rect x="6" y="5.3" width="6" height="1.4" rx="0.7"/>`
  ),
}

/** Basic emoji set — face → gesture → symbol → nature → tech → music */
const EMOJI_LIST = [
  '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂',
  '😉','😌','😍','🥰','😘','😗','😚','😙','😋','😛',
  '😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤨','😐',
  '😑','😶','😏','😒','🙄','😬','🤥','😔','😪','😴',
  '😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','😱','😤',
  '😡','🤬','😠','👿','💀','💩','🤡','👹','👺','😈',
  '👍','👎','👏','🙌','🤝','🤜','🤛','✊','👊','🤚',
  '✋','🖐','👋','🤙','💪','☝️','👆','👇','👉','👈',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
  '💯','⭐','🌟','✨','💫','🔥','💧','🌊','🌈','❄️',
  '💻','📱','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','🔋',
  '📷','📸','📹','🎥','📡','☎️','📞','🔍','🔎','💡',
  '🎵','🎶','🎤','🎧','🎸','🎹','🎺','🎻','🥁','🎷',
  '🌸','🌺','🌻','🌹','🍀','🌿','🌱','🌲','🌴','🍁',
  '☀️','🌙','🌤️','☁️','🌧️','⛈️','🌩️','🌨️','🌪️','🌫️',
  '🍕','🍔','🍟','🌮','🍜','🍣','🍱','🍰','🎂','☕',
]

/**
 * Emoji shortcodes (`:smile:` → 😄) — GitHub / Slack 風の入力支援。
 * 入力中に `:word:` を検知すると自動で絵文字に置換される。
 * 必要に応じて自由に追加・編集可能。
 */
/**
 * popm の addButton() に渡されるコマンド名 → ホバー時に表示する日本語ツールチップ。
 * `addButton(label, command, handler)` のとき第 4 引数で個別指定しなくても、
 * ここに登録されていれば自動で title / aria-label に流れる。
 */
const POPM_TITLES = {
  bold:                '太字 (Ctrl/⌘+B)',
  italic:              '斜体 (Ctrl/⌘+I)',
  underline:           '下線 (Ctrl/⌘+U)',
  strikeThrough:       '取り消し線',
  h1:                  '見出し 1',
  h2:                  '見出し 2',
  h3:                  '見出し 3',
  h4:                  '見出し 4',
  blockquote:          '引用',
  kbd:                 'キー表記 <kbd>',
  justifyLeft:         '左寄せ',
  justifyCenter:       '中央寄せ',
  justifyRight:        '右寄せ',
  justifyFull:         '両端揃え',
  insertUnorderedList: '箇条書きリスト',
  insertOrderedList:   '番号付きリスト',
}

const EMOJI_SHORTCODES = {
  ':smile:': '😊', ':laugh:': '😂', ':wink:': '😉', ':heart_eyes:': '😍',
  ':kiss:': '😘', ':thinking:': '🤔', ':cool:': '😎', ':sob:': '😭',
  ':angry:': '😠', ':rage:': '😡', ':confused:': '😕', ':eyes:': '👀',
  ':sleepy:': '😴', ':sick:': '🤒', ':sweat:': '😅', ':party:': '🥳',
  ':heart:': '❤️', ':broken_heart:': '💔', ':sparkles:': '✨', ':fire:': '🔥',
  ':star:': '⭐', ':100:': '💯', ':+1:': '👍', ':-1:': '👎',
  ':ok:': '👌', ':clap:': '👏', ':muscle:': '💪', ':pray:': '🙏',
  ':rocket:': '🚀', ':tada:': '🎉', ':warning:': '⚠️', ':white_check_mark:': '✅',
  ':check:': '✅', ':x:': '❌', ':no:': '🚫', ':bulb:': '💡',
  ':bug:': '🐛', ':wrench:': '🔧', ':hammer:': '🔨', ':lock:': '🔒',
  ':unlock:': '🔓', ':key:': '🔑', ':computer:': '💻', ':phone:': '📱',
  ':bell:': '🔔', ':mute:': '🔕', ':mag:': '🔍', ':link:': '🔗',
  ':paperclip:': '📎', ':books:': '📚', ':book:': '📖', ':memo:': '📝',
  ':calendar:': '📅', ':clock:': '🕐', ':sun:': '☀️', ':moon:': '🌙',
  ':rain:': '🌧️', ':snow:': '❄️', ':rainbow:': '🌈', ':cherry_blossom:': '🌸',
  ':rose:': '🌹', ':rabbit:': '🐰', ':cat:': '🐱', ':dog:': '🐶',
  ':bear:': '🐻', ':panda:': '🐼', ':coffee:': '☕', ':beer:': '🍺',
  ':cake:': '🍰', ':sushi:': '🍣', ':pizza:': '🍕', ':apple:': '🍎',
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an element with optional className, innerHTML, and attributes.
 * @param {string} tag
 * @param {{ className?: string, html?: string, attrs?: Record<string,string> }} [opts]
 * @returns {HTMLElement}
 */
export function createElement(tag, opts = {}) {
  const el = document.createElement(tag)
  if (opts.className) el.className = opts.className
  if (opts.html !== undefined) el.innerHTML = opts.html
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, v)
  }
  return el
}

/**
 * Execute a document formatting command on the current selection.
 * @param {string} command
 * @param {string|null} [value]
 */
export function execFormat(command, value = null) {
  document.execCommand(command, false, value)
}

/**
 * Check whether a formatting command is currently active for the selection.
 * @param {string} command
 * @returns {boolean}
 */
export function queryFormat(command) {
  return document.queryCommandState(command)
}

/** @returns {Selection|null} */
export function getSelection() {
  return window.getSelection ? window.getSelection() : null
}

/** @returns {boolean} true when a non-collapsed, non-empty selection exists */
export function hasSelection() {
  const sel = getSelection()
  return !!(sel && !sel.isCollapsed && sel.toString().length > 0)
}

/** @returns {DOMRect|null} */
export function getSelectionRect() {
  const sel = getSelection()
  if (!sel || sel.rangeCount === 0) return null
  return sel.getRangeAt(0).getBoundingClientRect()
}

/** Simple debounce helper */
function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default slug → URL resolver.
 * Slugs starting with "http" are external; everything else becomes a relative path.
 * @param {string} slug
 * @returns {string}
 */
export function defaultResolver(slug) {
  return slug.startsWith('http') ? slug : `/${slug}`
}

/**
 * Convert [[...]] special link syntax in raw text/HTML to rendered HTML.
 * Single-pass combined regex prevents double-matching inside rendered attributes.
 * Priority: [[[card]]] > [[wiki|text]] > [[hyper]]
 * @param {string} text
 * @param {(slug: string) => string} [resolver]
 * @returns {string}
 */
/** File extensions treated as media (image, video, or audio). */
const MEDIA_EXT_RE = /\.(jpe?g|png|gif|webp|svg|avif|mp4|webm|ogg|mov|mp3|wav|aac|flac|m4a)(\?.*)?$/i
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i
const AUDIO_EXT_RE = /\.(mp3|wav|aac|flac|m4a|oga)(\?.*)?$/i

/** Image-size presets shown in the ImageMenu toolbar. */
const IMAGE_SIZE_OPTIONS = ['25%', '33%', '50%', '60%', '75%', '100%']

export function renderSpecialLinks(text, resolver = defaultResolver) {
  // Combined single-pass regex — order of alternation is card > wiki > hyper
  const RE = /\[\[\[([^\]]+)\]\]\]|\[\[([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\]/g
  return text.replace(RE, (match, card, wikiSlug, wikiLabel, hyper) => {
    if (card !== undefined) {
      const url = resolver(card)
      return `<a href="${url}" target="_blank" rel="noopener" class="kuro-card-link" data-kuro-card="${encodeURIComponent('[[[' + card + ']]]')}">${card}</a>`
    }

    // ── Wiki branch [[slug|params]]  ─────────────────────────────────────
    // When slug is a media ID/URL, wikiLabel is the params string (not display text):
    //   "60%,right"                     → image with size+align
    //   "60%,right|https://example.com" → image with size+align+click link
    //   "|https://example.com"          → image with click link only
    if (wikiSlug !== undefined) {
      const url = resolver(wikiSlug)

      // ① iframe embed (YouTube, Vimeo, …) — checked before media extension
      const embedUrl = resolveEmbedUrl(url)
      if (embedUrl) {
        const { size, align } = parseMediaParams(wikiLabel)
        const enc = buildMediaAttr(wikiSlug, size, align)
        return _buildIframeFigure(embedUrl, enc, size, align)
      }

      // ② direct media file:
      //   a) mid- prefix (R2 stored)
      //   b) URL has a recognised media extension  (.jpg, .mp4, …)
      //   c) HTTP URL whose label looks like params ("60%,right", "center", …)
      //      This handles CDN/R2 URLs that lack a file extension, e.g.:
      //        [[https://cdn.example.com/hero|60%,right]]
      //        [[https://r2.cf.example.com/media/shot||https://link]]
      const isMedia = wikiSlug.startsWith('mid-')
        || MEDIA_EXT_RE.test(url)
        || (wikiSlug.startsWith('http') && _looksLikeMediaParams(wikiLabel))
      if (isMedia) {
        const { size, align, link } = parseMediaParams(wikiLabel)
        const enc = buildMediaAttr(wikiSlug, size, align, link)
        const sizeStyle = (size && size !== '100%') ? ` style="width:${size}"` : ''
        const alignClass = align ? ` kuro-media-wrap--${align}` : ''
        const hrefAttr = link ? ` data-kuro-href="${link}"` : ''
        const linkBtn = link ? `<a class="kuro-media-open-link" href="${link}" target="_blank" rel="noopener" contenteditable="false">↗ URLを新規タブで開く</a>` : ''
        if (VIDEO_EXT_RE.test(url)) {
          return `<figure class="kuro-media-wrap kuro-media-wrap--video${alignClass}"${sizeStyle} data-kuro-media="${enc}"${hrefAttr}><video src="${url}" controls class="kuro-media kuro-media--video"></video>${linkBtn}</figure>`
        }
        if (AUDIO_EXT_RE.test(url)) {
          return `<figure class="kuro-media-wrap kuro-media-wrap--audio${alignClass}"${sizeStyle} data-kuro-media="${enc}"${hrefAttr}><audio src="${url}" controls class="kuro-media kuro-media--audio"></audio>${linkBtn}</figure>`
        }
        return `<figure class="kuro-media-wrap${alignClass}"${sizeStyle} data-kuro-media="${enc}"${hrefAttr}><img src="${url}" alt="" class="kuro-media">${linkBtn}</figure>`
      }

      // ③ regular wiki link [[slug|display text]]
      return `<a href="${url}" data-kuro-wiki="${encodeURIComponent('[[' + wikiSlug + '|' + wikiLabel + ']]')}">${wikiLabel}</a>`
    }

    // ── Hyper branch [[slug]]  ───────────────────────────────────────────
    // No params — renders media in-place or a plain hyperlink.
    if (hyper !== undefined) {
      const url = resolver(hyper)

      // ① iframe embed (YouTube, Vimeo, …)
      const embedUrl = resolveEmbedUrl(url)
      if (embedUrl) {
        const enc = buildMediaAttr(hyper)
        return _buildIframeFigure(embedUrl, enc, null, null)
      }

      // ② direct media file
      const isMedia = hyper.startsWith('mid-') || MEDIA_EXT_RE.test(url)
      if (isMedia) {
        const enc = buildMediaAttr(hyper)
        if (VIDEO_EXT_RE.test(url)) {
          return `<figure class="kuro-media-wrap kuro-media-wrap--video" data-kuro-media="${enc}"><video src="${url}" controls class="kuro-media kuro-media--video"></video></figure>`
        }
        if (AUDIO_EXT_RE.test(url)) {
          return `<figure class="kuro-media-wrap kuro-media-wrap--audio" data-kuro-media="${enc}"><audio src="${url}" controls class="kuro-media kuro-media--audio"></audio></figure>`
        }
        return `<figure class="kuro-media-wrap" data-kuro-media="${enc}"><img src="${url}" alt="" class="kuro-media"></figure>`
      }

      // ③ regular hyperlink
      const ext = hyper.startsWith('http')
      return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ''} data-kuro-link="${encodeURIComponent('[[' + hyper + ']]')}">${hyper}</a>`
    }

    return match
  })
}

/**
 * Return true when `label` (the wikiLabel part of [[slug|label]]) looks like
 * media params rather than display text.
 *
 * Valid param tokens: integers followed by %, or the words left / right / center.
 * Multiple tokens are comma-separated; an optional link URL follows a second '|'.
 *
 * Examples that return true:
 *   "60%"         "right"        "60%,right"
 *   "center"      "50%,left"     "60%,right|https://example.com"
 *   "|https://example.com"                       (link-only)
 *
 * Examples that return false (treated as display text → wiki link):
 *   "続きを読む"   "Click here"   "My image"   "Learn more"
 *
 * The heuristic is strict: every comma-separated token before the optional '|'
 * must be EITHER a percentage integer OR one of the three alignment words.
 * This makes false positives extremely unlikely in real content.
 */
function _looksLikeMediaParams(label) {
  if (!label) return false
  // Strip the link-URL part (everything from the first '|' onward)
  const paramsPart = label.indexOf('|') !== -1 ? label.slice(0, label.indexOf('|')) : label
  const trimmed = paramsPart.trim()
  // "|https://…" → empty params part = link-only → media params ✓
  if (trimmed === '') return true
  // All comma-separated tokens must be size% or align keyword
  return trimmed
    .split(',')
    .map(s => s.trim())
    .every(t => /^\d+%$/.test(t) || t === 'left' || t === 'right' || t === 'center')
}

/** Build a responsive 16:9 iframe figure element string. */
function _buildIframeFigure(embedUrl, enc, size, align) {
  const sizeStyle  = (size && size !== '100%') ? ` style="width:${size}"` : ''
  const alignClass = align ? ` kuro-media-wrap--${align}` : ''
  return `<figure class="kuro-media-wrap kuro-media-wrap--iframe${alignClass}"${sizeStyle} data-kuro-media="${enc}"><div class="kuro-iframe-wrap"><iframe src="${embedUrl}" class="kuro-media kuro-media--iframe" allowfullscreen frameborder="0" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="埋め込み動画"></iframe></div></figure>`
}

/**
 * Convert rendered kuro link elements back to [[...]] raw syntax (for source mode).
 * Operates on an HTML string via a temporary DOM node.
 * @param {string} html
 * @returns {string}
 */
export function unrenderSpecialLinks(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  // Attributes are URI-encoded to avoid bracket conflicts — decode when restoring
  div.querySelectorAll('[data-kuro-card]').forEach(el =>
    el.replaceWith(decodeURIComponent(el.getAttribute('data-kuro-card'))))
  div.querySelectorAll('[data-kuro-wiki]').forEach(el =>
    el.replaceWith(decodeURIComponent(el.getAttribute('data-kuro-wiki'))))
  div.querySelectorAll('[data-kuro-link]').forEach(el =>
    el.replaceWith(decodeURIComponent(el.getAttribute('data-kuro-link'))))
  // Media elements (img / video) inserted via mid or direct URL
  div.querySelectorAll('[data-kuro-media]').forEach(el =>
    el.replaceWith(`[[${decodeURIComponent(el.getAttribute('data-kuro-media'))}]]`))
  return div.innerHTML
}

/**
 * Format raw HTML for human-readable display in the source editor.
 * Block-level elements are placed on their own lines with two-space indentation.
 * Inline elements and their content stay on one line.
 * <pre> content is never reformatted (whitespace is significant inside code blocks).
 *
 * The output is display-only: switching back to WYSIWYG mode re-parses the
 * source, and browsers discard insignificant whitespace between block elements.
 *
 * @param {string} html
 * @returns {string}
 */
export function prettifyHTML(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  const lines = []
  _fmtChildren(div, 0, lines)
  return lines.join('\n').trim()
}

/** Block-level HTML elements — children are indented on their own lines. */
const _BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'dialog',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol',
  'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'tr', 'ul',
])

function _fmtChildren(parent, depth, lines) {
  for (const node of parent.childNodes) _fmtNode(node, depth, lines)
}

function _fmtNode(node, depth, lines) {
  const pad = '  '.repeat(depth)

  // Text node — skip whitespace-only, output meaningful content as-is
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent.trim()
    if (t) lines.push(pad + t)
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const tag      = node.tagName.toLowerCase()
  const isBlock  = _BLOCK_TAGS.has(tag)
  const attrStr  = Array.from(node.attributes).map(a => `${a.name}="${a.value}"`).join(' ')
  const open     = attrStr ? `<${tag} ${attrStr}>` : `<${tag}>`
  const close    = `</${tag}>`

  // Void elements (no closing tag)
  if (tag === 'br' || tag === 'hr' || tag === 'img' || tag === 'input') {
    lines.push(pad + open)
    return
  }

  // <pre>: preserve inner content verbatim (code blocks, indentation matters)
  if (tag === 'pre') {
    lines.push(pad + open + node.innerHTML + close)
    return
  }

  // Check if any direct child is block-level
  const hasBlockChild = [...node.childNodes].some(
    c => c.nodeType === Node.ELEMENT_NODE && _BLOCK_TAGS.has(c.tagName.toLowerCase())
  )

  if (isBlock && hasBlockChild) {
    // Block container: open, indented children, close on their own lines
    lines.push(pad + open)
    _fmtChildren(node, depth + 1, lines)
    lines.push(pad + close)
  } else if (isBlock) {
    // Block leaf (p, h1–h6, li, td, …): inline content on one line
    const inner = node.innerHTML.trim()
    lines.push(pad + (inner ? `${open}${inner}${close}` : `${open}${close}`))
  } else {
    // Inline element (a, strong, em, span, …): inline
    lines.push(pad + `${open}${node.innerHTML.trim()}${close}`)
  }
}

/**
 * Parse the params portion of a media slug (the part after the first '|').
 * Format: "size,align|linkURL"  where the second '|' separates the link URL
 * from size/align so link URLs containing commas remain unambiguous.
 *
 * Examples:
 *   "60%,right"                      → { size:'60%', align:'right', link:null }
 *   "60%,right|https://example.com"  → { size:'60%', align:'right', link:'https://…' }
 *   "|https://example.com"           → { size:null, align:null, link:'https://…' }
 *
 * @param {string|null} params — raw param string (not URI-encoded)
 * @returns {{ size: string|null, align: 'left'|'center'|'right'|null, link: string|null }}
 */
export function parseMediaParams(params) {
  const result = { size: null, align: null, link: null }
  if (!params) return result

  // The link URL (if any) is separated from size/align by a '|'.
  // This allows link URLs to contain commas without ambiguity.
  let sizeAlignPart = params
  const pipeIdx = params.indexOf('|')
  if (pipeIdx !== -1) {
    result.link = params.slice(pipeIdx + 1).trim() || null
    sizeAlignPart = params.slice(0, pipeIdx)
  }

  for (const part of sizeAlignPart.split(',').map(s => s.trim()).filter(Boolean)) {
    if (/^\d+%$/.test(part)) result.size = part
    else if (part === 'left' || part === 'right' || part === 'center') result.align = part
  }
  return result
}

/**
 * Build a `data-kuro-media` attribute value from slug + optional params.
 * Returns URI-encoded string ready to drop into an HTML attribute.
 *
 * Storage format (decoded):  "slug"  /  "slug|size,align"  /  "slug|size,align|linkURL"
 *
 * @param {string}      slug  — e.g. "mid-001" or "https://…/img.png"
 * @param {string|null} size  — e.g. "60%" or null
 * @param {string|null} align — e.g. "right" or null
 * @param {string|null} link  — click-through URL, or null
 * @returns {string} URI-encoded attribute value
 */
function buildMediaAttr(slug, size = null, align = null, link = null) {
  const sizeAlign = [size, align].filter(Boolean).join(',')
  let params = sizeAlign
  if (link) params = (sizeAlign ? sizeAlign + '|' : '') + link
  return encodeURIComponent(params ? `${slug}|${params}` : slug)
}

/**
 * Convert a public video-service URL to its embed URL if the service is recognised.
 * Returns null when the URL is not a known embeddable service.
 *
 * Currently supported:
 *   - YouTube  watch?v=   / youtu.be/
 *   - Vimeo    vimeo.com/VIDEO_ID
 *
 * @param {string} url
 * @returns {string|null} embed URL, or null
 */
export function resolveEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    // ── YouTube ────────────────────────────────────────────────────────────
    if (host === 'youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      // /shorts/VIDEO_ID
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/)
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)   // e.g. /dQw4w9WgXcQ → dQw4w9WgXcQ
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    // ── Vimeo ──────────────────────────────────────────────────────────────
    if (host === 'vimeo.com') {
      const id = u.pathname.replace(/\D/g, '')   // keep only digits from /VIDEO_ID
      if (id) return `https://player.vimeo.com/video/${id}`
    }
  } catch {}
  return null
}

/**
 * Apply size/align styles + classes to a <figure.kuro-media-wrap> element.
 * @param {HTMLElement} figure
 * @param {string|null} size
 * @param {string|null} align
 */
function applyMediaLayout(figure, size, align) {
  // Width — 100% or null = reset (let max-w-full on inner img govern)
  figure.style.width = (size && size !== '100%') ? size : ''
  // Alignment classes
  figure.classList.remove('kuro-media-wrap--left', 'kuro-media-wrap--right', 'kuro-media-wrap--center')
  if (align) figure.classList.add(`kuro-media-wrap--${align}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an HTML table string with contenteditable cells.
 * @param {number} [rows=2]
 * @param {number} [cols=2]
 * @returns {string}
 */
export function createTableHtml(rows = 2, cols = 2) {
  // ヘッダー行 (<th> / <thead>) の概念は廃止。全セル <td> で統一する。
  // <th> 固有の background-color が inline スタイルの解除をマスクする問題と、
  // <thead>/<tbody> の境界が縦方向の rowspan を妨げる問題を同時に解消する。
  const tdRow   = Array.from({ length: cols }, () => '<td contenteditable="true"><br></td>').join('')
  const allRows = Array.from({ length: rows }, () => `<tr>${tdRow}</tr>`).join('')
  return `<table class="kuro-table"><tbody>${allRows}</tbody></table>`
}

/**
 * Walk up the DOM from `node` to find the nearest td/th ancestor.
 * @param {Node} node
 * @returns {HTMLTableCellElement|null}
 */
export function findCell(node) {
  let el = node instanceof Element ? node : node.parentElement
  while (el) {
    if (el.tagName === 'TD' || el.tagName === 'TH') return el
    el = el.parentElement
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// POPUP MENU (popm) — shown above/below selection
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR PICKER — shared color-selection UI used everywhere a color is chosen
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reusable color picker.
 *
 * Behaviour callbacks are passed via constructor options.
 *
 * Lifecycle (each interaction):
 *   1. native picker mousedown OR swatch mousedown
 *      → e.preventDefault()
 *      → onBeforePick()      ← caller does focus / range bookkeeping
 *   2. swatch click resolves a color OR native picker's `input` event fires
 *      → onBeforePick() (again, in case `input` runs after focus drift)
 *      → onPick(color)
 *
 * Clear (×) swatch:
 *   → onBeforePick()
 *   → onClear()
 *
 * @example
 *   const picker = new ColorPicker({
 *     onBeforePick: () => popm.restoreRange(),
 *     onPick:       (c) => editor._applyColor(c),
 *     onClear:      () => editor._clearColor(),
 *   })
 *   container.appendChild(picker.el)
 */
export class ColorPicker {
  /**
   * @param {{
   *   allowClear?:   boolean,
   *   showCustom?:   boolean,
   *   onBeforePick?: () => void,
   *   onPick:        (color: string) => void,
   *   onClear?:      () => void,
   * }} opts
   */
  constructor(opts) {
    this.opts = opts
    this.el   = createElement('div', { className: 'kuro-color-picker' })
    this._customRow = null
    this._addInput  = null
    this._build()
  }

  _build() {
    const { allowClear = true, showCustom = true } = this.opts

    // ── Header: [× 色削除] ──────────────── [＋ カラー追加] ──────────────
    const header = createElement('div', { className: 'kuro-color-picker__header' })

    if (allowClear) {
      const clearBtn = createElement('button', {
        className: 'kuro-color-swatch',
        html: '×',
        attrs: {
          type: 'button', title: '色なし', 'aria-label': '色なし',
          style: 'background:repeating-conic-gradient(#555 0% 25%,#333 0% 50%) 0/8px 8px;font-size:13px;line-height:1.25rem;color:#ef4444;font-weight:700',
        },
      })
      clearBtn.addEventListener('mousedown', (e) => {
        e.preventDefault(); this.opts.onBeforePick?.(); this.opts.onClear?.()
      })
      header.appendChild(clearBtn)
    }

    if (showCustom) {
      this._addInput = createElement('input', {
        className: 'kuro-color-add-input',
        attrs: { type: 'color', value: '#ffffff', 'aria-hidden': 'true', tabindex: '-1' },
      })
      this._addInput.addEventListener('mousedown', () => this.opts.onBeforePick?.())
      this._addInput.addEventListener('input', (e) => {
        const color = e.target.value
        this.opts.onBeforePick?.()
        const saved = ColorPicker._loadCustomColors()
        if (!saved.includes(color)) {
          ColorPicker._saveCustomColors([color, ...saved].slice(0, 27))
          this._rebuildCustomRow()
        }
        this.opts.onPick(color)
      })
      const addBtn = createElement('button', {
        className: 'kuro-color-add-btn',
        html: '＋ カラー追加',
        attrs: { type: 'button', title: 'カスタムカラーを追加' },
      })
      addBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this.opts.onBeforePick?.() })
      addBtn.addEventListener('click', () => this._addInput.click())
      header.appendChild(addBtn)
      this.el.appendChild(this._addInput)
    }
    this.el.appendChild(header)

    // ── Groups: 5 × (3 cols × 3 rows), flex-wrap for narrow viewports ─────
    const groupsRow = createElement('div', { className: 'kuro-color-picker__groups' })
    for (const group of COLOR_GROUPS) {
      const groupEl = createElement('div', {
        className: 'kuro-color-group',
        attrs: { title: group.name },
      })
      for (const color of group.colors) groupEl.appendChild(this._makeSwatch(color))
      groupsRow.appendChild(groupEl)
    }
    this.el.appendChild(groupsRow)

    // ── Custom row: 20 slots (filled or empty-bordered) ───────────────────
    if (showCustom) {
      this._customRow = createElement('div', { className: 'kuro-color-picker__custom' })
      this.el.appendChild(this._customRow)
      this._rebuildCustomRow()
    }
  }

  _rebuildCustomRow() {
    if (!this._customRow) return
    const saved = ColorPicker._loadCustomColors()
    this._customRow.innerHTML = ''
    // 3 blocks × 9 slots = 27 max, matching the 3×3 block unit of preset groups
    for (let b = 0; b < 3; b++) {
      const group = createElement('div', { className: 'kuro-color-group' })
      for (let s = 0; s < 9; s++) {
        const idx = b * 9 + s
        group.appendChild(
          idx < saved.length
            ? this._makeSwatch(saved[idx])
            : createElement('div', { className: 'kuro-color-slot--empty', attrs: { 'aria-hidden': 'true' } })
        )
      }
      this._customRow.appendChild(group)
    }
  }

  _makeSwatch(color) {
    const sw = createElement('button', {
      className: 'kuro-color-swatch',
      attrs: { type: 'button', style: `background-color:${color}`, title: color, 'aria-label': color },
    })
    sw.addEventListener('mousedown', (e) => {
      e.preventDefault(); this.opts.onBeforePick?.(); this.opts.onPick(color)
    })
    return sw
  }

  static _loadCustomColors() {
    try {
      const s = localStorage.getItem('kuro-custom-colors')
      return s ? JSON.parse(s).filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 27) : []
    } catch { return [] }
  }

  static _saveCustomColors(colors) {
    try { localStorage.setItem('kuro-custom-colors', JSON.stringify(colors)) } catch {}
  }
}

export class PopupMenu {
  /**
   * @param {HTMLElement} container     - element to append this popup into
   * @param {HTMLElement} [constraintEl] - element whose bounds constrain horizontal position
   */
  constructor(container, constraintEl = null) {
    this.container      = container
    this.constraintEl   = constraintEl   // edit pane — keeps popm inside its horizontal bounds
    this._commands      = []
    this._clearColorFn  = null   // set by KuroEditor via setClearColorFn()
    this._applyColorFn  = null   // set by KuroEditor via setApplyColorFn()
    this._activeRange   = null   // range saved at show() time; all sub-panel ops use this
    this._activeULNode  = null   // <ul> element under cursor (set by _updateULStyleLabel)
    this._activeOLNode  = null   // <ol> element under cursor (set by _updateListStyleLabel)

    // Root element (position: fixed in CSS)
    this.el = createElement('div', {
      className: 'kuro-popm',
      attrs: { role: 'toolbar', 'aria-label': 'テキスト書式' },
    })

    // Main button row
    this._mainRow = createElement('div', { className: 'kuro-popm__main' })
    this.el.appendChild(this._mainRow)

    // Colour picker sub-panel (shown inline beneath buttons)
    this._colorPanel = createElement('div', { className: 'kuro-popm__colors' })
    this._buildColorPanel()
    this.el.appendChild(this._colorPanel)

    container.appendChild(this.el)
  }

  // ── Shared sub-panel button binding ──────────────────────────────────────

  /**
   * Bind the unified action handler to a sub-panel button element.
   *
   * Every "action" button inside a sub-panel (colour swatch, size option,
   * line-height option) goes through this single method so the behaviour is
   * identical and maintained in one place:
   *
   *   1. e.preventDefault()   — keep focus in the wysiwyg contenteditable
   *   2. restoreRange()        — re-apply the selection captured at show() time;
   *                              guards against focus drift to the picker element
   *   3. handler()             — apply the formatting + hide the sub-panel
   *   4. rAF(_updateActiveStates()) — refresh ALL indicators after the DOM settles
   *                              (includes bold/italic state, align icons, size %)
   *
   * Using this helper guarantees that new sub-panel buttons added in the future
   * automatically get the same lifecycle without per-button wiring.
   *
   * @param {HTMLElement} el
   * @param {function} handler
   * @returns {HTMLElement} el  (for fluent chaining if needed)
   */
  _bindSubBtn(el, handler) {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.restoreRange()
      handler()
      requestAnimationFrame(() => this._updateActiveStates())
    })
    return el
  }

  // ── Color panel ──────────────────────────────────────────────────────────

  /** Register a function that clears text colour from the current selection. */
  setClearColorFn(fn)  { this._clearColorFn = fn }

  /** Register a function that applies a colour to the current selection. */
  setApplyColorFn(fn)  { this._applyColorFn = fn }

  /**
   * Re-apply the range that was saved when the popup was shown.
   * Called before every colour/size operation to guard against focus loss.
   *
   * Order matters: focus() → removeAllRanges() → addRange().
   * In Safari, removeAllRanges() on a contenteditable fires a blur event.
   * Calling focus() first (and again after if needed) keeps the element active
   * so the restored selection is shown as a visible highlight.
   */
  restoreRange() {
    if (!this._activeRange) return
    const r   = this._activeRange
    const sel = window.getSelection()
    if (!sel) return
    try {
      // setBaseAndExtent is atomic — it never creates an intermediate "empty
      // selection" state, so it avoids the Chrome / Safari issue where the
      // brief gap between removeAllRanges() and addRange() resets internal
      // selection bookkeeping and makes the subsequent highlight invisible.
      sel.setBaseAndExtent(r.startContainer, r.startOffset, r.endContainer, r.endOffset)
    } catch {
      // Fallback for very old browsers that lack setBaseAndExtent
      this.constraintEl?.focus({ preventScroll: true })
      try { sel.removeAllRanges(); sel.addRange(r) } catch (_) {}
    }
  }

  _buildColorPanel() {
    // For native picker, save range on mousedown (before focus drift), then
    // restore it on each invocation so the selection is still active.
    const picker = new ColorPicker({
      onBeforePick: () => {
        // mousedown on a swatch or the native picker — snapshot the live range
        const sel = window.getSelection()
        if (sel?.rangeCount && !sel.isCollapsed) {
          this._activeRange = sel.getRangeAt(0).cloneRange()
        }
        this.restoreRange()
      },
      onPick: (color) => {
        this._applyColorFn?.(color)
        this._hideColors()
        requestAnimationFrame(() => this._updateActiveStates())
      },
      onClear: () => {
        this._clearColorFn?.()
        this._hideColors()
        requestAnimationFrame(() => this._updateActiveStates())
      },
    })
    this._colorPanel.appendChild(picker.el)
  }

  _showColors() { this._colorPanel.classList.add('kuro-popm__colors--visible') }
  _hideColors() { this._colorPanel.classList.remove('kuro-popm__colors--visible') }
  _toggleColors() {
    this._colorPanel.classList.contains('kuro-popm__colors--visible')
      ? this._hideColors() : this._showColors()
  }

  // ── Builder API ───────────────────────────────────────────────────────────

  /**
   * Add a toggle button that executes a formatting command.
   * @param {string} label - innerHTML of button
   * @param {string} command - used for aria-label + active-state detection
   * @param {function} handler
   * @returns {this}
   */
  addButton(label, command, handler, title = null) {
    const tip = title ?? POPM_TITLES[command] ?? command
    const btn = createElement('button', {
      className: 'kuro-popm__btn',
      html: label,
      attrs: { type: 'button', title: tip, 'aria-label': tip, 'data-command': command },
    })
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      handler(command, btn)
      // Re-evaluate all active states after the browser processes the format change
      requestAnimationFrame(() => this._updateActiveStates())
    })
    this._mainRow.appendChild(btn)
    this._commands.push({ command, btn })
    return this
  }

  /** Add a visual separator. @returns {this} */
  addDivider() {
    this._mainRow.appendChild(createElement('span', { className: 'kuro-popm__divider' }))
    return this
  }

  /** Add the text-colour button (toggles colour sub-panel). @returns {this} */
  addColorButton() {
    const btn = createElement('button', {
      className: 'kuro-popm__btn kuro-popm__btn--color',
      html: '<span class="kuro-color-indicator">A</span>',
      attrs: { type: 'button', 'aria-label': '文字色', title: '文字色' },
    })
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._hideSizes()       // close other sub-panels
      this._hideLineHeights()
      this._hideListStyles()
      this._hideULStyles()
      this._hideCalloutPanel()
      this._hideFontFamily()
      this._toggleColors()
    })
    this._mainRow.appendChild(btn)
    return this
  }

  /**
   * Add a font-size button that opens an inline size-picker panel.
   * Replaces the native <select> to avoid OS/browser styling inconsistencies.
   * Initial value is 100% (visually marked as baseline).
   * @param {function(string):void} applyFn
   * @returns {this}
   */
  addFontSizeButton(applyFn) {
    // ── Toggle button ─────────────────────────────────────────────────────
    // Shows the current selection's font size (e.g. "150%"), defaulting to "100%".
    // Updated by _updateSizeLabel() which is called from _updateActiveStates().
    this._sizeIndicatorEl = createElement('span', { className: 'kuro-size-indicator', html: '100%' })
    const btn = createElement('button', {
      className: 'kuro-popm__btn kuro-popm__btn--size',
      attrs: { type: 'button', 'aria-label': 'フォントサイズ', title: 'フォントサイズ' },
    })
    btn.appendChild(this._sizeIndicatorEl)
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._hideColors()       // close other sub-panels
      this._hideLineHeights()
      this._hideListStyles()
      this._hideULStyles()
      this._hideCalloutPanel()
      this._hideFontFamily()
      this._toggleSizes()
    })
    this._mainRow.appendChild(btn)

    // ── Size picker panel ─────────────────────────────────────────────────
    this._sizePanel = createElement('div', { className: 'kuro-popm__sizes' })
    this._sizeBtns  = []   // keep refs so _updateSizeLabel can toggle active state

    for (const { label, value, base } of FONT_SIZE_OPTIONS) {
      const sb = createElement('button', {
        className: 'kuro-size-btn' + (base ? ' kuro-size-btn--base' : ''),
        html: label,
        attrs: { type: 'button', title: label, 'data-size': value },
      })
      this._bindSubBtn(sb, () => { applyFn(value); this._hideSizes() })
      this._sizeBtns.push({ el: sb, value })
      this._sizePanel.appendChild(sb)
    }

    this.el.appendChild(this._sizePanel)
    return this
  }

  /**
   * Detect the font-size of the current selection and update the size indicator
   * button label + active state of size-picker buttons.
   *
   * Detection order (handles two distinct cursor positions):
   *
   *   A) Caret INSIDE a sized span (normal navigation):
   *      startContainer is a text node; its parentElement has style.fontSize.
   *      → standard upward walk finds it.
   *
   *   B) RIGHT AFTER surroundContents(span):
   *      surroundContents() repositions the Range so that startContainer becomes
   *      the PARENT of the new span, and startOffset is the span's sibling index.
   *      Walking upward from the parent never reaches the span, so (A) misses it.
   *      → check childNodes[startOffset] first.
   */
  _updateSizeLabel() {
    if (!this._sizeIndicatorEl) return
    let label = '100%'
    try {
      const sel = window.getSelection()
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0)
        let node = range.startContainer

        // ── Case B: range is at the parent level, span is a child ────────────
        if (node.nodeType === Node.ELEMENT_NODE) {
          const atCursor = node.childNodes[range.startOffset]
          if (atCursor?.style?.fontSize) {
            label = atCursor.style.fontSize
          } else {
            // Also try the node just before the cursor (for collapsed caret after span)
            const before = node.childNodes[range.startOffset - 1]
            if (before?.style?.fontSize) label = before.style.fontSize
          }
        }

        // ── Case A: walk up from the text node's parent ───────────────────────
        if (label === '100%') {
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const stop = this.constraintEl ?? document.documentElement
          while (node) {
            if (node.style?.fontSize) { label = node.style.fontSize; break }
            if (node === stop) break
            node = node.parentElement
          }
        }
      }
    } catch {}

    this._sizeIndicatorEl.textContent = label

    // Highlight the matching size-picker button (one-of-N active state)
    for (const { el, value } of (this._sizeBtns ?? [])) {
      el.classList.toggle('kuro-size-btn--active', value === label)
    }
  }

  _showSizes()   { this._sizePanel?.classList.add('kuro-popm__sizes--visible') }
  _hideSizes()   { this._sizePanel?.classList.remove('kuro-popm__sizes--visible') }
  _toggleSizes() {
    this._sizePanel?.classList.contains('kuro-popm__sizes--visible')
      ? this._hideSizes() : this._showSizes()
  }

  /**
   * Add a line-height button that opens an inline picker panel.
   * Applies to the block element(s) containing the selection.
   * @param {function(string):void} applyFn
   * @returns {this}
   */
  addLineHeightButton(applyFn) {
    // ── Toggle button ─────────────────────────────────────────────────────
    const btn = createElement('button', {
      className: 'kuro-popm__btn kuro-popm__btn--lh',
      // Three horizontal lines with increasing spacing = line-height icon
      html: `<svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
        <rect x="0" y="0"   width="13" height="1.6" rx="0.8"/>
        <rect x="0" y="4.2" width="13" height="1.6" rx="0.8"/>
        <rect x="0" y="9.4" width="13" height="1.6" rx="0.8"/>
        <rect x="0" y="3"   width="1.6" height="9" rx="0.8" opacity="0.5"/>
        <polygon points="0.8,3 0,4.2 1.6,4.2" fill="currentColor"/>
        <polygon points="0.8,9.4 0,8.2 1.6,8.2" fill="currentColor"/>
      </svg>`,
      attrs: { type: 'button', 'aria-label': '行間', title: '行間（line-height）' },
    })
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._hideColors()       // close other sub-panels
      this._hideSizes()
      this._hideListStyles()
      this._hideULStyles()
      this._hideCalloutPanel()
      this._hideFontFamily()
      this._toggleLineHeights()
    })
    this._mainRow.appendChild(btn)

    // ── Line-height picker panel ───────────────────────────────────────────
    this._lhPanel = createElement('div', { className: 'kuro-popm__sizes' })  // reuse sizes style

    for (const { label, value, base } of LINE_HEIGHT_OPTIONS) {
      const lb = createElement('button', {
        className: 'kuro-size-btn' + (base ? ' kuro-size-btn--base' : ''),
        html: label,
        attrs: { type: 'button', title: `行間 ${value}`, 'data-lh': value },
      })
      this._bindSubBtn(lb, () => { applyFn(value); this._hideLineHeights() })
      this._lhPanel.appendChild(lb)
    }

    this.el.appendChild(this._lhPanel)
    return this
  }

  _showLineHeights()   { this._lhPanel?.classList.add('kuro-popm__sizes--visible') }
  _hideLineHeights()   { this._lhPanel?.classList.remove('kuro-popm__sizes--visible') }
  _toggleLineHeights() {
    this._lhPanel?.classList.contains('kuro-popm__sizes--visible')
      ? this._hideLineHeights() : this._showLineHeights()
  }

  /**
   * Font family button — opens a small picker (default "ゴシック" vs "明朝").
   * Same active-state lifecycle as font-size and line-height.
   *
   * @param {function(string):void} applyFn  receives the font-family CSS value
   * @returns {this}
   */
  addFontFamilyButton(applyFn) {
    // ── Toggle button ─────────────────────────────────────────────────────
    // Italic serif "F" — visually evokes "font/typography".
    const btn = createElement('button', {
      className: 'kuro-popm__btn kuro-popm__btn--font',
      html: '<span class="kuro-font-indicator">F</span>',
      attrs: { type: 'button', 'aria-label': 'フォント', title: 'フォント' },
    })
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._hideColors()
      this._hideSizes()
      this._hideLineHeights()
      this._hideListStyles()
      this._hideULStyles()
      this._hideCalloutPanel()
      this._toggleFontFamily()
    })
    this._mainRow.appendChild(btn)

    // ── Main panel: [ゴシック] [明朝] [Web-Fonts] ─────────────────────────
    this._fontFamilyPanel   = createElement('div', { className: 'kuro-popm__sizes' })
    this._fontFamilyBtns    = []
    this._fontFamilyApplyFn = applyFn
    this._selectedWebFont   = null

    // ── Secondary panel: scrollable web-fonts list (popm の右に出る) ──────
    this._webFontListPanel  = createElement('div', { className: 'kuro-popm__web-fonts' })

    this._renderFontFamilyMain()

    this.el.appendChild(this._fontFamilyPanel)
    this.el.appendChild(this._webFontListPanel)
    return this
  }

  /**
   * Render the 3-button main panel: ゴシック / 明朝 / Web-Fonts.
   * The Web-Fonts button is disabled when no web font is detected on the page.
   */
  _renderFontFamilyMain() {
    if (!this._fontFamilyPanel || !this._fontFamilyApplyFn) return
    this._fontFamilyPanel.innerHTML = ''
    this._fontFamilyBtns = []

    // ① Static categories (each rendered in its own font for preview)
    for (const { label, value, base } of FONT_FAMILY_OPTIONS) {
      const fb = createElement('button', {
        className: 'kuro-size-btn' + (base ? ' kuro-size-btn--base' : ''),
        html: label,
        attrs: { type: 'button', title: label, 'data-font': value },
      })
      fb.style.fontFamily = value
      this._bindSubBtn(fb, () => {
        this._selectedWebFont = null
        this._updateWebFontsBtnLabel()
        this._fontFamilyApplyFn(value)
        this._hideWebFontList()
        this._hideFontFamily()
      })
      this._fontFamilyBtns.push({ el: fb, value })
      this._fontFamilyPanel.appendChild(fb)
    }

    // ② Web-Fonts button
    const webFonts = this._detectLoadedWebFonts()
    this._webFontsBtn = createElement('button', {
      className: 'kuro-size-btn kuro-size-btn--webfonts',
      html: this._webFontsLabel(),
      attrs: { type: 'button' },
    })
    if (webFonts.length === 0) {
      this._webFontsBtn.disabled = true
      this._webFontsBtn.title    = '読み込まれている Web フォントがありません'
      this._webFontsBtn.classList.add('kuro-size-btn--disabled')
    } else {
      this._webFontsBtn.title = `${webFonts.length} 個の Web フォントが利用可能`
      this._webFontsBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        this._toggleWebFontList()
      })
    }
    this._fontFamilyPanel.appendChild(this._webFontsBtn)

    // ③ Build the scrollable web-fonts list
    this._renderWebFontList(webFonts)
  }

  _webFontsLabel() {
    return this._selectedWebFont
      ? `Web-Fonts: ${this._selectedWebFont}`
      : 'Web-Fonts'
  }
  _updateWebFontsBtnLabel() {
    if (this._webFontsBtn) this._webFontsBtn.innerHTML = this._webFontsLabel()
  }

  /** Build the scrollable web-fonts list (each entry rendered in its own font). */
  _renderWebFontList(webFonts) {
    if (!this._webFontListPanel) return
    this._webFontListPanel.innerHTML = ''
    for (const { label, value } of webFonts) {
      const fb = createElement('button', {
        className: 'kuro-web-font-btn',
        html: label,
        attrs: { type: 'button', title: label },
      })
      fb.style.fontFamily = value   // ← each row renders in its own font
      // Web フォントが unloaded のままだとプレビューに反映されない。
      // .load() で先読みすると、 解決後に再描画されてフォント自体で表示される。
      if (typeof document.fonts?.load === 'function') {
        document.fonts.load(`1rem "${label}"`).catch(() => {})
      }
      this._bindSubBtn(fb, () => {
        this._selectedWebFont = label
        this._updateWebFontsBtnLabel()
        this._fontFamilyApplyFn(value)
        this._hideWebFontList()
        this._hideFontFamily()
      })
      this._webFontListPanel.appendChild(fb)
    }
  }

  _showWebFontList() {
    if (!this._webFontListPanel || !this._webFontsBtn) return
    // Web-Fonts ボタンの直右に隙間なしで貼り付ける (popm 自体が position:fixed)。
    const r = this._webFontsBtn.getBoundingClientRect()
    this._webFontListPanel.style.left = `${Math.round(r.right + 2)}px`
    this._webFontListPanel.style.top  = `${Math.round(r.top)}px`
    this._webFontListPanel.classList.add('kuro-popm__web-fonts--visible')
  }
  _hideWebFontList()   { this._webFontListPanel?.classList.remove('kuro-popm__web-fonts--visible') }
  _toggleWebFontList() {
    this._webFontListPanel?.classList.contains('kuro-popm__web-fonts--visible')
      ? this._hideWebFontList() : this._showWebFontList()
  }

  /**
   * Scan `document.fonts` for currently-loaded web fonts and return them as
   * {label, value} entries. Family names that are already referenced by the
   * built-in FONT_FAMILY_OPTIONS (Hiragino etc.) are skipped to avoid
   * duplication, since those are system fonts, not "custom" web fonts.
   */
  _detectLoadedWebFonts() {
    const out  = []
    const seen = new Set()

    // Family names already used inside the static OS-font categories
    const blacklist = new Set()
    for (const { value } of FONT_FAMILY_OPTIONS) {
      for (const part of value.split(',')) {
        blacklist.add(part.trim().replace(/^["']|["']$/g, ''))
      }
    }

    if (typeof document.fonts?.[Symbol.iterator] === 'function') {
      for (const ff of document.fonts) {
        // 'loaded' に加えて 'unloaded' も含める。
        // Google Fonts (display=swap) はページで実際に使われるまで unloaded のまま。
        // 候補リストには出した上で、 ボタンに対して .load() を呼んで即プリロード
        // することでプレビューもライブで表示される。
        if (ff.status === 'error') continue
        const family = ff.family
        if (!family || blacklist.has(family) || seen.has(family)) continue
        seen.add(family)
        out.push({ label: family, value: `"${family}", sans-serif` })
      }
    }
    return out
  }

  _showFontFamily()   {
    // Web fonts can be loaded after the editor was created — re-detect on open.
    this._renderFontFamilyMain()
    this._fontFamilyPanel?.classList.add('kuro-popm__sizes--visible')
    // _renderFontFamilyMain() rebuilds every button fresh (no active class), so
    // re-apply the active highlight for the current selection — otherwise the
    // panel always shows the default (ゴシック ring) even when a web font / 明朝
    // is actually in effect.
    this._updateFontFamilyLabel()
  }
  _hideFontFamily()   {
    this._fontFamilyPanel?.classList.remove('kuro-popm__sizes--visible')
    this._hideWebFontList()
  }
  _toggleFontFamily() {
    this._fontFamilyPanel?.classList.contains('kuro-popm__sizes--visible')
      ? this._hideFontFamily() : this._showFontFamily()
  }

  /**
   * Highlight the font-family picker button matching the selection's effective
   * font. Uses the same caret-position detection as _updateSizeLabel().
   */
  _updateFontFamilyLabel() {
    if (!this._fontFamilyBtns) return
    const baseValue = FONT_FAMILY_OPTIONS.find(o => o.base)?.value ?? ''
    // Start with NO detected font. ゴシック (base) is applied by *clearing* spans,
    // so a selection with no inline font-family is indistinguishable from text
    // merely inheriting the host/site font (e.g. a web font). In that case we must
    // not light up ゴシック as "active" — it keeps only its permanent baseline
    // ring. Only an explicit inline font-family (明朝 / a web font) highlights.
    let label = ''
    try {
      const sel = window.getSelection()
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0)
        let node = range.startContainer

        // ── Case B: range is at the parent level, span is a child ─────────
        if (node.nodeType === Node.ELEMENT_NODE) {
          const atCursor = node.childNodes[range.startOffset]
          if (atCursor?.style?.fontFamily) {
            label = atCursor.style.fontFamily
          } else {
            const before = node.childNodes[range.startOffset - 1]
            if (before?.style?.fontFamily) label = before.style.fontFamily
          }
        }

        // ── Case A: walk up from the text node's parent ───────────────────
        if (!label) {
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
          const stop = this.constraintEl ?? document.documentElement
          while (node) {
            if (node.style?.fontFamily) { label = node.style.fontFamily; break }
            if (node === stop) break
            node = node.parentElement
          }
        }
      }
    } catch {}

    // Highlight the matching picker button.
    // Compare with both the literal CSS string AND a "normalized" form, since
    // browsers may strip quotes / spaces when echoing back style.fontFamily.
    const normalize = (s) => (s || '').replace(/['"\s]/g, '').toLowerCase()
    const labelN = normalize(label)

    // ① Static options (ゴシック / 明朝) — exact normalized match.
    let staticMatched = false
    for (const { el, value } of this._fontFamilyBtns) {
      const on = normalize(value) === labelN
      if (on) staticMatched = true
      el.classList.toggle('kuro-size-btn--active', on)
    }

    // ② Web fonts — when the effective font is neither static option (and not
    //    the bare default), a web font is active. The ゴシック button keeps its
    //    permanent baseline ring (--base), but the *active* highlight must move
    //    onto the Web-Fonts button so ゴシック no longer looks "selected".
    const webActive = !staticMatched && !!labelN && labelN !== normalize(baseValue)
    this._webFontsBtn?.classList.toggle('kuro-size-btn--active', webActive)
    // Mark the matching row in the scrollable list (if currently rendered).
    for (const fb of this._webFontListPanel?.children ?? []) {
      fb.classList.toggle('kuro-web-font-btn--active',
        webActive && normalize(fb.style.fontFamily) === labelN)
    }
  }

  /**
   * Callout (admonition) button that opens an inline type-picker panel.
   * Types: tip / warn / danger / note  (icon + Japanese label per row).
   * Clicking a type wraps the current block in a callout, or changes its type
   * if already inside one.  Toggling the same type again is handled by the editor.
   *
   * @param {function('tip'|'warn'|'danger'|'note'):void} applyFn
   * @returns {this}
   */
  addCalloutButton(applyFn) {
    // Toggle button
    this._calloutBtn = createElement('button', {
      className: 'kuro-popm__btn',
      html: ICON.callout,
      attrs: { type: 'button', 'aria-label': 'コールアウト', title: 'コールアウト' },
    })
    this._calloutBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._hideColors()
      this._hideSizes()
      this._hideLineHeights()
      this._hideListStyles()
      this._hideULStyles()
      this._hideFontFamily()
      this._toggleCalloutPanel()
    })
    this._mainRow.appendChild(this._calloutBtn)

    // Picker panel
    this._calloutPanel = createElement('div', { className: 'kuro-popm__sizes' })
    this._calloutBtns  = []   // refs for _updateCalloutActive sync
    const types = [
      { type: 'tip',    icon: '💡', label: 'ヒント' },
      { type: 'warn',   icon: '⚠️', label: '注意'   },
      { type: 'danger', icon: '❗', label: '警告'   },
      { type: 'note',   icon: '📌', label: 'メモ'   },
    ]
    for (const { type, icon, label } of types) {
      const tb = createElement('button', {
        className: 'kuro-size-btn',
        html: `${icon} ${label}`,
        attrs: { type: 'button', title: label, 'data-callout': type },
      })
      this._bindSubBtn(tb, () => { applyFn(type); this._hideCalloutPanel() })
      this._calloutBtns.push({ el: tb, type })
      this._calloutPanel.appendChild(tb)
    }
    this.el.appendChild(this._calloutPanel)
    return this
  }

  /**
   * Highlight the matching callout sub-panel button + the main toggle button
   * when the caret is inside a .kuro-callout block.
   */
  _updateCalloutActive() {
    if (!this._calloutBtns) return
    let activeType = null

    const findCallout = (startNode) => {
      let node = startNode
      if (!node) return null
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
      const stop = this.constraintEl ?? document.documentElement
      while (node && node !== stop) {
        if (node.classList?.contains('kuro-callout')) return node
        node = node.parentElement
      }
      return null
    }

    try {
      const sel = window.getSelection()
      let callout = null
      if (sel?.rangeCount) callout = findCallout(sel.getRangeAt(0).startContainer)
      if (!callout && this._activeRange) callout = findCallout(this._activeRange.startContainer)
      if (callout) {
        activeType = [...callout.classList]
          .map(c => c.match(/^kuro-callout--(\w+)$/)?.[1])
          .find(Boolean) ?? null
      }
    } catch {}

    for (const { el, type } of this._calloutBtns) {
      el.classList.toggle('kuro-size-btn--active', type === activeType)
    }
    this._calloutBtn?.classList.toggle('kuro-popm__btn--active', activeType !== null)
  }

  _showCalloutPanel()   { this._calloutPanel?.classList.add('kuro-popm__sizes--visible') }
  _hideCalloutPanel()   { this._calloutPanel?.classList.remove('kuro-popm__sizes--visible') }
  _toggleCalloutPanel() {
    this._calloutPanel?.classList.contains('kuro-popm__sizes--visible')
      ? this._hideCalloutPanel() : this._showCalloutPanel()
  }

  /**
   * Create the OL style picker sub-panel — NO visible toggle button is added to
   * the main row.  The sub-panel is toggled open/closed by the OL icon button
   * (whose handler calls _toggleListStyles).
   *
   * Sub-panel layout:
   *   「解除」 — removes the nearest <ol> (equivalent to the old toggle-off action)
   *   7 style options: 1.  ①  (1)  A.  (A)  ア  (ア)
   *
   * @param {function(string):void} applyFn  — receives 'kuro-list-remove' or a CSS class name
   * @returns {this}
   */
  initOLStylePanel(applyFn) {
    this._listStylePanel = createElement('div', { className: 'kuro-popm__sizes' })
    this._listStyleBtns  = []   // refs for _updateListStyleLabel active-state sync

    // ── Marker color button — toggles embedded color picker section ───────
    this._olMarkerColorBtn = createElement('button', {
      className: 'kuro-size-btn kuro-marker-color-btn',
      html: '●',
      attrs: { type: 'button', title: '記号の色', 'aria-label': 'マーカー色' },
    })
    this._olMarkerColorBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._olMarkerColorSection?.classList.toggle('kuro-marker-color-section--visible')
    })
    this._listStylePanel.appendChild(this._olMarkerColorBtn)

    // ── "解除" button — remove the OL ────────────────────────────────────
    this._olRemoveBtn = createElement('button', {
      className: 'kuro-size-btn',
      html: '解除',
      attrs: { type: 'button', title: '番号リストを解除', 'data-ol-style': 'kuro-list-remove' },
    })
    this._bindSubBtn(this._olRemoveBtn, () => { applyFn('kuro-list-remove'); this._hideListStyles() })
    this._listStylePanel.appendChild(this._olRemoveBtn)

    // ── Style option buttons ───────────────────────────────────────────────
    // NOTE: Selecting a style does NOT close the panel so the marker-color ●
    // button (which appears after a list is created) remains accessible in the
    // same panel opening.  The panel closes via the UL icon toggle, 解除, or
    // when another toolbar section opens (colors, sizes, etc.).
    for (const { label, value } of OL_STYLE_OPTIONS) {
      const sb = createElement('button', {
        className: 'kuro-size-btn',
        html: label,
        attrs: { type: 'button', title: label, 'data-ol-style': value },
      })
      this._bindSubBtn(sb, () => applyFn(value))
      this._listStyleBtns.push({ el: sb, value })
      this._listStylePanel.appendChild(sb)
    }

    // ── Marker color section (full-width row embedded in the panel) ───────
    this._olMarkerColorSection = createElement('div', { className: 'kuro-marker-color-section' })
    const olPicker = new ColorPicker({
      defaultCustomColor: '#ef4444',
      onPick: (color) => {
        this._activeOLNode?.style.setProperty('--kuro-marker-color', color)
        this._olMarkerColorBtn.style.color = color
        this._olMarkerColorSection.classList.remove('kuro-marker-color-section--visible')
      },
      onClear: () => {
        this._activeOLNode?.style.removeProperty('--kuro-marker-color')
        this._olMarkerColorBtn.style.color = ''
        this._olMarkerColorSection.classList.remove('kuro-marker-color-section--visible')
      },
    })
    this._olMarkerColorInput = olPicker._customInput
    this._olMarkerColorSection.appendChild(olPicker.el)
    this._listStylePanel.appendChild(this._olMarkerColorSection)

    this.el.appendChild(this._listStylePanel)
    return this
  }

  /**
   * Highlight the style-picker button that matches the <ol> under the caret.
   * Called from _updateActiveStates() on every selection change.
   * No indicator text (no separate button) — just updates active class on picker buttons.
   */
  _updateListStyleLabel() {
    if (!this._listStyleBtns) return
    let activeValue = 'kuro-list-decimal'   // default: no explicit class = decimal
    let olNode = null

    // Helper: walk up from a node to find the nearest <ol> ancestor
    const findOL = (startNode) => {
      let node = startNode
      if (!node) return null
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
      const stop = this.constraintEl ?? document.documentElement
      while (node && node !== stop) {
        if (node.tagName === 'OL') return node
        node = node.parentElement
      }
      return null
    }

    try {
      const sel = window.getSelection()
      // Primary: walk from the live selection
      if (sel?.rangeCount) olNode = findOL(sel.getRangeAt(0).startContainer)
      // Fallback: use the saved range from when the popup was shown / last moved
      // (handles browsers where getSelection() returns unexpected state after DOM ops)
      if (!olNode && this._activeRange) olNode = findOL(this._activeRange.startContainer)
    } catch {}

    if (olNode) {
      for (const opt of OL_STYLE_OPTIONS) {
        if (olNode.classList.contains(opt.value)) { activeValue = opt.value; break }
      }
    }

    this._activeOLNode = olNode   // store for direct marker-color access

    const inOL = olNode !== null
    // Style buttons: active only when inside an OL and class matches
    for (const { el, value } of this._listStyleBtns) {
      el.classList.toggle('kuro-size-btn--active', inOL && value === activeValue)
    }
    // "解除" is active when the cursor is NOT inside any OL
    this._olRemoveBtn?.classList.toggle('kuro-size-btn--active', !inOL)

    // Marker color button: only visible when inside an OL (no list = nothing to color)
    if (this._olMarkerColorBtn) {
      this._olMarkerColorBtn.style.display = inOL ? '' : 'none'
      if (!inOL) {
        // Collapse the color section if panel is re-opened outside a list
        this._olMarkerColorSection?.classList.remove('kuro-marker-color-section--visible')
      } else {
        const markerColor = olNode.style.getPropertyValue('--kuro-marker-color') || ''
        this._olMarkerColorBtn.style.color = markerColor || ''
        if (this._olMarkerColorInput && markerColor) this._olMarkerColorInput.value = markerColor
      }
    }
  }

  _showListStyles()   { this._listStylePanel?.classList.add('kuro-popm__sizes--visible') }
  _hideListStyles()   {
    this._listStylePanel?.classList.remove('kuro-popm__sizes--visible')
    this._olMarkerColorSection?.classList.remove('kuro-marker-color-section--visible')
  }
  _toggleListStyles() {
    this._listStylePanel?.classList.contains('kuro-popm__sizes--visible')
      ? this._hideListStyles() : this._showListStyles()
  }

  /**
   * Create the UL style picker sub-panel — same pattern as initOLStylePanel.
   * No visible toggle button in the main row; toggled by the UL icon button.
   *
   * Sub-panel: 「解除」 + 12 symbol styles (disc/circle/square + half/full-width)
   *
   * @param {function(string):void} applyFn  — 'kuro-ul-remove' or a CSS class name
   * @returns {this}
   */
  initULStylePanel(applyFn) {
    this._ulStylePanel = createElement('div', { className: 'kuro-popm__sizes' })
    this._ulStyleBtns  = []

    // ── Marker color button — toggles embedded color picker section ───────
    this._ulMarkerColorBtn = createElement('button', {
      className: 'kuro-size-btn kuro-marker-color-btn',
      html: '●',
      attrs: { type: 'button', title: '記号の色', 'aria-label': 'マーカー色' },
    })
    this._ulMarkerColorBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._ulMarkerColorSection?.classList.toggle('kuro-marker-color-section--visible')
    })
    this._ulStylePanel.appendChild(this._ulMarkerColorBtn)

    // ── "解除" button ──────────────────────────────────────────────────────
    this._ulRemoveBtn = createElement('button', {
      className: 'kuro-size-btn',
      html: '解除',
      attrs: { type: 'button', title: '記号リストを解除', 'data-ul-style': 'kuro-ul-remove' },
    })
    this._bindSubBtn(this._ulRemoveBtn, () => { applyFn('kuro-ul-remove'); this._hideULStyles() })
    this._ulStylePanel.appendChild(this._ulRemoveBtn)

    // ── Symbol option buttons ──────────────────────────────────────────────
    // NOTE: Selecting a style does NOT close the panel — same rationale as OL.
    for (const { label, value } of UL_STYLE_OPTIONS) {
      const sb = createElement('button', {
        className: 'kuro-size-btn',
        html: label,
        attrs: { type: 'button', title: label, 'data-ul-style': value },
      })
      this._bindSubBtn(sb, () => applyFn(value))
      this._ulStyleBtns.push({ el: sb, value })
      this._ulStylePanel.appendChild(sb)
    }

    // ── Marker color section ──────────────────────────────────────────────
    this._ulMarkerColorSection = createElement('div', { className: 'kuro-marker-color-section' })
    const ulPicker = new ColorPicker({
      defaultCustomColor: '#ef4444',
      onPick: (color) => {
        this._activeULNode?.style.setProperty('--kuro-marker-color', color)
        this._ulMarkerColorBtn.style.color = color
        this._ulMarkerColorSection.classList.remove('kuro-marker-color-section--visible')
      },
      onClear: () => {
        this._activeULNode?.style.removeProperty('--kuro-marker-color')
        this._ulMarkerColorBtn.style.color = ''
        this._ulMarkerColorSection.classList.remove('kuro-marker-color-section--visible')
      },
    })
    this._ulMarkerColorInput = ulPicker._customInput
    this._ulMarkerColorSection.appendChild(ulPicker.el)
    this._ulStylePanel.appendChild(this._ulMarkerColorSection)

    this.el.appendChild(this._ulStylePanel)
    return this
  }

  /**
   * Highlight the UL style-picker button matching the <ul> under the caret.
   * Called from _updateActiveStates() on every selection change.
   */
  _updateULStyleLabel() {
    if (!this._ulStyleBtns) return
    let activeValue = 'kuro-ul-disc'   // default: no class = disc
    let ulNode = null

    // Helper: walk up from a node to find the nearest <ul> ancestor
    const findUL = (startNode) => {
      let node = startNode
      if (!node) return null
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
      const stop = this.constraintEl ?? document.documentElement
      while (node && node !== stop) {
        if (node.tagName === 'UL') return node
        node = node.parentElement
      }
      return null
    }

    try {
      const sel = window.getSelection()
      // Primary: walk from the live selection
      if (sel?.rangeCount) ulNode = findUL(sel.getRangeAt(0).startContainer)
      // Fallback: use the saved range from when the popup was shown / last moved
      if (!ulNode && this._activeRange) ulNode = findUL(this._activeRange.startContainer)
    } catch {}

    if (ulNode) {
      for (const opt of UL_STYLE_OPTIONS) {
        if (ulNode.classList.contains(opt.value)) { activeValue = opt.value; break }
      }
    }

    this._activeULNode = ulNode   // store for direct marker-color access

    const inUL = ulNode !== null
    // Style buttons: active only when inside a UL and class matches
    for (const { el, value } of this._ulStyleBtns) {
      el.classList.toggle('kuro-size-btn--active', inUL && value === activeValue)
    }
    // "解除" is active when the cursor is NOT inside any UL
    this._ulRemoveBtn?.classList.toggle('kuro-size-btn--active', !inUL)

    // Marker color button: only visible when inside a UL (no list = nothing to color)
    if (this._ulMarkerColorBtn) {
      this._ulMarkerColorBtn.style.display = inUL ? '' : 'none'
      if (!inUL) {
        // Collapse the color section if panel is re-opened outside a list
        this._ulMarkerColorSection?.classList.remove('kuro-marker-color-section--visible')
      } else {
        const markerColor = ulNode.style.getPropertyValue('--kuro-marker-color') || ''
        this._ulMarkerColorBtn.style.color = markerColor || ''
        if (this._ulMarkerColorInput && markerColor) this._ulMarkerColorInput.value = markerColor
      }
    }
  }

  _showULStyles()   { this._ulStylePanel?.classList.add('kuro-popm__sizes--visible') }
  _hideULStyles()   {
    this._ulStylePanel?.classList.remove('kuro-popm__sizes--visible')
    this._ulMarkerColorSection?.classList.remove('kuro-marker-color-section--visible')
  }
  _toggleULStyles() {
    this._ulStylePanel?.classList.contains('kuro-popm__sizes--visible')
      ? this._hideULStyles() : this._showULStyles()
  }

  // ── Show / hide ───────────────────────────────────────────────────────────

  /** Position using fixed coords and show. */
  show() {
    const rect = getSelectionRect()
    if (!rect || rect.width === 0) return

    // Snapshot the current selection so sub-panels can restore it even if
    // focus drifts to a picker element or the sub-panel itself.
    const _sel = window.getSelection()
    if (_sel?.rangeCount) this._activeRange = _sel.getRangeAt(0).cloneRange()

    // ── Width constraint ───────────────────────────────────────────────────
    // popm を pane (constraintEl) の幅に合わせて max-width 制約をかける。
    // 中身ボタン群は既に flex-wrap なので、 全ボタンが横並びに入りきらない
    // 場合は 2 行 (以上) に自動で折り返される。 viewport にも保険のクランプ。
    const VMARGIN = 4    // viewport margin
    const INSET   = 20   // pane の左右 10px ずつインセットと揃える
    let maxW = window.innerWidth - VMARGIN * 2
    if (this.constraintEl) {
      const paneW = this.constraintEl.getBoundingClientRect().width
      maxW = Math.min(maxW, Math.max(200, paneW - INSET))
    }
    this.el.style.maxWidth = `${maxW}px`

    // Measure popup size (invisible pass so layout is up-to-date)
    this.el.classList.add('kuro-popm--measuring')
    const popW = this.el.offsetWidth  || 420
    const popH = this.el.offsetHeight || 44
    this.el.classList.remove('kuro-popm--measuring')

    // ── Vertical: half-char (~10px) above the selection top ────────────────
    // Gap of 18px gives a comfortable ~1.5 line clearance above the caret line.
    const GAP = 18
    let top = rect.top - popH - GAP
    if (top < 4) top = rect.bottom + 6   // flip below when too close to viewport top

    // ── Horizontal: fixed to the left edge of the constraint (pane) ────────
    // The popm does NOT follow the caret horizontally — it stays at the pane
    // left edge so it never drifts or jumps around.
    let left
    if (this.constraintEl) {
      const paneRect = this.constraintEl.getBoundingClientRect()
      left = paneRect.left + 10           // flush to pane left + small inset
      // Clamp so the right edge never exceeds the pane
      if (left + popW > paneRect.right - 10) {
        left = paneRect.right - popW - 10
      }
    } else {
      // Fallback if no constraint (e.g., unit tests)
      left = Math.max(8, rect.left + rect.width / 2 - popW / 2)
      if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8
    }
    // Final viewport clamp — popm が画面右に飛び出ないよう保険。
    // pane が viewport より右にはみ出すような特殊配置でも popm 自体は必ず内側に。
    const VPM = 4   // viewport margin
    if (left + popW > window.innerWidth - VPM) left = window.innerWidth - popW - VPM
    if (left < VPM) left = VPM

    this.el.style.top  = `${top}px`
    this.el.style.left = `${left}px`
    this.el.classList.add('kuro-popm--visible')
    this._updateActiveStates()
  }

  /** Hide popup and all sub-panels. */
  hide() {
    this.el.classList.remove('kuro-popm--visible')
    this._hideColors()
    this._hideSizes()
    this._hideLineHeights()
    this._hideListStyles()
    this._hideULStyles()
    this._hideCalloutPanel()
    this._hideFontFamily()
  }

  _updateActiveStates() {
    // ── Block tag (for H1–H5) ─────────────────────────────────────────────
    let blockTag = ''
    try { blockTag = document.queryCommandValue('formatBlock').toLowerCase() } catch {}

    // ── Text alignment (from inline style, not queryCommandState) ─────────
    // queryCommandState('justifyFull') is unreliable across browsers.
    // Instead we walk up the DOM from the caret and read node.style.textAlign.
    let alignCmd = 'justifyLeft'   // default: assume left
    try {
      const sel = window.getSelection()
      if (sel?.rangeCount) {
        let node = sel.getRangeAt(0).startContainer
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
        const stop = this.constraintEl ?? document.documentElement
        // Include `stop` itself in the walk — _applyAlign may have set the style
        // directly on the wysiwyg container as a last-resort fallback.
        while (node) {
          const ta = node.style?.textAlign
          if (ta === 'center')  { alignCmd = 'justifyCenter'; break }
          if (ta === 'right')   { alignCmd = 'justifyRight';  break }
          if (ta === 'justify') { alignCmd = 'justifyFull';   break }
          if (ta === 'left')    { alignCmd = 'justifyLeft';   break }
          if (node === stop) break
          node = node.parentElement
        }
      }
    } catch {}

    // ── Apply to buttons ──────────────────────────────────────────────────
    const ALIGN_CMDS = new Set(['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'])
    const HDG_TAGS   = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'blockquote'])

    for (const { command, btn } of this._commands) {
      let active = false
      try {
        if (HDG_TAGS.has(command)) {
          active = blockTag === command
        } else if (ALIGN_CMDS.has(command)) {
          active = command === alignCmd
        } else {
          // Bold, italic, underline, strikethrough, lists — use queryCommandState
          active = queryFormat(command)
        }
      } catch {}
      btn.classList.toggle('kuro-popm__btn--active', active)
    }

    // Update the font-size indicator label to reflect the current selection
    this._updateSizeLabel()
    // Update the font-family picker active state for the current selection
    this._updateFontFamilyLabel()
    // Update the OL style indicator (which class is on the nearest <ol>)
    this._updateListStyleLabel()
    // Update the UL style indicator (which class is on the nearest <ul>)
    this._updateULStyleLabel()
    // Update the callout button + sub-panel active state
    this._updateCalloutActive()
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE MANAGER — floating toolbar when cursor is inside a table
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ROUNDBOX MENU  (floating kmenu — appears when cursor is inside .kuro-roundbox)
// ═══════════════════════════════════════════════════════════════════════════════

export class RoundboxMenu {
  /** @param {KuroEditor} editor */
  constructor(editor) {
    this._editor = editor
    this.wysiwyg = editor.wysiwyg
    this._box    = null
    this._build()
  }

  _build() {
    this.el = createElement('div', {
      className: 'kuro-roundbox-menu',
      attrs: { role: 'toolbar', 'aria-label': '角丸ボックス設定' },
    })
    this.el.style.display = 'none'

    this.el.appendChild(createElement('span', {
      className: 'kuro-roundbox-menu__label',
      html: 'BOX設定',
    }))

    // Width select
    this._widthSel = createElement('select', {
      className: 'kuro-roundbox-menu__select',
      attrs: { title: '横幅 %' },
    })
    for (const w of ['30%','40%','50%','60%','70%','80%','90%','100%']) {
      const opt = document.createElement('option')
      opt.value = w; opt.textContent = w
      this._widthSel.appendChild(opt)
    }
    this._widthSel.addEventListener('mousedown', e => e.stopPropagation())
    this._widthSel.addEventListener('change', () => {
      if (!this._box) return
      this._box.dataset.width = this._widthSel.value
      this._applyLayout(this._box)
      this._position()
      this.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
    })
    this.el.appendChild(this._widthSel)

    // Align buttons — use same icons as popm align buttons
    this._alignBtns = []
    const alignWrap = createElement('div', { className: 'kuro-roundbox-menu__aligns' })
    for (const [align, icon, title] of [
      ['left',   ICON.alignLeft,   '左寄せ（回り込み）'],
      ['center', ICON.alignCenter, '中央'],
      ['right',  ICON.alignRight,  '右寄せ（回り込み）'],
    ]) {
      const btn = createElement('button', {
        html: icon,
        attrs: { type: 'button', title, 'data-align': align },
      })
      btn.addEventListener('mousedown', e => e.stopPropagation())
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        if (!this._box) return
        this._box.dataset.align = align
        this._applyLayout(this._box)
        this._alignBtns.forEach(b => b.classList.toggle('active', b.dataset.align === align))
        this.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
      })
      alignWrap.appendChild(btn)
      this._alignBtns.push(btn)
    }
    this.el.appendChild(alignWrap)

    // Delete button — removes the box, promotes its children to parent
    const delBtn = createElement('button', {
      className: 'kuro-roundbox-menu__del',
      html: '× 削除',
      attrs: { type: 'button', title: '角丸ボックスを削除' },
    })
    delBtn.addEventListener('mousedown', e => e.stopPropagation())
    delBtn.addEventListener('click', (e) => {
      e.preventDefault()
      if (!this._box) return
      const box = this._box
      this.deactivate()
      const frag = document.createDocumentFragment()
      while (box.firstChild) frag.appendChild(box.firstChild)
      box.replaceWith(frag)
      this.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
    })
    this.el.appendChild(delBtn)

    document.body.appendChild(this.el)
  }

  _applyLayout(box) {
    const width = box.dataset.width || '100%'
    const align = box.dataset.align || 'center'
    box.style.width = width
    if (align === 'left') {
      box.style.float   = 'left'
      box.style.display = ''
      box.style.margin  = '0 1em 1em 0'
    } else if (align === 'right') {
      box.style.float   = 'right'
      box.style.display = ''
      box.style.margin  = '0 0 1em 1em'
    } else {
      box.style.float   = ''
      box.style.display = 'block'
      box.style.margin  = '0 auto'
    }
  }

  activate(box) {
    this._box = box
    this._widthSel.value = box.dataset.width || '100%'
    const align = box.dataset.align || 'center'
    this._alignBtns.forEach(b => b.classList.toggle('active', b.dataset.align === align))
    this.el.style.display = 'flex'
    this._position()
  }

  deactivate() {
    this._box = null
    this.el.style.display = 'none'
  }

  get isActive() { return !!this._box }

  _position() {
    if (!this._box) return
    const boxRect = this._box.getBoundingClientRect()
    const menuH   = this.el.offsetHeight || 32
    const menuW   = this.el.offsetWidth  || 240
    const GAP     = 6
    const VPM     = 4

    // Two safe candidates — always OUTSIDE the box to never cover typed text
    const topAbove = boxRect.top    - menuH - GAP
    const topBelow = boxRect.bottom + GAP

    // Prefer above; fall back to below when there's no room
    let top = topAbove >= VPM ? topAbove : topBelow

    // Helper: does a given top position overlap with a rect?
    const overlaps = (t, r) => r && t < r.bottom + GAP && t + menuH > r.top - GAP

    // Avoid the active caret — flip to the other side of the box
    const sel = window.getSelection()
    if (sel?.rangeCount) {
      const cr = sel.getRangeAt(0).getBoundingClientRect()
      if ((cr.width || cr.height) && overlaps(top, cr)) {
        top = (top === topAbove) ? topBelow : topAbove
      }
    }

    // Avoid popm — flip to the other side of the box
    const popmEl = this._editor?.popm?.el
    if (popmEl?.classList.contains('kuro-popm--visible')) {
      const pr = popmEl.getBoundingClientRect()
      if (overlaps(top, pr)) {
        top = (top === topAbove) ? topBelow : topAbove
      }
    }

    // Avoid TableManager toolbar — RoundboxMenu has priority, so TableManager moves;
    // but also shift roundboxMenu if table menu is already placed above the box
    const tblEl = this._editor?.tableManager?.el
    if (tblEl?.classList.contains('kuro-table-menu--visible')) {
      const tr = tblEl.getBoundingClientRect()
      if (overlaps(top, tr)) {
        top = (top === topAbove) ? topBelow : topAbove
      }
    }

    // Avoid mmenu (bottom bar) — push up if needed, but stay outside the box
    const mmenuEl = this._editor?.mmenu
    if (mmenuEl) {
      const mr = mmenuEl.getBoundingClientRect()
      if (top + menuH > mr.top - GAP) {
        top = topAbove >= VPM ? topAbove : mr.top - menuH - GAP
      }
    }

    // Final viewport clamp
    top = Math.max(VPM, top)

    // Horizontal: flush to box left, clamp to viewport
    let left = boxRect.left
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8
    left = Math.max(VPM, left)

    // .kuro-roundbox-menu は position:fixed（viewport 基準）。top/left は
    // getBoundingClientRect 由来の viewport 座標をそのまま入れる。
    // （以前 window.scrollY を加算しており、スクロール時にメニューが画面外へ
    //   飛んで「表示されない」バグになっていた）
    this.el.style.top  = top + 'px'
    this.el.style.left = left + 'px'
  }

  destroy() { this.el.remove() }
}

export class TableManager {
  /** @param {KuroEditor} editor */
  constructor(editor) {
    this.editor      = editor
    this.activeTable = null

    this.el = createElement('div', {
      className: 'kuro-table-menu',
      attrs: { role: 'toolbar', 'aria-label': 'テーブル操作' },
    })
    this._build()
    document.body.appendChild(this.el)
  }

  _build() {
    // ── Main button row ──────────────────────────────────────────────────
    this._mainRow = createElement('div', { className: 'kuro-table-menu__main' })

    this._mainRow.appendChild(createElement('span', { className: 'kuro-table-menu__label', html: 'TBL設定' }))
    this._mainRow.appendChild(createElement('span', { className: 'kuro-table-menu__divider' }))

    // Background color button (colored square icon + label)
    this._colorBtn = createElement('button', {
      className: 'kuro-table-menu__btn kuro-table-menu__btn--color',
      html:
        `<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">` +
          `<rect x="0.5" y="0.5" width="12" height="12" rx="2" fill="#ef4444"/>` +
        `</svg>` +
        `<span class="kuro-table-menu__btn-label">背景色</span>`,
      attrs: { type: 'button', title: 'セル背景色' },
    })
    this._colorBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._toggleColorPanel()
    })
    this._mainRow.appendChild(this._colorBtn)

    this._mainRow.appendChild(createElement('span', { className: 'kuro-table-menu__divider' }))

    // Merge buttons
    const mergeDefs = [
      { label: '↓結合', fn: () => { this._mergeDown();  this._updateSplitBtns() } },
      { label: '結合→', fn: () => { this._mergeRight(); this._updateSplitBtns() } },
    ]
    for (const def of mergeDefs) {
      const btn = createElement('button', {
        className: 'kuro-table-menu__btn',
        html: def.label,
        attrs: { type: 'button' },
      })
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); def.fn() })
      this._mainRow.appendChild(btn)
    }

    this._mainRow.appendChild(createElement('span', { className: 'kuro-table-menu__divider' }))

    // Split buttons (disabled when cell is not merged)
    this._splitDownBtn = createElement('button', {
      className: 'kuro-table-menu__btn',
      html: '↓分割',
      attrs: { type: 'button', disabled: '' },
    })
    this._splitDownBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this._splitDown(); this._updateSplitBtns() })
    this._mainRow.appendChild(this._splitDownBtn)

    this._splitRightBtn = createElement('button', {
      className: 'kuro-table-menu__btn',
      html: '分割→',
      attrs: { type: 'button', disabled: '' },
    })
    this._splitRightBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this._splitRight(); this._updateSplitBtns() })
    this._mainRow.appendChild(this._splitRightBtn)

    this._mainRow.appendChild(createElement('span', { className: 'kuro-table-menu__divider' }))

    // Vertical align buttons
    const SVG_TOP    = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5"/><line x1="3" y1="3.75" x2="11" y2="3.75"/><line x1="3" y1="6.25" x2="11" y2="6.25"/></svg>`
    const SVG_MIDDLE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5"/><line x1="3" y1="5.75" x2="11" y2="5.75"/><line x1="3" y1="8.25" x2="11" y2="8.25"/></svg>`
    const SVG_BOTTOM = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5"/><line x1="3" y1="7.75" x2="11" y2="7.75"/><line x1="3" y1="10.25" x2="11" y2="10.25"/></svg>`
    const valignDefs = [
      { value: 'top',    title: '上揃え',   icon: SVG_TOP    },
      { value: 'middle', title: '中央揃え', icon: SVG_MIDDLE },
      { value: 'bottom', title: '下揃え',   icon: SVG_BOTTOM },
    ]
    this._valignBtns = []
    for (const def of valignDefs) {
      const btn = createElement('button', {
        className: 'kuro-table-menu__btn kuro-table-menu__btn--valign',
        html: def.icon,
        attrs: { type: 'button', title: def.title },
      })
      btn._valignValue = def.value
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const cell = this._cell()
        if (!cell) return
        cell.style.verticalAlign = def.value
        this._updateValignBtns()
      })
      this._valignBtns.push(btn)
      this._mainRow.appendChild(btn)
    }

    this._mainRow.appendChild(createElement('span', { className: 'kuro-table-menu__divider' }))

    // Delete table button
    const delTableBtn = createElement('button', {
      className: 'kuro-table-menu__btn kuro-table-menu__btn--valign kuro-table-menu__btn--deltbl',
      html: `<svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="0.5,2.5 10.5,2.5"/><path d="M3.5,2.5v-1h4v1"/><path d="M1.5,2.5l.7,8h6.6l.7-8"/><line x1="4" y1="5" x2="4" y2="8.5"/><line x1="7" y1="5" x2="7" y2="8.5"/></svg>`,
      attrs: { type: 'button', title: 'テーブルを削除' },
    })
    delTableBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this._deleteTable() })
    this._mainRow.appendChild(delTableBtn)

    this.el.appendChild(this._mainRow)

    // ── Color panel ──────────────────────────────────────────────────────
    this._colorPanel = createElement('div', { className: 'kuro-table-menu__colors' })
    this._buildColorPanel()
    this.el.appendChild(this._colorPanel)
  }

  _buildColorPanel() {
    const picker = new ColorPicker({
      onPick: (color) => {
        const cell = this._cell()
        if (cell) cell.style.backgroundColor = color
        this._hideColorPanel()
      },
      onClear: () => {
        this._cell()?.style.removeProperty('background-color')
        this._hideColorPanel()
      },
    })
    this._colorPanel.appendChild(picker.el)
  }

  _showColorPanel() { this._colorPanel.classList.add('kuro-table-menu__colors--visible') }
  _hideColorPanel() { this._colorPanel.classList.remove('kuro-table-menu__colors--visible') }
  _toggleColorPanel() {
    this._colorPanel.classList.contains('kuro-table-menu__colors--visible')
      ? this._hideColorPanel() : this._showColorPanel()
  }

  /** Enable/disable split buttons based on the focused cell's colspan/rowspan. */
  _updateSplitBtns() {
    const cell    = this._cell()
    const colspan = parseInt(cell?.getAttribute('colspan') || '1')
    const rowspan = parseInt(cell?.getAttribute('rowspan') || '1')
    this._splitRightBtn.disabled = colspan <= 1
    this._splitDownBtn.disabled  = rowspan <= 1
  }

  /** Highlight the active vertical-align button for the focused cell. */
  _updateValignBtns() {
    const cell    = this._cell()
    const current = cell?.style.verticalAlign || 'middle'
    for (const btn of this._valignBtns) {
      btn.classList.toggle('kuro-table-menu__btn--active', btn._valignValue === current)
    }
  }

  /** Show toolbar anchored above (or below) the cursor position. */
  /** Show toolbar anchored above (or below) the cursor position. */
  activate(table) {
    this.activeTable = table
    requestAnimationFrame(() => {
      const menuH = this.el.offsetHeight || 36
      const menuW = this.el.offsetWidth  || 200
      const GAP   = 6
      const sel   = window.getSelection()

      const caretRect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null
      const cell = sel?.rangeCount ? findCell(sel.getRangeAt(0).startContainer) : null
      const refRect = (caretRect && caretRect.height > 0)
        ? caretRect
        : (cell?.getBoundingClientRect() ?? table.getBoundingClientRect())

      let top = refRect.top - menuH - GAP
      if (top < 4) top = refRect.bottom + 6

      // Avoid roundboxMenu — position below it if overlapping
      const rbMenu = this.editor.roundboxMenu
      if (rbMenu?.isActive) {
        const rbRect = rbMenu.el.getBoundingClientRect()
        if (rbRect && top < rbRect.bottom + GAP && top + menuH > rbRect.top - GAP) {
          top = rbRect.bottom + GAP
        }
      }

      const left = Math.max(4, Math.min(refRect.left, window.innerWidth - menuW - 4))

      this.el.style.top  = `${top}px`
      this.el.style.left = `${left}px`
      this.el.classList.add('kuro-table-menu--visible')
      this._updateSplitBtns()
      this._updateValignBtns()
    })
  }

  deactivate() {
    this.activeTable = null
    this.el.classList.remove('kuro-table-menu--visible')
    this._hideColorPanel()
  }

  // ── Selection helpers ────────────────────────────────────────────────────

  _cell() {
    const sel = window.getSelection()
    return sel?.rangeCount ? findCell(sel.getRangeAt(0).startContainer) : null
  }

  // ── Merge operations ─────────────────────────────────────────────────────

  _mergeRight() {
    const cell = this._cell()
    const next = cell?.nextElementSibling
    if (!cell || !next) return
    const span = parseInt(cell.getAttribute('colspan') || '1') + parseInt(next.getAttribute('colspan') || '1')
    cell.setAttribute('colspan', String(span))
    cell.innerHTML += next.innerHTML
    next.remove()
  }

  _mergeDown() {
    const cell    = this._cell()
    const colIdx  = cell?.cellIndex ?? -1
    const nextRow = cell?.closest('tr')?.nextElementSibling
    if (!cell || colIdx < 0 || !nextRow) return
    const nextCell = nextRow.cells[colIdx]
    if (!nextCell) return
    const span = parseInt(cell.getAttribute('rowspan') || '1') + parseInt(nextCell.getAttribute('rowspan') || '1')
    cell.setAttribute('rowspan', String(span))
    cell.innerHTML += nextCell.innerHTML
    nextCell.remove()
    if (nextRow.cells.length === 0) nextRow.remove()
  }

  _splitRight() {
    const cell    = this._cell()
    const colspan = parseInt(cell?.getAttribute('colspan') || '1')
    if (!cell || colspan <= 1) return
    cell.removeAttribute('colspan')
    for (let i = 1; i < colspan; i++) {
      const c = document.createElement(cell.tagName)
      c.setAttribute('contenteditable', 'true')
      c.innerHTML = '<br>'
      cell.insertAdjacentElement('afterend', c)
    }
  }

  _splitDown() {
    const cell    = this._cell()
    const colIdx  = cell?.cellIndex ?? -1
    const rowspan = parseInt(cell?.getAttribute('rowspan') || '1')
    if (!cell || colIdx < 0 || rowspan <= 1) return
    cell.removeAttribute('rowspan')
    let row = cell.closest('tr')?.nextElementSibling
    for (let i = 1; i < rowspan && row; i++) {
      const c = document.createElement('td')
      c.setAttribute('contenteditable', 'true')
      c.innerHTML = '<br>'
      const ref = row.cells[colIdx]
      ref ? row.insertBefore(c, ref) : row.appendChild(c)
      row = row.nextElementSibling
    }
  }

  _deleteTable() {
    const table = this.activeTable
    if (!table || !table.isConnected) return
    const wysiwyg = this.editor.wysiwyg
    const p = document.createElement('p')
    p.innerHTML = '<br>'
    table.before(p)
    table.remove()
    this.deactivate()
    this.editor.tableInserter.deactivate()
    wysiwyg.focus()
    window.getSelection().setBaseAndExtent(p, 0, p, 0)
    wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
  }

  destroy() { this.el.remove() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE INSERTER — "+" button appears only on the border the mouse hovers over
// ═══════════════════════════════════════════════════════════════════════════════

export class TableInserter {
  /**
   * @param {HTMLElement} wysiwyg
   * @param {{ onRowBorderClick?: (target,btn)=>void, onColBorderClick?: (target,btn)=>void }} [callbacks]
   */
  constructor(wysiwyg, callbacks = {}) {
    this.wysiwyg        = wysiwyg
    this.activeTable    = null
    this._currentCell   = null   // cell under cursor — drives delete button positions
    this._pendingRowIdx = null
    this._pendingColIdx = null
    this._onRowBorderClick = callbacks.onRowBorderClick
    this._onColBorderClick = callbacks.onColBorderClick

    // Container: transparent wrapper for _onDocMousedown hit-test
    this.container = createElement('div', {
      className: 'kuro-table-inserter',
      attrs: { 'aria-hidden': 'true' },
    })

    // Insert buttons — appear when mouse hovers near a border
    this.rowBtn = this._makeInsertBtn('行を挿入', () => {
      if (this._pendingRowIdx !== null) this._insertRow(this._pendingRowIdx)
    })
    this.colBtn = this._makeInsertBtn('列を挿入', () => {
      if (this._pendingColIdx !== null) this._insertCol(this._pendingColIdx)
    })

    // Delete buttons — appear at the cursor's row / column
    this.rowDelBtn = this._makeDelBtn('行を削除', () => this._deleteRow())
    this.colDelBtn = this._makeDelBtn('列を削除', () => this._deleteCol())

    // Border buttons — right (row border) / bottom (col border)
    // Clicking these opens the LinePopupMenu via the provided callbacks.
    this.rowBorderBtn = this._makeBorderBtn('行の罫線', () => {
      if (this._pendingRowBorderIdx !== null && this._onRowBorderClick) {
        this._onRowBorderClick(
          { table: this.activeTable, axis: 'row', idx: this._pendingRowBorderIdx },
          this.rowBorderBtn,
        )
      }
    })
    this.colBorderBtn = this._makeBorderBtn('列の罫線', () => {
      if (this._pendingColBorderIdx !== null && this._onColBorderClick) {
        this._onColBorderClick(
          { table: this.activeTable, axis: 'col', idx: this._pendingColBorderIdx },
          this.colBorderBtn,
        )
      }
    })

    this.container.appendChild(this.rowBtn)
    this.container.appendChild(this.colBtn)
    this.container.appendChild(this.rowDelBtn)
    this.container.appendChild(this.colDelBtn)
    this.container.appendChild(this.rowBorderBtn)
    this.container.appendChild(this.colBorderBtn)
    document.body.appendChild(this.container)

    this._onMouseMove = (e) => this._handleMouseMove(e)
  }

  activate(table) {
    const wasActive = this.activeTable !== null
    this.activeTable = table
    if (!wasActive) document.addEventListener('mousemove', this._onMouseMove)
  }

  /** Called every time the cursor moves within the table. */
  updateCursor(cell) {
    this._currentCell = cell
    this._updateDelBtns()
  }

  deactivate() {
    if (!this.activeTable) return
    this.activeTable  = null
    this._currentCell = null
    document.removeEventListener('mousemove', this._onMouseMove)
    this._hide()
  }

  _makeInsertBtn(title, onClick) {
    // 「+」を SVG で描画。フォント依存の縦ズレを排除してピクセル単位で中心に揃える。
    const icon = `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">` +
      `<rect x="0" y="4" width="10" height="2" rx="1" fill="currentColor"/>` +
      `<rect x="4" y="0" width="2" height="10" rx="1" fill="currentColor"/>` +
    `</svg>`
    const btn = createElement('button', {
      className: 'kuro-table-insert-btn',
      html: icon,
      attrs: { type: 'button', title },
    })
    btn.style.display = 'none'
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); onClick() })
    return btn
  }

  _makeDelBtn(title, onClick) {
    // 「−」を SVG で描画。文字「−」はフォントごとに baseline が違って中心ズレが起きやすい。
    const icon = `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">` +
      `<rect x="1" y="4" width="8" height="2" rx="1" fill="currentColor"/>` +
    `</svg>`
    const btn = createElement('button', {
      className: 'kuro-table-delete-btn',
      html: icon,
      attrs: { type: 'button', title },
    })
    btn.style.display = 'none'
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); onClick() })
    return btn
  }

  /**
   * Build a border button. Clicking opens the LinePopupMenu via callback.
   * Icon = square with a single inner dashed line (matches the supplied design).
   */
  _makeBorderBtn(title, onClick) {
    const icon = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="2 2"/>
    </svg>`
    const btn = createElement('button', {
      className: 'kuro-table-border-btn',
      html: icon,
      attrs: { type: 'button', title },
    })
    btn.style.display = 'none'
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); onClick() })
    return btn
  }

  /** Position delete buttons based on the cursor's current row / column. */
  _updateDelBtns() {
    if (!this.activeTable || !this._currentCell) {
      this.rowDelBtn.style.display = 'none'
      this.colDelBtn.style.display = 'none'
      return
    }
    const tableRect = this.activeTable.getBoundingClientRect()
    const rowRect   = this._currentCell.closest('tr')?.getBoundingClientRect()
    const cellRect  = this._currentCell.getBoundingClientRect()
    const BTN = 9
    const GAP = 5

    if (rowRect) {
      this.rowDelBtn.style.display = 'flex'
      this.rowDelBtn.style.left = `${Math.round(tableRect.right + GAP)}px`
      this.rowDelBtn.style.top  = `${Math.round(rowRect.top + rowRect.height / 2 - BTN)}px`
    }

    this.colDelBtn.style.display = 'flex'
    this.colDelBtn.style.left = `${Math.round(cellRect.left + cellRect.width / 2 - BTN)}px`
    this.colDelBtn.style.top  = `${Math.round(tableRect.bottom + GAP)}px`
  }

  /**
   * 行を削除する。rowspan を考慮:
   *  ① 上の行から rowspan で削除対象を覆っているセル → rowspan を 1 減らす
   *  ② 削除対象の行に rowspan>1 のセルがある → rowspan-1 で次の行に複製
   *  ③ 行を remove
   */
  _deleteRow() {
    const row   = this._currentCell?.closest('tr')
    const table = this.activeTable
    if (!row || !table) return
    if (table.querySelectorAll('tr').length <= 1) { this._deleteTable(); return }

    const allRows = Array.from(table.querySelectorAll('tr'))
    const rowIdx  = allRows.indexOf(row)

    // ① 上の行から張り出している rowspan を 1 減らす
    for (let i = 0; i < rowIdx; i++) {
      for (const cell of Array.from(allRows[i].cells)) {
        const rs = parseInt(cell.getAttribute('rowspan') || '1')
        if (i + rs > rowIdx) {
          const next = rs - 1
          if (next <= 1) cell.removeAttribute('rowspan')
          else           cell.setAttribute('rowspan', String(next))
        }
      }
    }

    // ② 削除対象の行に rowspan>1 のセルがあれば、次の行に「実体を引き継ぐ」
    const nextRow = allRows[rowIdx + 1]
    if (nextRow) {
      for (const cell of Array.from(row.cells)) {
        const rs = parseInt(cell.getAttribute('rowspan') || '1')
        if (rs > 1) {
          const clone = cell.cloneNode(true)
          const next  = rs - 1
          if (next <= 1) clone.removeAttribute('rowspan')
          else           clone.setAttribute('rowspan', String(next))
          // 次の行で同じ列位置に挿入 (cellIndex ベース、 失敗時は末尾)
          const target = nextRow.cells[cell.cellIndex]
          if (target) nextRow.insertBefore(clone, target)
          else        nextRow.appendChild(clone)
        }
      }
    }

    row.remove()
    this._currentCell = null
    this._updateDelBtns()
  }

  /**
   * 列を削除する。colspan を考慮:
   *  ① 各行で「colIdx を覆っている」セルがあれば colspan を 1 減らす
   *  ② colIdx そのものが先頭のセル (colspan を持つ場合の起点) なら remove
   *  ③ それ以外は普通に colIdx 位置のセルを remove
   */
  _deleteCol() {
    const cell  = this._currentCell
    const table = this.activeTable
    if (!cell || !table) return
    const colIdx = cell.cellIndex
    if (colIdx < 0) return
    const firstRow = table.querySelector('tr')
    if (!firstRow || firstRow.cells.length <= 1) return

    for (const row of Array.from(table.querySelectorAll('tr'))) {
      // 各 cell について「論理列範囲」を走査して colIdx が含まれるものを探す
      let logicalCol = 0
      let removed = false
      for (const c of Array.from(row.cells)) {
        const cs = parseInt(c.getAttribute('colspan') || '1')
        if (logicalCol === colIdx) {
          // このセルが colIdx の起点 → colspan を 1 減らすか remove
          if (cs > 1) {
            const next = cs - 1
            if (next <= 1) c.removeAttribute('colspan')
            else           c.setAttribute('colspan', String(next))
          } else {
            c.remove()
          }
          removed = true
          break
        }
        if (logicalCol < colIdx && logicalCol + cs > colIdx) {
          // colspan で colIdx を覆っているセル → colspan を 1 減らす
          const next = cs - 1
          if (next <= 1) c.removeAttribute('colspan')
          else           c.setAttribute('colspan', String(next))
          removed = true
          break
        }
        logicalCol += cs
      }
      // 何も該当しない (= rowspan で上から張り出している行) はそのまま
      void removed
    }
    this._currentCell = null
    this._updateDelBtns()
  }

  _handleMouseMove(e) {
    if (!this.activeTable) return

    const tableRect = this.activeTable.getBoundingClientRect()
    const mx  = e.clientX
    const my  = e.clientY
    const BTN = 9    // half of + button (18px)
    const BBT = 12   // half of border-cycle button (24px)
    const GAP = 5
    const THR = 10

    const rows = Array.from(this.activeTable.querySelectorAll('tr'))
    if (!rows.length) return

    // ── Row border detection (left zone: + button area + table width) ─────
    // The + button sits to the LEFT of the table edge; the border-cycle
    // button mirrors it to the RIGHT of the table edge so the same horizontal
    // mouse zone shows both.
    const inRowZone = mx >= tableRect.left - BTN * 2 - GAP
                   && mx <= tableRect.right + BBT * 2 + GAP
                   && my >= tableRect.top  - BTN
                   && my <= tableRect.bottom + BTN

    if (inRowZone) {
      let found = false
      for (let i = 0; i <= rows.length; i++) {
        const borderY = i === 0 ? tableRect.top
          : i === rows.length  ? tableRect.bottom
          : rows[i].getBoundingClientRect().top
        if (Math.abs(my - borderY) <= THR) {
          this._pendingRowIdx = i
          this.rowBtn.style.display = 'flex'
          this.rowBtn.style.left = `${Math.round(tableRect.left - BTN * 2 - GAP)}px`
          this.rowBtn.style.top  = `${Math.round(borderY - BTN)}px`

          // Border button on the right side of the SAME row border
          this._pendingRowBorderIdx = i
          this.rowBorderBtn.style.display = 'flex'
          this.rowBorderBtn.style.left = `${Math.round(tableRect.right + GAP)}px`
          this.rowBorderBtn.style.top  = `${Math.round(borderY - BBT)}px`
          found = true
          break
        }
      }
      if (!found) {
        this.rowBtn.style.display = 'none'; this._pendingRowIdx = null
        this.rowBorderBtn.style.display = 'none'; this._pendingRowBorderIdx = null
      }
    } else {
      this.rowBtn.style.display = 'none'
      this._pendingRowIdx = null
      this.rowBorderBtn.style.display = 'none'
      this._pendingRowBorderIdx = null
    }

    // ── Column border detection (top zone: + button area + table height) ──
    const cells = Array.from(rows[0].cells)
    const inColZone = mx >= tableRect.left  - BTN
                   && mx <= tableRect.right + BTN
                   && my >= tableRect.top   - BTN * 2 - GAP
                   && my <= tableRect.bottom + BBT * 2 + GAP

    if (inColZone) {
      let found = false
      for (let i = 0; i <= cells.length; i++) {
        const borderX = i === 0 ? tableRect.left
          : i === cells.length  ? tableRect.right
          : cells[i].getBoundingClientRect().left
        if (Math.abs(mx - borderX) <= THR) {
          this._pendingColIdx = i
          this.colBtn.style.display = 'flex'
          this.colBtn.style.left = `${Math.round(borderX - BTN)}px`
          this.colBtn.style.top  = `${Math.round(tableRect.top - BTN * 2 - GAP)}px`

          // Border button below the SAME column border
          this._pendingColBorderIdx = i
          this.colBorderBtn.style.display = 'flex'
          this.colBorderBtn.style.left = `${Math.round(borderX - BBT)}px`
          this.colBorderBtn.style.top  = `${Math.round(tableRect.bottom + GAP)}px`
          found = true
          break
        }
      }
      if (!found) {
        this.colBtn.style.display = 'none'; this._pendingColIdx = null
        this.colBorderBtn.style.display = 'none'; this._pendingColBorderIdx = null
      }
    } else {
      this.colBtn.style.display = 'none'
      this._pendingColIdx = null
      this.colBorderBtn.style.display = 'none'
      this._pendingColBorderIdx = null
    }
  }

  _hide() {
    this.rowBtn.style.display       = 'none'
    this.colBtn.style.display       = 'none'
    this.rowDelBtn.style.display    = 'none'
    this.colDelBtn.style.display    = 'none'
    this.rowBorderBtn.style.display = 'none'
    this.colBorderBtn.style.display = 'none'
    this._pendingRowIdx = null
    this._pendingColIdx = null
  }

  _insertRow(index) {
    // ヘッダー行廃止: 新規セルは常に <td>。
    const rows = Array.from(this.activeTable.querySelectorAll('tr'))
    if (!rows.length) return
    const refRow = rows[Math.min(index, rows.length - 1)]
    const cols   = refRow.cells.length
    const newRow = document.createElement('tr')
    for (let i = 0; i < cols; i++) {
      const cell = document.createElement('td')
      cell.setAttribute('contenteditable', 'true')
      cell.innerHTML = '<br>'
      newRow.appendChild(cell)
    }
    if (index >= rows.length) {
      rows[rows.length - 1].insertAdjacentElement('afterend', newRow)
    } else {
      rows[index].insertAdjacentElement('beforebegin', newRow)
    }
  }

  _insertCol(index) {
    // ヘッダー行廃止: 新規セルは常に <td>。
    Array.from(this.activeTable.querySelectorAll('tr')).forEach(row => {
      const cells = row.cells
      const cell  = document.createElement('td')
      cell.setAttribute('contenteditable', 'true')
      cell.innerHTML = '<br>'
      if (index >= cells.length) {
        cells[cells.length - 1]?.insertAdjacentElement('afterend', cell)
      } else {
        cells[index]?.insertAdjacentElement('beforebegin', cell)
      }
    })
  }

  destroy() {
    document.removeEventListener('mousemove', this._onMouseMove)
    this.container.remove()
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINE POPUP MENU — opened from a row/col border-cycle button
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Floating popup for setting border line styles.
 *
 * Layout:
 *   ── top row ──   3 scope icons:
 *     [outer]   [inner]   [single]
 *
 *   ── bottom rows ── 4 style choices (icon + label):
 *     ┄ 点線    │ 細線    ┃ 普通線   ▌太線
 *
 * Opening rules:
 *   - Anchored near the rect of the border-cycle button that opened it.
 *   - Closes on outside click, on selection change, or when opened again.
 */
export class LinePopupMenu {
  constructor() {
    this._target = null         // { table, axis: 'row'|'col', idx } passed from caller
    this._scope  = 'single'
    this._lastBorder = null     // last picked border style (e.g. '2px solid')
    this._currentColor = null   // last picked color (null = use neutral.500 default)

    this.el = createElement('div', {
      className: 'kuro-line-popm',
      attrs: { role: 'dialog', 'aria-label': '罫線スタイル' },
    })
    this._build()
    document.body.appendChild(this.el)
  }

  _build() {
    // ── Scope row ─────────────────────────────────────────────────────────
    const scopeRow = createElement('div', { className: 'kuro-line-popm__row kuro-line-popm__scope-row' })

    const scopes = [
      { value: 'outer',  title: '外枠', icon: `<svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>` },
      { value: 'inner',  title: '中の罫線', icon: `<svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"/><line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" stroke-width="2"/><line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" stroke-width="2"/></svg>` },
      { value: 'single', title: 'この罫線のみ', icon: `<svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"/><line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" stroke-width="2"/></svg>` },
    ]
    this._scopeBtns = {}
    for (const { value, title, icon } of scopes) {
      const btn = createElement('button', {
        className: 'kuro-line-popm__scope-btn',
        html: icon,
        attrs: { type: 'button', title, 'data-scope': value },
      })
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        this._scope = value
        this._updateScopeActive()
      })
      this._scopeBtns[value] = btn
      scopeRow.appendChild(btn)
    }
    this.el.appendChild(scopeRow)

    // ── Color row (shared ColorPicker) ───────────────────────────────────
    // Picking a color re-applies the last-chosen style with the new color
    // (so user can change just the color without re-clicking a style).
    this._colorPicker = new ColorPicker({
      defaultCustomColor: '#9ca3af',
      onPick: (color) => {
        this._currentColor = color
        if (this._lastBorder) this._applyStyle(this._lastBorder)
      },
      onClear: () => {
        this._currentColor = null
        if (this._lastBorder) this._applyStyle(this._lastBorder)
      },
    })
    this._colorPicker.el.classList.add('kuro-line-popm__colors')
    this.el.appendChild(this._colorPicker.el)

    // ── Style rows ────────────────────────────────────────────────────────
    const styleList = createElement('div', { className: 'kuro-line-popm__styles' })
    const styles = [
      { key: 'dotted', label: '点線',   border: '1px dotted',  preview: '<svg width="40" height="6"><line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/></svg>' },
      { key: 'thin',   label: '細線',   border: '1px solid',   preview: '<svg width="40" height="6"><line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" stroke-width="1"/></svg>' },
      { key: 'normal', label: '普通線', border: '2px solid',   preview: '<svg width="40" height="6"><line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" stroke-width="2"/></svg>' },
      { key: 'bold',   label: '太線',   border: '3px solid',   preview: '<svg width="40" height="6"><line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" stroke-width="3.5"/></svg>' },
    ]
    for (const { key, label, border, preview } of styles) {
      const btn = createElement('button', {
        className: 'kuro-line-popm__style-btn',
        html: `<span class="kuro-line-popm__preview">${preview}</span><span class="kuro-line-popm__label">${label}</span>`,
        attrs: { type: 'button', title: label, 'data-style': key },
      })
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        this._lastBorder = border
        this._applyStyle(border)
      })
      styleList.appendChild(btn)
    }
    this.el.appendChild(styleList)
  }

  _updateScopeActive() {
    for (const [value, btn] of Object.entries(this._scopeBtns)) {
      btn.classList.toggle('kuro-line-popm__scope-btn--active', value === this._scope)
    }
  }

  /** Apply the chosen border style to the current scope (using the current color). */
  _applyStyle(borderBase) {
    const t = this._target
    if (!t) return
    // Compose: "<width> <style>" + " <color>" if a color has been picked
    const border = this._currentColor ? `${borderBase} ${this._currentColor}` : borderBase

    const { table, axis, idx } = t
    const rows = Array.from(table.querySelectorAll('tr'))
    const colCount = rows[0]?.cells.length ?? 0

    if (this._scope === 'outer') {
      // Outer = top, bottom, left, right borders of the table
      for (const cell of rows[0].cells) cell.style.borderTop    = border
      for (const cell of rows[rows.length - 1].cells) cell.style.borderBottom = border
      for (const tr of rows) {
        if (tr.cells[0])              tr.cells[0].style.borderLeft  = border
        if (tr.cells[colCount - 1])   tr.cells[colCount - 1].style.borderRight = border
      }
    } else if (this._scope === 'inner') {
      // Inner = every border that is NOT the outer edge
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].cells.length; c++) {
          const cell = rows[r].cells[c]
          if (r > 0)                cell.style.borderTop    = border
          if (r < rows.length - 1)  cell.style.borderBottom = border
          if (c > 0)                cell.style.borderLeft   = border
          if (c < colCount - 1)     cell.style.borderRight  = border
        }
      }
    } else {
      // single: only the border at `idx` on the given axis
      if (axis === 'row') {
        if (idx === 0)               for (const cell of rows[0].cells) cell.style.borderTop = border
        else if (idx === rows.length) for (const cell of rows[rows.length - 1].cells) cell.style.borderBottom = border
        else {
          for (const cell of rows[idx - 1].cells) cell.style.borderBottom = border
          for (const cell of rows[idx].cells)     cell.style.borderTop    = border
        }
      } else {
        // axis === 'col'
        for (const tr of rows) {
          if (idx === 0) {
            if (tr.cells[0]) tr.cells[0].style.borderLeft = border
          } else if (idx === colCount) {
            const last = tr.cells[colCount - 1]
            if (last) last.style.borderRight = border
          } else {
            if (tr.cells[idx - 1]) tr.cells[idx - 1].style.borderRight = border
            if (tr.cells[idx])     tr.cells[idx].style.borderLeft      = border
          }
        }
      }
    }
  }

  /**
   * Open the popup near the given anchor element.
   * @param {{ table, axis: 'row'|'col', idx: number }} target
   * @param {HTMLElement} anchorEl - the border-cycle button that triggered this
   */
  open(target, anchorEl) {
    this._target = target
    // Fresh state every time the popup opens
    this._scope        = 'single'
    this._lastBorder   = null
    this._currentColor = null
    this._updateScopeActive()

    this.el.classList.add('kuro-line-popm--visible')

    // Measure & position
    requestAnimationFrame(() => {
      const aRect = anchorEl.getBoundingClientRect()
      const popW  = this.el.offsetWidth  || 220
      const popH  = this.el.offsetHeight || 140
      const GAP   = 6
      const M     = 4  // viewport margin

      let top, left
      if (target.axis === 'row') {
        // 行ボタン: 通常は右に表示。 右がはみ出るなら左に。
        top  = Math.max(M, Math.min(aRect.top + aRect.height / 2 - popH / 2, window.innerHeight - popH - M))
        left = aRect.right + GAP
        if (left + popW > window.innerWidth - M) left = aRect.left - popW - GAP
      } else {
        // 列ボタン: 通常はアンカー中央に揃えて下に表示。
        //   水平: 中央 → 右端はみ出し → 左寄せ → 左端はみ出し
        //   垂直: 下 → はみ出すなら上
        left = aRect.left + aRect.width / 2 - popW / 2
        if (left + popW > window.innerWidth - M) left = window.innerWidth - popW - M
        if (left < M) left = M
        top  = aRect.bottom + GAP
        if (top + popH > window.innerHeight - M) top = aRect.top - popH - GAP
      }

      // 最終クランプ: どの軸でも viewport 内に収める
      left = Math.max(M, Math.min(left, window.innerWidth  - popW - M))
      top  = Math.max(M, Math.min(top,  window.innerHeight - popH - M))

      this.el.style.top  = `${top}px`
      this.el.style.left = `${left}px`
    })
  }

  close() {
    this.el.classList.remove('kuro-line-popm--visible')
    this._target = null
  }

  get isVisible() {
    return this.el.classList.contains('kuro-line-popm--visible')
  }

  destroy() { this.el.remove() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE RESIZER — drag vertical borders to resize column widths (% based)
// ═══════════════════════════════════════════════════════════════════════════════

export class TableResizer {
  /** @param {HTMLElement} wysiwyg */
  constructor(wysiwyg) {
    this.wysiwyg   = wysiwyg
    this._resizing = false
    this._colIdx   = -1
    this._startX   = 0
    this._table    = null
    this._widths   = []
    this._THR      = 6   // px proximity to vertical border to activate resize cursor

    this._onMove = (e) => this._handleMove(e)
    this._onDown = (e) => this._handleDown(e)
    this._onDrag = (e) => this._handleDrag(e)
    this._onUp   = ()  => this._handleUp()

    wysiwyg.addEventListener('mousemove', this._onMove)
    wysiwyg.addEventListener('mousedown', this._onDown)
  }

  // ── Border detection ─────────────────────────────────────────────────────

  /**
   * Scan all .kuro-table elements in the wysiwyg.
   * Returns { table, colIdx } when the mouse is within THR px of a vertical
   * column border, or null when no border is nearby.
   */
  _findBorder(mx, my) {
    for (const table of this.wysiwyg.querySelectorAll('.kuro-table')) {
      const tRect = table.getBoundingClientRect()
      if (my < tRect.top || my > tRect.bottom) continue

      // Use the first row (unmerged cells) to locate column positions
      const firstRow = table.querySelector('tr')
      if (!firstRow) continue
      const cells = Array.from(firstRow.cells)

      for (let i = 0; i < cells.length - 1; i++) {
        const r = cells[i].getBoundingClientRect()
        if (Math.abs(mx - r.right) <= this._THR) {
          return { table, colIdx: i }
        }
      }
    }
    return null
  }

  // ── Mouse handlers ───────────────────────────────────────────────────────

  _handleMove(e) {
    if (this._resizing) return
    this.wysiwyg.style.cursor = this._findBorder(e.clientX, e.clientY) ? 'col-resize' : ''
  }

  _handleDown(e) {
    const hit = this._findBorder(e.clientX, e.clientY)
    if (!hit) return
    e.preventDefault()

    this._resizing = true
    this._table    = hit.table
    this._colIdx   = hit.colIdx
    this._startX   = e.clientX
    this._widths   = this._initColWidths()

    document.addEventListener('mousemove', this._onDrag)
    document.addEventListener('mouseup',   this._onUp)
    document.body.classList.add('kuro-col-resizing')
  }

  _handleDrag(e) {
    if (!this._resizing) return
    const tableW = this._table.getBoundingClientRect().width
    if (!tableW) return

    const delta = (e.clientX - this._startX) / tableW * 100
    const MIN   = 5   // minimum column width %

    let a = this._widths[this._colIdx]     + delta
    let b = this._widths[this._colIdx + 1] - delta
    const total = this._widths[this._colIdx] + this._widths[this._colIdx + 1]

    if (a < MIN) { a = MIN; b = total - MIN }
    if (b < MIN) { b = MIN; a = total - MIN }

    const cols = this._table.querySelector('colgroup')?.children
    if (!cols) return
    cols[this._colIdx].style.width     = `${a.toFixed(2)}%`
    cols[this._colIdx + 1].style.width = `${b.toFixed(2)}%`
  }

  _handleUp() {
    if (!this._resizing) return
    this._resizing = false
    document.removeEventListener('mousemove', this._onDrag)
    document.removeEventListener('mouseup',   this._onUp)
    document.body.classList.remove('kuro-col-resizing')
    this.wysiwyg.style.cursor = ''
  }

  // ── colgroup management ──────────────────────────────────────────────────

  /**
   * Ensure the table has a <colgroup> with one <col> per column.
   * If it doesn't exist yet, build one with equal percentage widths.
   * Returns the current widths as an array of numbers (%).
   */
  _initColWidths() {
    const firstRow = this._table.querySelector('tr')
    if (!firstRow) return []
    const n = firstRow.cells.length

    let cg = this._table.querySelector('colgroup')
    if (!cg || cg.children.length !== n) {
      cg?.remove()
      cg = document.createElement('colgroup')
      const w = +(100 / n).toFixed(4)
      for (let i = 0; i < n; i++) {
        const col = document.createElement('col')
        col.style.width = `${w}%`
        cg.appendChild(col)
      }
      this._table.insertBefore(cg, this._table.firstChild)
    }

    return Array.from(cg.children).map(col => parseFloat(col.style.width) || (100 / n))
  }

  destroy() {
    this.wysiwyg.removeEventListener('mousemove', this._onMove)
    this.wysiwyg.removeEventListener('mousedown', this._onDown)
    document.removeEventListener('mousemove', this._onDrag)
    document.removeEventListener('mouseup',   this._onUp)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS — auto-generated from heading elements
// ═══════════════════════════════════════════════════════════════════════════════

export class TableOfContents {
  /**
   * @param {HTMLElement} panelEl  - the nav element that receives ToC HTML
   * @param {HTMLElement} contentEl - the WYSIWYG contenteditable div
   */
  constructor(panelEl, contentEl) {
    this.panelEl   = panelEl
    this.contentEl = contentEl
    this._update   = debounce(() => this._doUpdate(), 250)

    // 折りたたみ状態 (heading id の Set)
    this._collapsed = new Set()

    this._observer = new MutationObserver(this._update)
    this._observer.observe(contentEl, { childList: true, subtree: true, characterData: true })

    this._doUpdate()
  }

  _doUpdate() {
    const headings = Array.from(this.contentEl.querySelectorAll('h1,h2,h3,h4,h5'))
    // Auto show/hide based on headings, but respect user's explicit hide (kuro-toc--user-hidden)
    if (!this.panelEl.classList.contains('kuro-toc--user-hidden')) {
      this.panelEl.classList.toggle('kuro-toc--hidden', headings.length === 0)
    }
    if (headings.length === 0) return

    // 各見出しに id を付与し、子(より深いレベル)があるか確認
    const items = headings.map((h, i) => {
      if (!h.id) h.id = `kuro-h-${i}`
      return { el: h, id: h.id, level: parseInt(h.tagName[1], 10) }
    })
    for (let i = 0; i < items.length; i++) {
      const next = items[i + 1]
      items[i].hasChildren = !!(next && next.level > items[i].level)
    }

    let html = '<p class="kuro-toc__title">目次</p>'
    for (const it of items) {
      const indent = (it.level - 1) * 10
      const collapsed = this._collapsed.has(it.id)
      const toggle = it.hasChildren
        ? `<button class="kuro-toc__toggle ${collapsed ? 'kuro-toc__toggle--collapsed' : ''}" data-toc-id="${it.id}" aria-label="${collapsed ? '展開' : '折りたたみ'}">▾</button>`
        : `<span class="kuro-toc__toggle-spacer"></span>`
      html +=
        `<div class="kuro-toc__row" data-toc-id="${it.id}" data-toc-level="${it.level}" style="padding-left:${indent + 4}px">` +
          toggle +
          `<a href="#${it.id}" class="kuro-toc__item kuro-toc__item--h${it.level}">${it.el.textContent || '（無題）'}</a>` +
        `</div>`
    }

    this.panelEl.innerHTML = html
    this._applyCollapse()

    // スクロール (見出しクリック)
    this.panelEl.querySelectorAll('.kuro-toc__item').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault()
        const target = this.contentEl.querySelector(a.getAttribute('href'))
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    // 折りたたみトグル
    this.panelEl.querySelectorAll('.kuro-toc__toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const id = btn.dataset.tocId
        if (this._collapsed.has(id)) this._collapsed.delete(id)
        else                          this._collapsed.add(id)
        this._doUpdate()
      })
    })
  }

  /**
   * Hide rows that are below a collapsed parent.
   * 線形に走査して、 collapsed の見出しの level より深い行を hidden に。
   * 次に同レベル以下の行が出たら hidden を解除。
   */
  _applyCollapse() {
    const rows = Array.from(this.panelEl.querySelectorAll('.kuro-toc__row'))
    let hideBelow = null    // この level より深いものを hide
    for (const row of rows) {
      const level = parseInt(row.dataset.tocLevel, 10)
      const id    = row.dataset.tocId

      if (hideBelow !== null && level > hideBelow) {
        row.classList.add('kuro-toc__row--hidden')
      } else {
        row.classList.remove('kuro-toc__row--hidden')
        hideBelow = null
      }
      if (this._collapsed.has(id)) {
        hideBelow = hideBelow === null ? level : Math.min(hideBelow, level)
      }
    }
  }

  destroy() { this._observer.disconnect() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOJI PANEL
// ═══════════════════════════════════════════════════════════════════════════════

export class EmojiPanel {
  /**
   * @param {function(string): void} onSelect - called with the chosen emoji
   */
  constructor(onSelect) {
    this.onSelect = onSelect
    this.el = createElement('div', {
      className: 'kuro-emoji-panel',
      attrs: { role: 'dialog', 'aria-label': '絵文字' },
    })
    this._build()
    document.body.appendChild(this.el)
  }

  _build() {
    const grid = createElement('div', { className: 'kuro-emoji-grid' })
    for (const emoji of EMOJI_LIST) {
      const btn = createElement('button', {
        className: 'kuro-emoji-btn',
        html: emoji,
        attrs: { type: 'button', title: emoji, 'aria-label': emoji },
      })
      btn.addEventListener('click', () => { this.onSelect(emoji); this.hide() })
      grid.appendChild(btn)
    }
    this.el.appendChild(grid)
  }

  /** Show panel anchored below `anchorEl`. */
  show(anchorEl) {
    const rect = anchorEl.getBoundingClientRect()
    this.el.style.top  = `${rect.bottom + 8}px`
    this.el.style.left = `${Math.max(4, rect.left)}px`
    this.el.classList.add('kuro-emoji-panel--visible')
  }

  hide() { this.el.classList.remove('kuro-emoji-panel--visible') }

  toggle(anchorEl) {
    this.el.classList.contains('kuro-emoji-panel--visible')
      ? this.hide() : this.show(anchorEl)
  }

  destroy() { this.el.remove() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA DIALOG — custom popup for image / video insertion
// ═══════════════════════════════════════════════════════════════════════════════

export class MediaDialog {
  /**
   * @param {{
   *   onURL:         (url: string) => void,
   *   onFile:        (file: File)  => void,
   *   hasFileUpload: boolean,
   * }} opts
   */
  constructor({ onURL, onFile, hasFileUpload = false }) {
    this.onURL         = onURL
    this.onFile        = onFile
    this.hasFileUpload = hasFileUpload
    this.el = createElement('div', {
      className: 'kuro-media-dialog',
      attrs: { role: 'dialog', 'aria-label': 'メディア挿入' },
    })
    this._urlInput  = null
    this._fileInput = null
    this._fileLabel = null
    this._build()
    document.body.appendChild(this.el)
  }

  _build() {
    // ── URL text field ──────────────────────────────────────────────────────
    this._urlInput = createElement('input', {
      className: 'kuro-media-dialog__url',
      attrs: {
        type: 'text',
        placeholder: '画像・動画の URL を入力...',
        autocomplete: 'off',
        spellcheck: 'false',
      },
    })

    // ── Footer row ──────────────────────────────────────────────────────────
    const footer = createElement('div', { className: 'kuro-media-dialog__footer' })

    // File select label (wraps hidden <input type="file">)
    this._fileLabel = createElement('label', {
      className: 'kuro-media-dialog__file-btn',
      html: '📁 ファイル選択',
    })
    this._fileInput = createElement('input', {
      attrs: { type: 'file', accept: 'image/*,video/*,audio/*' },
    })
    this._fileInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;'
    this._fileLabel.appendChild(this._fileInput)

    // Show/hide file button depending on whether onMediaUpload is provided
    if (!this.hasFileUpload) this._fileLabel.style.display = 'none'

    // URL link button (right side)
    const linkBtn = createElement('button', {
      className: 'kuro-media-dialog__link-btn',
      html: '上記URLでリンク',
      attrs: { type: 'button' },
    })

    footer.appendChild(this._fileLabel)
    footer.appendChild(linkBtn)
    this.el.appendChild(this._urlInput)
    this.el.appendChild(footer)

    // ── Events ──────────────────────────────────────────────────────────────
    this._fileInput.addEventListener('change', () => {
      const file = this._fileInput.files?.[0]
      if (!file) return
      this.onFile?.(file)   // KuroEditor handles upload + placeholder
      this.hide()
      this._fileInput.value = ''
    })

    linkBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const url = this._urlInput.value.trim()
      if (!url) return
      this.onURL?.(url)
      this.hide()
      this._urlInput.value = ''
    })

    this._urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const url = this._urlInput.value.trim()
        if (!url) return
        this.onURL?.(url)
        this.hide()
        this._urlInput.value = ''
      } else if (e.key === 'Escape') {
        this.hide()
      }
    })
  }

  /**
   * Show dialog positioned near the saved selection range.
   *
   * @param {Range|null}    savedRange   - last caret range (from wysiwyg blur)
   * @param {HTMLElement|null} constraintEl - editor pane for horizontal clamping
   */
  show(savedRange, constraintEl = null) {
    const GAP  = 18
    const popW = 320
    const popH = 90   // approx: input(~38) + gap(8) + footer(~34) + 2×py(10)

    // Get rect from the saved range
    let rect = null
    try { rect = savedRange?.getBoundingClientRect?.() } catch {}
    const hasRect = rect && rect.width > 0

    // ── Vertical ─────────────────────────────────────────────────────────────
    let top
    if (hasRect) {
      top = rect.top - popH - GAP
      if (top < 4) top = rect.bottom + 6
    } else {
      top = Math.max(4, (window.innerHeight - popH) / 2)
    }

    // ── Horizontal ───────────────────────────────────────────────────────────
    let left
    if (constraintEl) {
      const paneRect = constraintEl.getBoundingClientRect()
      left = paneRect.left + 10
      if (left + popW > paneRect.right - 10) left = paneRect.right - popW - 10
    } else if (hasRect) {
      left = Math.max(8, rect.left + rect.width / 2 - popW / 2)
      if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8
    } else {
      left = Math.max(8, (window.innerWidth - popW) / 2)
    }

    this.el.style.top  = `${top}px`
    this.el.style.left = `${left}px`
    this.el.classList.add('kuro-media-dialog--visible')
    // Focus URL field so user can type immediately
    requestAnimationFrame(() => this._urlInput.focus())
  }

  hide() {
    this.el.classList.remove('kuro-media-dialog--visible')
  }

  get isVisible() {
    return this.el.classList.contains('kuro-media-dialog--visible')
  }

  destroy() { this.el.remove() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE MENU (ipopm) — floating toolbar shown when clicking a media element
// ═══════════════════════════════════════════════════════════════════════════════

export class ImageMenu {
  /** @param {KuroEditor} editor */
  constructor(editor) {
    this.editor   = editor
    this.activeEl = null   // the <figure.kuro-media-wrap> currently being edited

    this.el = createElement('div', {
      className: 'kuro-image-menu',
      attrs: { role: 'toolbar', 'aria-label': 'メディア操作' },
    })
    this._sizeBtns  = {}   // size  → button element
    this._alignBtns = {}   // align → button element
    this._sizeRow   = null
    this._build()
    document.body.appendChild(this.el)
  }

  _build() {
    // ── Size row ────────────────────────────────────────────────────────────
    this._sizeRow = createElement('div', { className: 'kuro-image-menu__row' })
    for (const size of IMAGE_SIZE_OPTIONS) {
      const btn = createElement('button', {
        className: 'kuro-image-menu__btn',
        html: size,
        attrs: { type: 'button', title: `幅 ${size}`, 'data-img-size': size },
      })
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); this._applySize(size) })
      this._sizeBtns[size] = btn
      this._sizeRow.appendChild(btn)
    }
    this.el.appendChild(this._sizeRow)

    // ── Align row ───────────────────────────────────────────────────────────
    const alignRow = createElement('div', { className: 'kuro-image-menu__row' })
    const aligns = [
      { label: '← 左',   value: 'left',   title: '左寄せ（テキスト回り込み）' },
      { label: '⇔ 中央', value: 'center', title: '中央揃え' },
      { label: '右 →',   value: 'right',  title: '右寄せ（テキスト回り込み）' },
    ]
    for (const { label, value, title } of aligns) {
      const btn = createElement('button', {
        className: 'kuro-image-menu__btn',
        html: label,
        attrs: { type: 'button', title, 'data-img-align': value },
      })
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); this._applyAlign(value) })
      this._alignBtns[value] = btn
      alignRow.appendChild(btn)
    }
    this.el.appendChild(alignRow)

    // ── Divider + delete + link ─────────────────────────────────────────────
    this.el.appendChild(createElement('div', { className: 'kuro-image-menu__sep' }))

    const bottomRow = createElement('div', { className: 'kuro-image-menu__row' })

    // Delete button
    const delBtn = createElement('button', {
      className: 'kuro-image-menu__btn kuro-image-menu__btn--delete',
      html: '🗑 削除',
      attrs: { type: 'button', title: 'メディアを削除' },
    })
    delBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this._deleteMedia() })
    bottomRow.appendChild(delBtn)

    // Link toggle button (not shown for iframes)
    this._linkToggleBtn = createElement('button', {
      className: 'kuro-image-menu__btn kuro-image-menu__btn--link',
      html: '🔗 リンク',
      attrs: { type: 'button', title: 'URLリンクを設定（クリックで新規タブ）' },
    })
    this._linkToggleBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._toggleLinkPanel()
    })
    bottomRow.appendChild(this._linkToggleBtn)
    this.el.appendChild(bottomRow)

    // ── Link input sub-panel ────────────────────────────────────────────────
    this._linkPanel = createElement('div', { className: 'kuro-image-menu__link-panel' })

    this._linkInput = createElement('input', {
      className: 'kuro-image-menu__link-input',
      attrs: {
        type: 'text',
        placeholder: 'https://example.com',
        autocomplete: 'off',
        spellcheck: 'false',
      },
    })

    const linkSetBtn = createElement('button', {
      className: 'kuro-image-menu__btn',
      html: '設定',
      attrs: { type: 'button' },
    })
    linkSetBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._applyLink(this._linkInput.value.trim())
      this._hideLinkPanel()
    })

    const linkClearBtn = createElement('button', {
      className: 'kuro-image-menu__btn kuro-image-menu__btn--delete',
      html: '削除',
      attrs: { type: 'button' },
    })
    linkClearBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this._applyLink('')
      this._hideLinkPanel()
    })

    this._linkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { this._applyLink(this._linkInput.value.trim()); this._hideLinkPanel() }
      else if (e.key === 'Escape') { this._hideLinkPanel() }
    })

    const linkInputRow = createElement('div', { className: 'kuro-image-menu__row kuro-image-menu__link-input-row' })
    linkInputRow.appendChild(this._linkInput)
    linkInputRow.appendChild(linkSetBtn)
    linkInputRow.appendChild(linkClearBtn)
    this._linkPanel.appendChild(linkInputRow)
    this.el.appendChild(this._linkPanel)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Decode the raw slug and params from data-kuro-media. */
  _decodeAttr() {
    const raw = decodeURIComponent(this.activeEl?.getAttribute('data-kuro-media') || '')
    const pipe = raw.indexOf('|')
    if (pipe === -1) return { slug: raw, size: null, align: null, link: null }
    const { size, align, link } = parseMediaParams(raw.slice(pipe + 1))
    return { slug: raw.slice(0, pipe), size, align, link }
  }

  /** Re-encode and write the data-kuro-media attribute after a change. */
  _writeAttr(slug, size, align, link = null) {
    if (!this.activeEl) return
    this.activeEl.setAttribute('data-kuro-media', buildMediaAttr(slug, size, align, link))
  }

  _applySize(size) {
    if (!this.activeEl) return
    const { slug, align, link } = this._decodeAttr()
    const newSize = (size === '100%') ? null : size
    this._writeAttr(slug, newSize, align, link)
    this.activeEl.style.width = newSize ?? ''
    this._updateActiveStates()
  }

  _applyAlign(align) {
    if (!this.activeEl) return
    const { slug, size, link } = this._decodeAttr()
    this._writeAttr(slug, size, align, link)
    applyMediaLayout(this.activeEl, size, align)
    this._updateActiveStates()
  }

  /** Set or clear the click-through link on the active media figure. */
  _applyLink(url) {
    if (!this.activeEl) return
    const { slug, size, align } = this._decodeAttr()
    const linkUrl = url || null

    this._writeAttr(slug, size, align, linkUrl)

    // Update / add / remove the visible link button inside the figure
    this.activeEl.querySelector('.kuro-media-open-link')?.remove()
    if (linkUrl) {
      this.activeEl.setAttribute('data-kuro-href', linkUrl)
      const a = createElement('a', {
        className: 'kuro-media-open-link',
        html: '↗ URLを新規タブで開く',
        attrs: { href: linkUrl, target: '_blank', rel: 'noopener', contenteditable: 'false' },
      })
      this.activeEl.appendChild(a)
    } else {
      this.activeEl.removeAttribute('data-kuro-href')
    }
    this._updateActiveStates()
  }

  _deleteMedia() {
    if (!this.activeEl) return
    const parent = this.activeEl.parentNode
    const next   = this.activeEl.nextSibling
    this.activeEl.remove()
    // Ensure there's a paragraph to type in after deletion
    if (!next || (next.nodeType === Node.TEXT_NODE && next.textContent === '')) {
      const p = document.createElement('p')
      p.innerHTML = '<br>'
      parent.appendChild(p)
    }
    this.deactivate()
  }

  _updateActiveStates() {
    if (!this.activeEl) return
    const { size, align, link } = this._decodeAttr()
    for (const [s, btn] of Object.entries(this._sizeBtns)) {
      // 100% is "active" when size is null or '100%'
      const active = s === '100%' ? (!size || size === '100%') : s === size
      btn.classList.toggle('kuro-image-menu__btn--active', active)
    }
    for (const [a, btn] of Object.entries(this._alignBtns)) {
      btn.classList.toggle('kuro-image-menu__btn--active', a === align)
    }
    // Link button: highlighted when a link is currently set
    this._linkToggleBtn?.classList.toggle('kuro-image-menu__btn--active', !!link)
  }

  _toggleLinkPanel() {
    const visible = this._linkPanel?.classList.contains('kuro-image-menu__link-panel--visible')
    if (visible) { this._hideLinkPanel() } else { this._showLinkPanel() }
  }

  _showLinkPanel() {
    const { link } = this._decodeAttr()
    if (this._linkInput) this._linkInput.value = link ?? ''
    this._linkPanel?.classList.add('kuro-image-menu__link-panel--visible')
    requestAnimationFrame(() => this._linkInput?.focus())
  }

  _hideLinkPanel() {
    this._linkPanel?.classList.remove('kuro-image-menu__link-panel--visible')
  }

  // ── Show / hide ───────────────────────────────────────────────────────────

  /**
   * Show the toolbar anchored above `figureEl`.
   * @param {HTMLElement} figureEl — a <figure class="kuro-media-wrap"> element
   */
  activate(figureEl) {
    // Deactivate previous target if switching figures
    if (this.activeEl && this.activeEl !== figureEl) {
      this.activeEl.classList.remove('kuro-media-wrap--selected')
    }
    this.activeEl = figureEl
    figureEl.classList.add('kuro-media-wrap--selected')

    // All media types share the same menu content (size / align / link / delete)
    // Only iframes hide the link button — they are already in-place embeds
    const isIframe = figureEl.classList.contains('kuro-media-wrap--iframe')
    if (this._sizeRow) this._sizeRow.style.display = ''
    if (this._linkToggleBtn) {
      this._linkToggleBtn.style.display = isIframe ? 'none' : ''
    }
    this._hideLinkPanel()

    requestAnimationFrame(() => {
      const rect  = figureEl.getBoundingClientRect()
      const menuH = this.el.offsetHeight || 72
      const menuW = this.el.offsetWidth  || 320
      const top   = Math.max(4, rect.top - menuH - 6)
      // Left-align with the figure, clamped to viewport
      const left  = Math.min(Math.max(4, rect.left), window.innerWidth - menuW - 4)
      this.el.style.top  = `${top}px`
      this.el.style.left = `${left}px`
      this.el.classList.add('kuro-image-menu--visible')
      this._updateActiveStates()
    })
  }

  deactivate() {
    if (this.activeEl) {
      this.activeEl.classList.remove('kuro-media-wrap--selected')
    }
    this.activeEl = null
    this.el.classList.remove('kuro-image-menu--visible')
  }

  get isVisible() {
    return this.el.classList.contains('kuro-image-menu--visible')
  }

  destroy() { this.el.remove() }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KURO EDITOR — main class
// ═══════════════════════════════════════════════════════════════════════════════

export class KuroEditor {
  /**
   * @param {HTMLElement} mountEl
   * @param {{
   *   initialContent?: string,
   *   onSave?: (html: string) => void,
   *   urlResolver?: (slug: string) => string,
   *   modalToolbar?: HTMLElement,  // host element to mount the modal menu bar into (slot mode)
   * }} [options]
   */
  constructor(mountEl, options = {}) {
    this.mountEl = mountEl
    this.options = {
      initialContent: '',
      onSave: null,
      urlResolver: defaultResolver,
      modalToolbar: null,
      ...options,
    }
    this._mode          = 'wysiwyg'
    this._tocEnabled              = true   // user's ToC on/off preference (shown by default; auto-hidden when no headings)
    this._savedRange              = null   // last known caret range (for emoji insert)
    this._imageMenuJustDeactivated = false // deactivated by mousedown; skip re-activate on click
    this._autoSaveTimer = null

    this._build()
    this._bindEvents()
    // Honour the restored auto-save preference (the checkbox 'change' event does
    // not fire for the initial programmatic checked state set in _build()).
    if (this.tabAutoSaveCheck?.checked) this._startAutoSave()
    this.setContent(this.options.initialContent)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD
  // ═══════════════════════════════════════════════════════════════════════════

  _build() {
    // Log the version on every editor instantiation so the developer can
    // confirm the deployed bundle matches the source — useful when caching
    // could hide a freshly-built update.
    console.info(`%cKuroEditor v${VERSION}`, 'color:#818cf8;font-weight:bold;')

    this.root = createElement('div', {
      className: 'kuro-editor',
      attrs: { 'data-kuro-editor': VERSION },
    })

    this._buildMMenu()
    this._buildTabs()
    this._buildBody()   // pane + ToC
    this._buildPopm()
    this._buildMediaDialog()
    this._buildImageMenu()

    // Apply initial ToC visibility (hidden by default)
    this.tocPanelEl.classList.add('kuro-toc--user-hidden')

    this.mountEl.replaceWith(this.root)
  }

  // ── Modal Menu (mmenu) ────────────────────────────────────────────────────

  _buildMMenu() {
    // mmenu is a fixed floating toolbar at the bottom of the viewport (not inside editor)
    this.mmenu        = createElement('div', { className: 'kuro-mmenu' })
    this.mmenuActions = createElement('div', { className: 'kuro-mmenu__actions' })

    // ── Undo / Redo (mmenu の先頭) ────────────────────────────────────
    this._mmenuUndoBtn = createElement('button', {
      className: 'kuro-mmenu__btn',
      html: ICON.undo,
      attrs: { type: 'button', 'data-mmenu': 'undo', title: '元に戻す (Ctrl/⌘+Z)' },
    })
    this._mmenuUndoBtn.addEventListener('click', () => this._undo())
    this.mmenuActions.appendChild(this._mmenuUndoBtn)

    this._mmenuRedoBtn = createElement('button', {
      className: 'kuro-mmenu__btn',
      html: ICON.redo,
      attrs: { type: 'button', 'data-mmenu': 'redo', title: 'やり直す (Ctrl/⌘+Shift+Z)' },
    })
    this._mmenuRedoBtn.addEventListener('click', () => this._redo())
    this.mmenuActions.appendChild(this._mmenuRedoBtn)

    // ── 既存アクション ────────────────────────────────────────────────
    const defs = [
      { label: '😊',          id: 'emoji', title: '絵文字' },
      { label: ICON.table,    id: 'table', title: 'テーブル' },
      { label: '🖼',          id: 'media', title: 'メディア' },
      { label: ICON.code,     id: 'code',  title: 'コード' },
      { label: ICON.hr,       id: 'hr',       title: '水平線' },
      { label: ICON.roundbox, id: 'roundbox', title: '角丸ボックス' },
    ]

    this._mmenuBtns = {}
    for (const { label, id, title } of defs) {
      const btn = createElement('button', {
        className: 'kuro-mmenu__btn',
        html: label,
        attrs: { type: 'button', 'data-mmenu': id, title },
      })
      this.mmenuActions.appendChild(btn)
      this._mmenuBtns[id] = btn
    }

    // ── 文字数表示 ────────────────────────────────────────────────────
    this._mmenuCharCount = createElement('span', {
      className: 'kuro-mmenu__char-count',
      html: '文字数 0',
      attrs: { title: '本文の文字数' },
    })

    this.saveBtn = createElement('button', {
      className: 'kuro-mmenu__save',
      html: '保存',
      attrs: { type: 'button' },
    })

    // Divider between action buttons and save button
    const divider = createElement('div', { className: 'kuro-mmenu__divider' })

    this.mmenu.appendChild(this.mmenuActions)
    this.mmenu.appendChild(this._mmenuCharCount)
    this.mmenu.appendChild(divider)
    this.mmenu.appendChild(this.saveBtn)

    // When modalToolbar is provided, mount mmenu into the host slot (inline flow).
    // Otherwise mount fixed to the viewport bottom (default standalone mode).
    const mmenuTarget = this.options.modalToolbar
    if (mmenuTarget) {
      this.mmenu.classList.add('kuro-mmenu--slotted')
      mmenuTarget.appendChild(this.mmenu)
    } else {
      document.body.appendChild(this.mmenu)
    }
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  _buildTabs() {
    this.tabBar = createElement('div', { className: 'kuro-tabs' })

    // Version badge — always visible top-left for build verification.
    // Updated by `npm run bup` (scripts/bump.js) after every fix.
    const versionBadge = createElement('span', {
      className: 'kuro-tabs__version',
      html: `v${VERSION}`,
      attrs: { title: `KuroEditor v${VERSION}`, 'aria-label': `バージョン ${VERSION}` },
    })

    this.tabWysiwyg = createElement('button', {
      className: 'kuro-tab kuro-tab--active',
      html: ICON.eye,
      attrs: { type: 'button', 'data-tab': 'wysiwyg', title: 'プレビュー表示', 'aria-label': 'プレビュー表示' },
    })
    this.tabSource = createElement('button', {
      className: 'kuro-tab',
      html: ICON.source,
      attrs: { type: 'button', 'data-tab': 'source', title: 'HTML 表示', 'aria-label': 'HTML 表示' },
    })

    // ── Inline action buttons — mirrors mmenu so host's modalToolbar is optional ──
    const tabActions = createElement('div', { className: 'kuro-tabs__actions' })

    // Undo / Redo (mmenu と同じ)
    this._tabUndoBtn = createElement('button', {
      className: 'kuro-tabs__action',
      html: ICON.undo,
      attrs: { type: 'button', title: '元に戻す (Ctrl/⌘+Z)' },
    })
    this._tabUndoBtn.addEventListener('click', () => this._undo())
    tabActions.appendChild(this._tabUndoBtn)

    this._tabRedoBtn = createElement('button', {
      className: 'kuro-tabs__action',
      html: ICON.redo,
      attrs: { type: 'button', title: 'やり直す (Ctrl/⌘+Shift+Z)' },
    })
    this._tabRedoBtn.addEventListener('click', () => this._redo())
    tabActions.appendChild(this._tabRedoBtn)

    const tabActionDefs = [
      { label: '😊',       id: 'emoji', title: '絵文字' },
      { label: ICON.table, id: 'table', title: 'テーブル' },
      { label: '🖼',        id: 'media', title: 'メディア' },
      { label: ICON.code,  id: 'code',  title: 'コード' },
      { label: ICON.hr,       id: 'hr',       title: '水平線' },
      { label: ICON.roundbox, id: 'roundbox', title: '角丸ボックス' },
    ]
    this._tabActionBtns = {}
    for (const { label, id, title } of tabActionDefs) {
      const btn = createElement('button', {
        className: 'kuro-tabs__action',
        html: label,
        attrs: { type: 'button', title, 'aria-label': title, 'data-action': id },
      })
      tabActions.appendChild(btn)
      this._tabActionBtns[id] = btn
    }

    // 文字数表示 — HTML 表示アイコンの右側 (row1Left 末尾) に配置
    this._tabCharCount = createElement('span', {
      className: 'kuro-tabs__char-count',
      html: '文字数 0',
      attrs: { title: '本文の文字数' },
    })

    // Autosave checkbox (synced with mmenu's checkbox)
    const tabAutoId = `kuro-tab-autosave-${Math.random().toString(36).slice(2, 7)}`
    this.tabAutoSaveCheck = createElement('input', {
      className: 'kuro-mmenu__autosave-check',
      attrs: { type: 'checkbox', id: tabAutoId, 'aria-label': '自動保存' },
    })
    // Restore the persisted preference; defaults to ON when never set before.
    this.tabAutoSaveCheck.checked = this._readAutoSavePref()
    const tabAutoLabel = createElement('label', {
      className: 'kuro-mmenu__autosave-label',
      html: '自動保存',
      attrs: { for: tabAutoId },
    })
    const tabAutoWrap = createElement('div', { className: 'kuro-tabs__autosave' })
    tabAutoWrap.appendChild(this.tabAutoSaveCheck)
    tabAutoWrap.appendChild(tabAutoLabel)

    // Save button
    this.tabSaveBtn = createElement('button', {
      className: 'kuro-tabs__save',
      html: '保存',
      attrs: { type: 'button' },
    })

    // ── ToC toggle button ─────────────────────────────────────────────────
    const tocSep = createElement('div', { className: 'kuro-tabs__sep' })
    this.tabTocBtn = createElement('button', {
      className: 'kuro-tabs__toc-btn kuro-tabs__toc-btn--active',
      html: `<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
        <rect x="0" y="0" width="10" height="12" rx="1.5" opacity="0.4"/>
        <rect x="11.5" y="0" width="4.5" height="12" rx="1.5"/>
      </svg>`,
      attrs: { type: 'button', title: '目次パネル (Alt+T)', 'aria-label': '目次パネルの表示切り替え' },
    })

    // ── 2 段構造 ──────────────────────────────────────────────────────────
    //   row1 (上): バージョン + タブ ┃ 自動保存 + 保存 + ToC
    //   row2 (下): アクション (Undo/Redo/絵文字/テーブル/メディア/コード/HR) + 文字数
    //
    // スマホでも上段は常に 1 行 (justify-between)、 下段は flex-wrap で
    // 必要に応じて折返し。 結果として「最悪 3 行 → 2 段 + α」になる。
    const row1Left  = createElement('div', { className: 'kuro-tabs__group kuro-tabs__group--left' })
    const row1Right = createElement('div', { className: 'kuro-tabs__group kuro-tabs__group--right' })

    row1Left.appendChild(versionBadge)
    row1Left.appendChild(this.tabWysiwyg)
    row1Left.appendChild(this.tabSource)
    row1Left.appendChild(this._tabCharCount)

    row1Right.appendChild(tabAutoWrap)
    row1Right.appendChild(this.tabSaveBtn)
    row1Right.appendChild(tocSep)
    row1Right.appendChild(this.tabTocBtn)

    const row1 = createElement('div', { className: 'kuro-tabs__row kuro-tabs__row--top' })
    row1.appendChild(row1Left)
    row1.appendChild(row1Right)

    const row2 = createElement('div', { className: 'kuro-tabs__row kuro-tabs__row--bottom' })
    row2.appendChild(tabActions)

    this.tabBar.appendChild(row1)
    this.tabBar.appendChild(row2)
    this.root.appendChild(this.tabBar)
  }

  // ── Body = pane (edit) + ToC panel ───────────────────────────────────────

  _buildBody() {
    this.body = createElement('div', { className: 'kuro-body' })

    // --- Edit pane ---
    this.pane = createElement('div', { className: 'kuro-pane' })

    this.wysiwyg = createElement('div', {
      className: 'kuro-pane__wysiwyg kuro-content',
      attrs: {
        contenteditable: 'true',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'エディター入力エリア',
        spellcheck: 'false',
        'data-placeholder': 'ここに文章を入力してください…',
      },
    })

    this.sourceArea = createElement('textarea', {
      className: 'kuro-pane__source',
      attrs: { spellcheck: 'false', 'aria-label': 'ソースエディター' },
    })

    this.pane.appendChild(this.wysiwyg)
    this.pane.appendChild(this.sourceArea)

    // --- ToC panel ---
    this.tocPanelEl = createElement('nav', { className: 'kuro-toc' })

    // --- Resizer between pane and ToC ---
    // ドラッグで目次の幅を変更できる。幅はインスタンス内で保持され、
    // 目次を一度閉じて再表示しても同じ幅で復元される。
    this.tocResizer = createElement('div', {
      className: 'kuro-toc-resizer',
      attrs: { 'aria-hidden': 'true', title: '目次の幅を変更' },
    })
    this._tocWidth = null   // px — set on first drag

    this.body.appendChild(this.pane)
    this.body.appendChild(this.tocResizer)
    this.body.appendChild(this.tocPanelEl)
    this.root.appendChild(this.body)

    this._bindTocResizer()

    // --- Sub-managers ---
    this.toc = new TableOfContents(this.tocPanelEl, this.wysiwyg)

    this.linePopupMenu = new LinePopupMenu()
    this.roundboxMenu  = new RoundboxMenu(this)
    this.tableManager  = new TableManager(this)
    this.tableInserter = new TableInserter(this.wysiwyg, {
      onRowBorderClick: (target, btn) => this._openLinePopup(target, btn),
      onColBorderClick: (target, btn) => this._openLinePopup(target, btn),
    })
    this.tableResizer  = new TableResizer(this.wysiwyg)

    this.emojiPanel = new EmojiPanel((emoji) => {
      this.wysiwyg.focus()
      if (this._savedRange) {
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(this._savedRange)
      }
      execFormat('insertText', emoji)
    })
  }

  // ── Popup menu (popm) ─────────────────────────────────────────────────────

  _buildPopm() {
    // Pass wysiwyg as constraint: popm stays within its horizontal bounds
    this.popm = new PopupMenu(this.root, this.wysiwyg)
    // Provide colour handlers (DOM-based, no execCommand selection side-effects)
    this.popm.setClearColorFn(() => this._clearColor())
    this.popm.setApplyColorFn((color) => this._applyColor(color))
    this.popm
      .addButton('<b>B</b>',  'bold',          () => this._format('bold'))
      .addButton('<i>I</i>',  'italic',        () => this._format('italic'))
      .addButton('<u>U</u>',  'underline',     () => this._format('underline'))
      .addButton('<s>S</s>',  'strikeThrough', () => this._format('strikeThrough'))
      .addDivider()
      .addButton('H1', 'h1', () => this._formatBlock('h1'))
      .addButton('H2', 'h2', () => this._formatBlock('h2'))
      .addButton('H3', 'h3', () => this._formatBlock('h3'))
      .addButton('H4', 'h4', () => this._formatBlock('h4'))
      .addButton(ICON.quote, 'blockquote', () => this._formatBlock('blockquote'))
      .addCalloutButton((type) => this._applyCallout(type))
      .addButton(ICON.kbd, 'kbd', () => this._toggleKbd())
      .addDivider()
      .addColorButton()
      .addFontSizeButton((size) => this._applyFontSize(size))
      .addFontFamilyButton((family) => this._applyFontFamily(family))
      .addLineHeightButton((lh) => this._applyLineHeight(lh))
      .addDivider()
      .addButton(ICON.alignLeft,    'justifyLeft',   () => this._format('justifyLeft'))
      .addButton(ICON.alignCenter,  'justifyCenter', () => this._format('justifyCenter'))
      .addButton(ICON.alignRight,   'justifyRight',  () => this._format('justifyRight'))
      .addButton(ICON.alignJustify, 'justifyFull',   () => this._format('justifyFull'))
      .addDivider()
      // UL button opens the symbol style picker (解除 + 12 symbols)
      .addButton(ICON.listUl, 'insertUnorderedList', () => {
        this.popm._hideColors()
        this.popm._hideSizes()
        this.popm._hideLineHeights()
        this.popm._hideListStyles()
        this.popm._hideCalloutPanel()
        this.popm._hideFontFamily()
        this.popm._toggleULStyles()
      })
      .initULStylePanel(
        (style) => this._applyULStyle(style),
      )
      // OL button opens the number style picker (解除 + 7 styles)
      .addButton(ICON.listOl, 'insertOrderedList', () => {
        this.popm._hideColors()
        this.popm._hideSizes()
        this.popm._hideLineHeights()
        this.popm._hideULStyles()
        this.popm._hideCalloutPanel()
        this.popm._hideFontFamily()
        this.popm._toggleListStyles()
      })
      .initOLStylePanel(
        (style) => this._applyListStyle(style),
      )
  }

  // ── Image Menu (ipopm) ────────────────────────────────────────────────────

  _buildImageMenu() {
    this.imageMenu = new ImageMenu(this)
  }

  // ── Media Dialog ──────────────────────────────────────────────────────────

  _buildMediaDialog() {
    this.mediaDialog = new MediaDialog({
      hasFileUpload: !!this.options.onMediaUpload,
      onURL:  (url)  => this._insertMediaURL(url),
      onFile: (file) => this._insertMediaFile(file),
    })
  }

  /** Restore saved caret and insert HTML at that position. */
  _restoreAndInsert(html) {
    this.wysiwyg.focus()
    if (this._savedRange) {
      const sel = window.getSelection()
      try { sel.removeAllRanges(); sel.addRange(this._savedRange) } catch {}
    }
    execFormat('insertHTML', html)
  }

  /** Insert media from a URL typed directly in the dialog. */
  _insertMediaURL(url) {
    const enc = buildMediaAttr(url)
    let html

    // ① iframe-embeddable service (YouTube, Vimeo, …)
    const embedUrl = resolveEmbedUrl(url)
    if (embedUrl) {
      html = _buildIframeFigure(embedUrl, enc, null, null) + '<p><br></p>'
    } else if (VIDEO_EXT_RE.test(url)) {
      html = `<figure class="kuro-media-wrap kuro-media-wrap--video" data-kuro-media="${enc}"><video src="${url}" controls class="kuro-media kuro-media--video"></video></figure><p><br></p>`
    } else if (AUDIO_EXT_RE.test(url)) {
      html = `<figure class="kuro-media-wrap kuro-media-wrap--audio" data-kuro-media="${enc}"><audio src="${url}" controls class="kuro-media kuro-media--audio"></audio></figure><p><br></p>`
    } else {
      html = `<figure class="kuro-media-wrap" data-kuro-media="${enc}"><img src="${url}" alt="" class="kuro-media"></figure><p><br></p>`
    }
    this._restoreAndInsert(html)
  }

  /**
   * Insert a placeholder, call onMediaUpload, then swap with the real media.
   * Falls back to a blob URL preview if onMediaUpload is absent (shouldn't
   * happen because the file button is hidden, but guards defensively).
   *
   * @param {File} file
   */
  async _insertMediaFile(file) {
    if (!this.options.onMediaUpload) return

    // ① Insert a loading placeholder so the user sees immediate feedback
    const uid = `kuro-ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    this._restoreAndInsert(
      `<figure class="kuro-media-wrap kuro-media-placeholder" id="${uid}" contenteditable="false">` +
      `<span class="kuro-media-placeholder__spinner"></span>` +
      `<span class="kuro-media-placeholder__label">${file.name}</span>` +
      `</figure><p><br></p>`,
    )

    // ② Call host's upload callback
    try {
      const mid        = await this.options.onMediaUpload(file)
      const displayUrl = this.options.urlResolver?.(mid) ?? mid

      const ph = this.wysiwyg.querySelector(`#${uid}`)
      if (!ph) return

      const enc = buildMediaAttr(mid)
      ph.removeAttribute('id')
      ph.removeAttribute('contenteditable')
      ph.classList.remove('kuro-media-placeholder')
      ph.setAttribute('data-kuro-media', enc)

      const isVideo = VIDEO_EXT_RE.test(displayUrl) || file.type.startsWith('video/')
      const isAudio = !isVideo && (AUDIO_EXT_RE.test(displayUrl) || file.type.startsWith('audio/'))

      if (isVideo) {
        ph.classList.add('kuro-media-wrap--video')
        ph.innerHTML = `<video src="${displayUrl}" controls class="kuro-media kuro-media--video"></video>`
      } else if (isAudio) {
        ph.classList.add('kuro-media-wrap--audio')
        ph.innerHTML = `<audio src="${displayUrl}" controls class="kuro-media kuro-media--audio"></audio>`
      } else {
        ph.innerHTML = `<img src="${displayUrl}" alt="" class="kuro-media">`
      }
    } catch (err) {
      // ③ On failure, replace placeholder with an error indicator
      const ph = this.wysiwyg.querySelector(`#${uid}`)
      if (ph) {
        ph.className = 'kuro-media-wrap kuro-media-error'
        ph.innerHTML =
          `<span class="kuro-media-error__icon">❌</span>` +
          `<span class="kuro-media-error__msg">アップロード失敗: ${file.name}</span>`
      }
      console.error('[KuroEditor] onMediaUpload error:', err)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════════════════════════════════════

  _bindEvents() {
    // Tab switching
    this.tabWysiwyg.addEventListener('click', () => this._setMode('wysiwyg'))
    this.tabSource.addEventListener('click',  () => this._setMode('source'))

    // Save (manual) — mmenu + tab bar
    this.saveBtn.addEventListener('click', () => this.options.onSave?.(this.getContent()))
    this.tabSaveBtn.addEventListener('click', () => this.options.onSave?.(this.getContent()))

    // Auto-save toggle — tab bar is the single source of truth. The choice is
    // persisted (localStorage) so it survives reloads / re-mounts.
    this.tabAutoSaveCheck.addEventListener('change', () => {
      this._writeAutoSavePref(this.tabAutoSaveCheck.checked)
      this.tabAutoSaveCheck.checked ? this._startAutoSave() : this._stopAutoSave()
    })

    // Modal menu (mmenu buttons)
    for (const [id, btn] of Object.entries(this._mmenuBtns)) {
      btn.addEventListener('click', () => this._handleMMenu(id))
    }

    // Tab bar inline action buttons — same handlers, pass button as emoji anchor
    for (const [id, btn] of Object.entries(this._tabActionBtns)) {
      btn.addEventListener('click', () => this._handleMMenu(id, btn))
    }

    // ToC toggle button
    this.tabTocBtn.addEventListener('click', () => this._toggleToc())

    // Selection → popup menu
    this.wysiwyg.addEventListener('mouseup', () => this._onSelectionChange())
    this.wysiwyg.addEventListener('keyup',   () => this._onSelectionChange())

    // Media figure — two-click selection
    // mousedown: if the figure is already selected, deactivate BEFORE the click
    //   reaches the native media controls (native click may not propagate).
    this.wysiwyg.addEventListener('mousedown', (e) => {
      const figure = e.target.closest('.kuro-media-wrap[data-kuro-media]')
      if (figure && this.wysiwyg.contains(figure) && this.imageMenu.activeEl === figure) {
        this.imageMenu.deactivate()
        this._imageMenuJustDeactivated = true
      } else {
        this._imageMenuJustDeactivated = false
      }
    })

    // click: activate ImageMenu on first click; skip if mousedown already deactivated
    this.wysiwyg.addEventListener('click', (e) => {
      // Let the "↗ open link" button navigate naturally — don't open ImageMenu
      if (e.target.closest('.kuro-media-open-link')) return

      const figure = e.target.closest('.kuro-media-wrap[data-kuro-media]')
      if (figure && this.wysiwyg.contains(figure)) {
        if (this._imageMenuJustDeactivated) {
          // mousedown already deactivated; native media will handle this click
          this._imageMenuJustDeactivated = false
        } else {
          this.imageMenu.activate(figure)
          this.popm.hide()
        }
      } else if (!this.imageMenu.el.contains(e.target)) {
        this.imageMenu.deactivate()
      }
    })

    // selectionchange fires after the selection has actually changed — more reliable
    // than mouseup for detecting collapse (e.g. click inside table cell to deselect).
    this._onDocSelChange = () => {
      if (this._mode === 'wysiwyg' && this.popm.el.classList.contains('kuro-popm--visible')) {
        const sel = window.getSelection()
        if (!sel?.rangeCount || sel.isCollapsed || sel.toString().length === 0) {
          // Selection collapsed: hide popm unless focus is inside it (e.g. color input)
          if (!this.popm.el.contains(document.activeElement)) this.popm.hide()
        } else {
          this.popm._updateActiveStates()
          this.popm._activeRange = sel.getRangeAt(0).cloneRange()
        }
      }
      // Close line popup whenever the selection (caret) moves
      if (this.linePopupMenu.isVisible) this.linePopupMenu.close()
      // Show the roundbox menu when the caret enters a box. selectionchange is the
      // only signal that fires for toolbar-insert, keyboard navigation and
      // programmatic selection (none of which produce a mouseup/keyup inside the
      // box). Only ACTIVATE here — never deactivate on selectionchange, otherwise
      // using the menu's own controls (which move focus/selection out of the box)
      // would dismiss it. Deactivation stays on mouseup / keyup / click-outside.
      if (this._mode === 'wysiwyg' && !this.roundboxMenu.isActive) {
        const box = this._roundboxAtCaret()
        if (box) this.roundboxMenu.activate(box)
      }
      // Reposition roundboxMenu when popm appears/moves (avoid overlap)
      if (this.roundboxMenu.isActive) this.roundboxMenu._position()
    }
    document.addEventListener('selectionchange', this._onDocSelChange)

    // Cursor position → table context (document-level so it fires even when
    // mouseup lands on a floating menu element rather than the wysiwyg itself).
    // Skip when mouseup is ON the table menu — those buttons manage their own
    // state and re-running _updateTableContext would race with delete actions.
    this._onDocMouseup = (e) => {
      if (this._mode === 'wysiwyg' &&
          !this.tableManager.el.contains(e.target) &&
          !this.tableInserter.container.contains(e.target)) {
        this._updateTableContext()
      }
      if (this._mode === 'wysiwyg' && !this.roundboxMenu.el.contains(e.target)) {
        this._updateRoundboxContext()
      }
    }
    document.addEventListener('mouseup', this._onDocMouseup)
    this.wysiwyg.addEventListener('keyup', () => {
      this._updateTableContext()
      this._updateRoundboxContext()
    })

    // Content change → ToC + auto-list + special-link detection
    this.wysiwyg.addEventListener('input', (e) => {
      this.toc._update()
      this._detectAutoList(e)
      this._detectSpecialLink(e)
      this._detectEmojiShortcode(e)
      this._updateCharCount()
      if (this.imageMenu.isVisible) this.imageMenu.deactivate()
      // Code blocks are <textarea>-based now; their own input listener handles
      // gutter sync. Nothing to do at the wysiwyg level.
    })

    // Remember caret before losing focus (for emoji insert after panel opens)
    this.wysiwyg.addEventListener('blur', () => {
      const sel = window.getSelection()
      if (sel?.rangeCount) this._savedRange = sel.getRangeAt(0).cloneRange()
    })

    // Hide floaters when clicking outside.
    // Store as instance property so destroy() can removeEventListener with the same ref.
    this._onDocMousedown = (e) => {
      const inEditor   = this.root.contains(e.target)
      const inPopm     = this.popm.el.contains(e.target)
      const inEmoji    = this.emojiPanel.el.contains(e.target)
      const inTable    = this.tableManager.el.contains(e.target) ||
                         this.tableInserter.container.contains(e.target)
      const inMedia    = this.mediaDialog.el.contains(e.target)
      const inImage    = this.imageMenu.el.contains(e.target)
      const inLine     = this.linePopupMenu.el.contains(e.target)
      const inRoundbox = this.roundboxMenu.el.contains(e.target)
      if (!inEditor && !inPopm && !inEmoji) this.popm.hide()
      if (!inEditor && !inPopm && !inEmoji) this.emojiPanel.hide()
      if (!inEditor && !inTable) this.tableManager.deactivate()
      if (!inMedia) this.mediaDialog.hide()
      if (!inImage && !inEditor) this.imageMenu.deactivate()
      if (!inLine && !inTable) this.linePopupMenu.close()
      if (!inEditor && !inRoundbox) this.roundboxMenu.deactivate()
    }
    document.addEventListener('mousedown', this._onDocMousedown)

    // Keyboard shortcuts
    this.wysiwyg.addEventListener('keydown', (e) => this._onKeydown(e))

    // ── Broken URL media (img / video / audio load failure) ──────────────
    // error events don't bubble → must use capture phase.
    // Replace the broken element with a visible, clickable placeholder so the
    // user can select it and delete (or fix the URL) via the ImageMenu.
    this.wysiwyg.addEventListener('error', (e) => {
      const target = e.target
      if (!target.classList?.contains('kuro-media')) return
      const figure = target.closest('.kuro-media-wrap[data-kuro-media]')
      if (!figure || !this.wysiwyg.contains(figure)) return
      const src = target.getAttribute('src') || ''
      const wrap = createElement('div', {
        className: 'kuro-media-broken',
        attrs: { contenteditable: 'false' },
      })
      const icon  = createElement('span', { className: 'kuro-media-broken__icon',  html: '🔗' })
      const label = createElement('span', { className: 'kuro-media-broken__label', html: 'メディアを読込できません' })
      const urlEl = createElement('span', { className: 'kuro-media-broken__url' })
      urlEl.textContent = src   // textContent = XSS-safe
      wrap.appendChild(icon)
      wrap.appendChild(label)
      wrap.appendChild(urlEl)
      figure.innerHTML = ''
      figure.appendChild(wrap)
    }, true)

    // ── Drag-and-drop media files ─────────────────────────────────────────
    // Without these handlers the browser opens the dropped file in a new tab.
    this.wysiwyg.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      this.wysiwyg.classList.add('kuro-drag-over')
    })

    this.wysiwyg.addEventListener('dragleave', (e) => {
      // Only remove the indicator when the pointer truly leaves the pane
      if (!this.wysiwyg.contains(e.relatedTarget)) {
        this.wysiwyg.classList.remove('kuro-drag-over')
      }
    })

    this.wysiwyg.addEventListener('drop', (e) => {
      e.preventDefault()
      this.wysiwyg.classList.remove('kuro-drag-over')

      const files = [...(e.dataTransfer.files ?? [])]
        .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'))
      if (!files.length) return

      // Move caret to the exact drop position before inserting
      this._setCaretFromPoint(e.clientX, e.clientY)

      for (const file of files) {
        if (this.options.onMediaUpload) {
          this._insertMediaFile(file)
        } else {
          // Fallback when no upload callback: show via blob URL (dev/demo only)
          this._insertMediaURL(URL.createObjectURL(file))
        }
      }
    })

    // ── Paste image from clipboard (Ctrl+V) ───────────────────────────────
    this.wysiwyg.addEventListener('paste', (e) => {
      // ① 画像ペースト
      const items = [...(e.clipboardData?.items ?? [])]
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      if (items.length) {
        e.preventDefault()
        for (const item of items) {
          const file = item.getAsFile()
          if (!file) continue
          if (this.options.onMediaUpload) this._insertMediaFile(file)
          else                            this._insertMediaURL(URL.createObjectURL(file))
        }
        return
      }

      // ② テキストペースト — CSV / TSV ならテーブルに変換
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (text && this._looksLikeTabularData(text)) {
        e.preventDefault()
        this._pasteTabularData(text)
        return
      }

      // ③ リッチテキスト (HTML) — 色などテーマに反するインラインスタイルを除去して貼付。
      //   外部 (特に暗いテーマのページ) からのコピーは color/background が焼き込まれ、
      //   そのままだと公開ページ (明背景) で白文字→読めない、になる。除去して文書の
      //   テーマ色を継承させる。 (text/html が無い純テキストはブラウザ既定に委ねる)
      const html = e.clipboardData?.getData('text/html') ?? ''
      if (html) {
        e.preventDefault()
        this._pasteSanitizedHTML(html)
        return
      }
      // それ以外 (純テキスト) は通常のテキストペーストを通す
    })
  }

  /**
   * Paste rich HTML with theme-hostile presentational styling removed: strip
   * `color` / `background*` from inline styles, legacy `color` / `bgcolor`
   * attributes, and `<font color>`. Pasted content then adopts the document's own
   * theme colors (so e.g. white-on-dark copied text doesn't become white-on-white
   * on the published light page) while keeping structure, emphasis and links.
   * @param {string} html  clipboard `text/html`
   */
  _pasteSanitizedHTML(html) {
    // Browser/Office clipboards wrap the real selection in fragment markers;
    // use that slice when present so we don't drag in <head>/<style> noise.
    const frag = html.match(/<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/)
    const markup = frag ? frag[1] : html
    const body = new DOMParser().parseFromString(markup, 'text/html').body

    const COLOR_PROPS = ['color', 'background', 'background-color', 'background-image']
    // Chrome's "copy" serializes the element's ENTIRE computed style as
    // `<prop>: revert-layer` (hundreds of props) plus the real color — pure noise
    // that bloats saved HTML. Drop every CSS-wide-keyword declaration too.
    const NOISE_VALUES = new Set(['revert-layer', 'revert', 'initial', 'unset', 'inherit'])
    for (const el of body.querySelectorAll('*')) {
      el.removeAttribute('color')   // legacy <font color> / [color]
      el.removeAttribute('bgcolor')
      const st = el.style
      if (st && el.hasAttribute('style')) {
        for (const p of COLOR_PROPS) st.removeProperty(p)
        for (const p of [...st]) {
          if (NOISE_VALUES.has(st.getPropertyValue(p).trim())) st.removeProperty(p)
        }
        if (el.getAttribute('style') === '') el.removeAttribute('style')
      }
    }

    const clean = body.innerHTML
    if (clean) execFormat('insertHTML', clean)
  }

  /**
   * 「CSV / TSV っぽいテキスト」かどうかを判定する。
   * 条件: 2 行以上 + 全行がほぼ同じ区切り数 (tab か comma) を持つ。
   */
  _looksLikeTabularData(text) {
    const lines = text.split(/\r?\n/).filter(l => l.length > 0)
    if (lines.length < 2) return false

    const hasTab   = lines[0].includes('\t')
    const hasComma = lines[0].includes(',')
    if (!hasTab && !hasComma) return false
    const sep = hasTab ? '\t' : ','

    const firstCount = lines[0].split(sep).length
    if (firstCount < 2) return false

    // 全行で区切り数がほぼ一致 (1 個までの差を許容)
    return lines.every(l => Math.abs(l.split(sep).length - firstCount) <= 1)
  }

  /** CSV / TSV テキストをテーブルに変換して挿入。 */
  _pasteTabularData(text) {
    const lines = text.split(/\r?\n/).filter(l => l.length > 0)
    const useTab = lines[0].includes('\t')
    const rows = lines.map(line => useTab ? line.split('\t') : line.split(','))

    // セル内容を HTML エスケープ
    const escape = (s) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const html =
      `<table class="kuro-table"><tbody>` +
        rows.map(row =>
          `<tr>` + row.map(cell => {
            const txt = escape(cell.trim())
            return `<td contenteditable="true">${txt || '<br>'}</td>`
          }).join('') + `</tr>`
        ).join('') +
      `</tbody></table><p><br></p>`

    this.wysiwyg.focus()
    execFormat('insertHTML', html)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Move the caret (and _savedRange) to the point (x, y) in viewport coords.
   * Used after a file drop so the media is inserted exactly where the user dropped it.
   */
  _setCaretFromPoint(x, y) {
    let range = null
    if (document.caretRangeFromPoint) {
      // Chrome / Safari
      range = document.caretRangeFromPoint(x, y)
    } else if (document.caretPositionFromPoint) {
      // Firefox
      const pos = document.caretPositionFromPoint(x, y)
      if (pos) {
        range = document.createRange()
        range.setStart(pos.offsetNode, pos.offset)
        range.collapse(true)
      }
    }
    if (!range) return
    this.wysiwyg.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    this._savedRange = range.cloneRange()
  }

  _onSelectionChange() {
    hasSelection() ? this.popm.show() : this.popm.hide()
  }

  _updateTableContext() {
    const sel = window.getSelection()
    if (!sel?.rangeCount) {
      this.tableManager.deactivate()
      this.tableInserter.deactivate()
      return
    }
    const cell  = findCell(sel.getRangeAt(0).startContainer)
    const table = cell?.closest('table')
    if (table) {
      this.tableManager.activate(table)
      this.tableInserter.activate(table)
      this.tableInserter.updateCursor(cell)
    } else {
      this.tableManager.deactivate()
      this.tableInserter.deactivate()
    }
  }

  /** Auto-detect "1. " and "- " / "* " list starters at line beginning. */
  _detectAutoList(e) {
    if (e.inputType && !e.inputType.startsWith('insert')) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const node  = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return

    // IMPORTANT: input events bubble from nested contenteditable elements such as
    // <code contenteditable="true"> inside code blocks.  Running execCommand inside
    // a .kuro-code block creates an invalid <ul> inside an inline <code> element;
    // the browser then "fixes" the nesting by placing the second <li> as a direct
    // child of <code>, which makes it inherit the green-300 text color.  Guard here.
    if (node.parentElement?.closest('.kuro-code')) return

    const text   = node.textContent
    const offset = range.startOffset
    // Get text from start of current text node to caret
    const before = text.slice(0, offset)
    const lineText = before.split('\n').pop()

    const olMatch = lineText.match(/^(\d+)\.\s$/)
    if (olMatch) {
      // Capture the typed number so the OL starts at the right counter value.
      // e.g. "2. " → <ol start="2"> so the first visible item shows "2."
      const startNum = parseInt(olMatch[1], 10)
      this._replaceLinePrefix(node, lineText, offset, () => this._insertList('OL', startNum))
    } else if (/^[-*]\s$/.test(lineText)) {
      this._replaceLinePrefix(node, lineText, offset, () => this._insertList('UL'))
    }
  }

  /**
   * Detect a completed [[...]] / [[...|...]] / [[[...]]] pattern ending at the
   * cursor and expand it into rendered HTML immediately.
   *
   * Triggered on every ']' keystroke.  The [[[...]]] triple-bracket (card link)
   * is guarded against premature expansion: if the matched [[...]] is immediately
   * preceded by '[', we wait for the next ']' to complete the triple pattern.
   */
  _detectSpecialLink(e) {
    // Only react to a literal ']' insertion in WYSIWYG mode
    if (this._mode !== 'wysiwyg' || e.data !== ']') return

    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const node  = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return
    if (node.parentElement?.closest('.kuro-code')) return

    const text   = node.textContent
    const offset = range.startOffset
    const before = text.slice(0, offset)

    // Match any complete [[...]] / [[...|...]] / [[[...]]] ending exactly at cursor
    const RE_END = /(?:\[\[\[([^\]]+)\]\]\]|\[\[([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\])$/
    const m = RE_END.exec(before)
    if (!m) return

    const fullMatch  = m[0]
    const matchStart = offset - fullMatch.length

    // Defer [[...]] that is immediately preceded by '[' — it may be [[[...]]] in progress
    if (matchStart > 0 && text[matchStart - 1] === '[') return

    // Render via the same function used in setContent / mode switch
    const rendered = renderSpecialLinks(fullMatch, this.options.urlResolver)
    if (rendered === fullMatch) return   // pattern produced no change

    // Replace the [[...]] text range with rendered HTML
    const replaceRange = document.createRange()
    replaceRange.setStart(node, matchStart)
    replaceRange.setEnd(node, offset)
    replaceRange.deleteContents()

    const tmp = document.createElement('div')
    tmp.innerHTML = rendered
    const frag = document.createDocumentFragment()
    while (tmp.firstChild) frag.appendChild(tmp.firstChild)
    // Sentinel span: lets us position the cursor cleanly after inserted content
    const sentinel = document.createElement('span')
    frag.appendChild(sentinel)
    replaceRange.insertNode(frag)

    const newRange = document.createRange()
    newRange.setStartAfter(sentinel)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
    sentinel.remove()
  }

  /**
   * Detect a `:shortcode:` pattern ending at the caret and replace it with
   * the corresponding emoji. Triggered on every ':' input.
   */
  _detectEmojiShortcode(e) {
    if (this._mode !== 'wysiwyg' || e.data !== ':') return

    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const node  = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return
    if (node.parentElement?.closest('.kuro-code-wrap, .kuro-code')) return

    const text   = node.textContent
    const offset = range.startOffset
    const before = text.slice(0, offset)
    // 末尾が :word: で終わるパターン
    const m = before.match(/:([a-z0-9_+-]+):$/i)
    if (!m) return

    const shortcode = m[0]
    const emoji = EMOJI_SHORTCODES[shortcode.toLowerCase()]
    if (!emoji) return

    // 置換
    const start = offset - shortcode.length
    const r = document.createRange()
    r.setStart(node, start)
    r.setEnd(node, offset)
    r.deleteContents()

    const tn = document.createTextNode(emoji)
    r.insertNode(tn)

    const nr = document.createRange()
    nr.setStartAfter(tn)
    nr.collapse(true)
    sel.removeAllRanges()
    sel.addRange(nr)
  }

  _replaceLinePrefix(textNode, prefix, caretOffset, insertCmd) {
    // Remove the prefix characters immediately BEFORE the caret. We must not key
    // off textNode.textContent.length: the same text node can hold text after
    // the caret on the line (e.g. typing "1. " in front of existing text), and
    // deleting the node tail would eat that trailing text instead of the prefix.
    const prefixLen = prefix.length
    const sel = window.getSelection()
    const range = document.createRange()
    range.setStart(textNode, caretOffset - prefixLen)
    range.setEnd(textNode, caretOffset)
    range.deleteContents()
    sel.removeAllRanges()
    sel.addRange(range)
    insertCmd()
  }

  _onKeydown(e) {
    // Dismiss image menu on any meaningful key — before input fires
    // (catches Delete / Backspace / Enter / printable chars; ignores pure modifiers)
    if (this.imageMenu.isVisible && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const meaningful = e.key.length === 1 ||
        e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter'
      if (meaningful) this.imageMenu.deactivate()
    }

    // ── Alt+T → ToC パネル切り替え ────────────────────────────────────────
    if (e.altKey && e.code === 'KeyT') {
      e.preventDefault()
      this._toggleToc()
      return
    }

    // ── Ctrl / Cmd shortcuts ───────────────────────────────────────────────
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); this._format('bold');      return
        case 'i': e.preventDefault(); this._format('italic');    return
        case 'u': e.preventDefault(); this._format('underline'); return
        case 'z':
          e.preventDefault()
          e.shiftKey ? this._redo() : this._undo()
          return
        case 'y':
          e.preventDefault()
          this._redo()
          return
      }
    }

    // Code-block handling is no longer needed here — code is now a real
    // <textarea> inside a non-editable wrapper, so Enter/Tab work natively.

    // ── Tab → block indent / Shift+Tab → outdent ──────────────────────────
    // Per spec §段落1: Tab indents the containing block element by one level
    // (2 em), Shift+Tab outdents.  We use padding-left on the block rather than
    // <blockquote> so headings, lists, etc. all respond uniformly.
    if (e.key === 'Tab') {
      e.preventDefault()
      this._shiftBlockIndent(e.shiftKey ? -1 : 1)
      return
    }

    // ── Enter at empty line of blockquote / callout → exit the wrapper ────
    // If the caret is in an empty paragraph inside a <blockquote> or a
    // .kuro-callout block, pressing Enter unwraps that line out of the wrapper.
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection()
      if (sel?.rangeCount && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        const block = this._nearestBlock(range.startContainer)
        // Match either kind of containing wrapper
        const wrapper = block?.closest?.('blockquote, .kuro-callout')
        if (wrapper) {
          // Determine the actual "line container": the paragraph if any, else wrapper itself
          const lineEl = (block.tagName === 'P' || block.tagName === 'DIV') ? block : wrapper
          const isEmpty = !lineEl.textContent || lineEl.textContent.trim() === ''
          if (isEmpty) {
            e.preventDefault()
            const p = document.createElement('p')
            p.innerHTML = '<br>'
            wrapper.insertAdjacentElement('afterend', p)
            if (lineEl !== wrapper) lineEl.remove()
            if (!wrapper.textContent.trim() && wrapper.children.length === 0) wrapper.remove()
            const r = document.createRange()
            r.setStart(p, 0)
            r.collapse(true)
            sel.removeAllRanges()
            sel.addRange(r)
            return
          }
        }
      }
    }

    // ── Backspace at start of line → outdent if indented ──────────────────
    if (e.key === 'Backspace') {
      const sel = window.getSelection()
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0)
        if (range.collapsed && range.startOffset === 0) {
          const block = this._nearestBlock(range.startContainer)
          if (block && block !== this.wysiwyg) {
            const cur = parseFloat(block.style.paddingLeft) || 0
            if (cur > 0) {
              e.preventDefault()
              this._shiftBlockIndent(-1)
              return
            }
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════

  _setMode(mode) {
    if (this._mode === mode) return

    if (mode === 'source') {
      // WYSIWYG → Source: serialize code-block textareas, then reverse-render
      const clone = this.wysiwyg.cloneNode(true)
      this._serializeCodeBlocksToHtml(clone)
      this.sourceArea.value = prettifyHTML(unrenderSpecialLinks(clone.innerHTML))
      this.pane.classList.add('kuro-pane--source')
      this.tabWysiwyg.classList.remove('kuro-tab--active')
      this.tabSource.classList.add('kuro-tab--active')
      this.tocPanelEl.classList.add('kuro-toc--hidden')
    } else {
      // Source → WYSIWYG: render special links
      this.wysiwyg.innerHTML = renderSpecialLinks(this.sourceArea.value, this.options.urlResolver)
      this.pane.classList.remove('kuro-pane--source')
      this.tabSource.classList.remove('kuro-tab--active')
      this.tabWysiwyg.classList.add('kuro-tab--active')
      this.tocPanelEl.classList.remove('kuro-toc--hidden')
      this.toc._doUpdate()
      this._initAllCodeBlocks()
    }

    this._mode = mode
    this.popm.hide()
    this.tableManager.deactivate()
    this.imageMenu.deactivate()
    this.roundboxMenu.deactivate()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wrap or unwrap the current selection with <kbd> (keyboard-key style).
   * If the caret is already inside a <kbd>, the element is unwrapped instead.
   */
  _toggleKbd() {
    this.wysiwyg.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    // 既に <kbd> 内なら unwrap
    let node = range.startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    const existing = node?.closest?.('kbd')
    if (existing) {
      const parent = existing.parentNode
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing)
      existing.remove()
      return
    }

    if (range.collapsed) return
    const kbd = document.createElement('kbd')
    try {
      range.surroundContents(kbd)
      sel.setBaseAndExtent(kbd, 0, kbd, kbd.childNodes.length)
    } catch {
      kbd.appendChild(range.extractContents())
      range.insertNode(kbd)
      try {
        const nr = document.createRange()
        nr.selectNodeContents(kbd)
        sel.removeAllRanges()
        sel.addRange(nr)
      } catch (_) {}
    }
    if (sel.rangeCount) this.popm._activeRange = sel.getRangeAt(0).cloneRange()
  }

  _format(command) {
    // Alignment commands use a custom DOM approach because execCommand('justifyFull')
    // is unreliable across browsers and doesn't apply to <p> elements consistently.
    // NOTE: do NOT call wysiwyg.focus() before _applyAlign — it may clear the selection.
    const ALIGN_MAP = {
      justifyLeft:   'left',
      justifyCenter: 'center',
      justifyRight:  'right',
      justifyFull:   'justify',
    }

    // List commands: execCommand toggles ON fine, but toggle-OFF leaves browser
    // garbage (<div>, orphaned <br>, empty <p>, etc.).  Use custom DOM unwrap
    // for the toggle-off path — same principle as _formatBlock toggle-off.
    const LIST_TAG = {
      insertUnorderedList: 'UL',
      insertOrderedList:   'OL',
    }

    if (ALIGN_MAP[command]) {
      // Capture the range NOW — before any focus/blur can clear it.
      const sel = window.getSelection()
      const range = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null
      this._applyAlign(ALIGN_MAP[command], range)
    } else if (LIST_TAG[command] && queryFormat(command)) {
      // Currently inside a list of this type → custom DOM toggle-off
      this._toggleListOff(LIST_TAG[command])
    } else if (LIST_TAG[command]) {
      // Not in a list → custom DOM toggle-on (no execCommand, no <font> garbage)
      this._insertList(LIST_TAG[command])
    } else {
      this.wysiwyg.focus()
      execFormat(command)
    }
  }

  /**
   * Toggle off a list (UL or OL) without leaving browser garbage.
   *
   * execCommand('insertUnorderedList') when the list is already active tells the
   * browser to "un-list" the selection, but different browsers produce different
   * remnants: Chrome leaves <div> elements and orphaned <br> tags; Safari may
   * leave empty block wrappers.
   *
   * Strategy (mirrors _formatBlock toggle-off):
   *   1. Find every <ul>/<ol> inside the wysiwyg that intersects the selection.
   *   2. For each list, convert every direct <li> child to a <p> by moving its
   *      children with insertBefore (keeps nodes in the live document so Range
   *      endpoints remain valid — no DocumentFragment detachment).
   *   3. Remove the now-empty list element.
   *   4. Restore the selection atomically with setBaseAndExtent.
   *
   * Nested lists: inner <ul>/<ol> found inside an <li> are moved into the new
   * <p> as-is.  This preserves the nested structure rather than silently
   * flattening it — the user can remove nesting separately if needed.
   *
   * @param {'UL'|'OL'} listTag
   */
  _toggleListOff(listTag) {
    this.wysiwyg.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range      = sel.getRangeAt(0)
    const savedRange = range.cloneRange()

    // Collect every matching list that intersects the selection
    const lists = []
    const walker = document.createTreeWalker(this.wysiwyg, NodeFilter.SHOW_ELEMENT, null)
    let node = walker.nextNode()
    while (node) {
      if (node.tagName === listTag && range.intersectsNode(node)) lists.push(node)
      node = walker.nextNode()
    }

    // Fallback: walk up from the caret to find the nearest ancestor list
    if (lists.length === 0) {
      let n = range.startContainer
      if (n.nodeType === Node.TEXT_NODE) n = n.parentElement
      while (n && n !== this.wysiwyg) {
        if (n.tagName === listTag) { lists.push(n); break }
        n = n.parentElement
      }
    }

    for (const listEl of lists) {
      const parent = listEl.parentNode
      // Convert each direct <li> to a <p>, moving children via insertBefore
      // so text nodes are never detached from the live document.
      for (const li of Array.from(listEl.children)) {
        if (li.tagName !== 'LI') continue
        const p = document.createElement('p')
        while (li.firstChild) p.appendChild(li.firstChild)
        parent.insertBefore(p, listEl)
      }
      listEl.remove()
    }

    // Restore selection — setBaseAndExtent is atomic (no empty-selection gap)
    try {
      sel.setBaseAndExtent(
        savedRange.startContainer, savedRange.startOffset,
        savedRange.endContainer,   savedRange.endOffset,
      )
    } catch {
      this.wysiwyg.focus({ preventScroll: true })
      try { sel.removeAllRanges(); sel.addRange(savedRange) } catch (_) {}
    }
  }

  /**
   * Insert a list (UL or OL) using pure DOM manipulation — no execCommand.
   *
   * Algorithm:
   *   1. Find the direct wysiwyg child (top-level block) that contains the
   *      range START, and the one that contains the range END.
   *   2. Walk siblings from startBlock → endBlock, collecting every block
   *      element.  This is more reliable than range.intersectsNode() which
   *      can miss intermediate paragraphs in some browsers.
   *   3. Convert each collected block to an <li> by moving its children.
   *   4. Wrap all <li> in a new <ul>/<ol> at the original position via a
   *      comment-node marker (survives removal of adjacent elements).
   *   5. Place the caret inside the first <li>.
   *
   * @param {'UL'|'OL'} listTag
   */
  _insertList(listTag, startNum = 1) {
    this.wysiwyg.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'BLOCKQUOTE', 'PRE'])

    // ── Helper: walk up to find the direct child of wysiwyg ──────────────────
    const topBlock = (node) => {
      let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
      while (el && el.parentElement !== this.wysiwyg) el = el.parentElement
      return (el && el !== this.wysiwyg) ? el : null
    }

    // ── Collect all top-level blocks from selection start to end ─────────────
    // Walk siblings between startBlock and endBlock (inclusive) instead of
    // relying on intersectsNode, which can miss intermediate blocks.
    const startBlock = topBlock(range.startContainer)
    const endBlock   = topBlock(range.endContainer)

    const targets = []
    if (startBlock) {
      let el = startBlock
      while (el) {
        if (el.nodeType === Node.ELEMENT_NODE && BLOCKS.has(el.tagName)) targets.push(el)
        if (el === endBlock) break
        el = el.nextElementSibling
      }
    }

    // Fallback: collapsed caret or both ends in the same block
    if (targets.length === 0 && startBlock) targets.push(startBlock)

    // Last resort: no block containers — wrap loose content in a <p>
    if (targets.length === 0) {
      const p = document.createElement('p')
      while (this.wysiwyg.firstChild) p.appendChild(this.wysiwyg.firstChild)
      this.wysiwyg.appendChild(p)
      targets.push(p)
    }

    // ── Build the list in place ───────────────────────────────────────────────
    // A comment-node marker gives us a stable insertion point that survives
    // removal of the surrounding elements.
    const marker = document.createComment('')
    targets[0].before(marker)

    const list = document.createElement(listTag)
    // For OL: set the start attribute so the first item shows the expected number.
    // startNum defaults to 1 (normal case); auto-detect passes the typed digit so
    // "2. text" → <ol start="2"> → displays "2." as the first visible marker.
    if (listTag === 'OL' && startNum !== 1) list.setAttribute('start', String(startNum))
    for (const target of targets) {
      const li = document.createElement('li')
      while (target.firstChild) li.appendChild(target.firstChild)
      list.appendChild(li)
      target.remove()
    }
    marker.replaceWith(list)

    // ── Place caret at the end of the first <li> ──────────────────────────────
    const firstLi = list.querySelector('li')
    if (firstLi) {
      try {
        const r = document.createRange()
        r.selectNodeContents(firstLi)
        r.collapse(false)
        sel.removeAllRanges()
        sel.addRange(r)
      } catch {}
    }
  }

  /**
   * Apply text-align to all block-level elements that intersect the current selection.
   * Falls back to the nearest block ancestor when no blocks are in the selection range.
   * @param {string} cssValue - 'left' | 'center' | 'right' | 'justify'
   */
  _applyAlign(cssValue, range = null) {
    if (!range) {
      const sel = window.getSelection()
      if (!sel?.rangeCount) return
      range = sel.getRangeAt(0)
    }
    const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5',
                             'LI', 'TD', 'TH', 'BLOCKQUOTE', 'PRE'])
    const blocks = []

    // Walk the wysiwyg subtree and collect blocks that intersect the selection
    const walker = document.createTreeWalker(this.wysiwyg, NodeFilter.SHOW_ELEMENT, null)
    let node = walker.nextNode()
    while (node) {
      if (BLOCKS.has(node.tagName) && range.intersectsNode(node)) {
        blocks.push(node)
      }
      node = walker.nextNode()
    }

    // Fallback: walk up from caret to find the nearest block ancestor
    if (blocks.length === 0) {
      let n = range.startContainer
      if (n.nodeType === Node.TEXT_NODE) n = n.parentElement
      while (n && n !== this.wysiwyg) {
        if (BLOCKS.has(n.tagName)) { blocks.push(n); break }
        n = n.parentElement
      }
      // Last resort: apply to the wysiwyg container itself
      if (blocks.length === 0) blocks.push(this.wysiwyg)
    }

    for (const b of blocks) {
      b.style.textAlign = cssValue
      // CJK 均等割り requires two extra properties:
      //   text-justify: inter-character  — spread spacing between every character
      //   text-align-last: justify       — also justify the last (or only) line
      // Without text-align-last, a single-line paragraph shows NO visual change
      // because text-align:justify only affects interior lines, not the final line.
      if (cssValue === 'justify') {
        b.style.textJustify   = 'inter-character'
        b.style.textAlignLast = 'justify'
      } else {
        b.style.textJustify   = ''
        b.style.textAlignLast = ''
      }
    }
  }

  /**
   * Apply or toggle a block-level heading (h1–h5).
   *
   * Toggle-off uses DOM unwrap (remove the heading tag, keep children) rather
   * than formatBlock('p').  formatBlock always *creates* a new block element,
   * which produces spurious <p> tags when the heading was originally applied to
   * partial text and the browser had split the surrounding paragraph.
   * Unwrapping removes only what we added — nothing more.
   */
  _formatBlock(tag) {
    this.wysiwyg.focus()
    const HDG = new Set(['h1','h2','h3','h4','h5'])

    let current = ''
    try { current = document.queryCommandValue('formatBlock').toLowerCase() } catch {}

    if (current === tag) {
      // ── Toggle off: unwrap the heading element ─────────────────────────────
      // "We only added <h2>, so we only remove <h2>."
      // Using formatBlock('p') would create a new <p> every time, producing
      // extra paragraphs when the browser had split a paragraph around a partial
      // selection.  Replacing the element with its own children is exact.
      const el = this._findBlockEl(tag)
      if (el) {
        // Save the full selection BEFORE the DOM move.
        // After replaceWith(frag), the text nodes are the same objects — only
        // their parent changed — so the cloned Range still points to valid nodes.
        const sel = window.getSelection()
        const savedRange = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null

        // Use insertBefore (not DocumentFragment) so text nodes stay in the live
        // document at all times — DocumentFragment detaches them momentarily and
        // Safari invalidates any Range that references detached nodes.
        const parent = el.parentNode
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        el.remove()

        // Restore the original selection via setBaseAndExtent (atomic, no
        // empty-selection gap that can reset Chrome/Safari internal state).
        if (savedRange) {
          try {
            sel.setBaseAndExtent(
              savedRange.startContainer, savedRange.startOffset,
              savedRange.endContainer,   savedRange.endOffset
            )
          } catch {
            this.wysiwyg.focus({ preventScroll: true })
            try { sel.removeAllRanges(); sel.addRange(savedRange) } catch (_) {}
          }
        }
      }

    } else {
      // ── Apply heading ──────────────────────────────────────────────────────
      execFormat('formatBlock', tag)
    }
  }

  /**
   * Apply / change / toggle a callout (admonition) block.
   *
   *   - Not inside a callout → wrap the nearest top-level block in a new callout
   *   - Inside a callout of a DIFFERENT type → switch its type
   *   - Inside a callout of the SAME type → unwrap (toggle off)
   *
   * @param {'tip'|'warn'|'danger'|'note'} type
   */
  _applyCallout(type) {
    this.wysiwyg.focus()
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    // ── Already inside a callout? ───────────────────────────────────────────
    let node = range.startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    const callout = node?.closest?.('.kuro-callout')

    if (callout) {
      const currentType = [...callout.classList]
        .map(c => c.match(/^kuro-callout--(\w+)$/)?.[1])
        .find(Boolean)
      if (currentType === type) {
        // Toggle off: unwrap the callout, keep its children in place
        const savedRange = range.cloneRange()
        const parent = callout.parentNode
        while (callout.firstChild) parent.insertBefore(callout.firstChild, callout)
        callout.remove()
        try { sel.removeAllRanges(); sel.addRange(savedRange) } catch (_) {}
      } else {
        // Change type
        if (currentType) callout.classList.remove(`kuro-callout--${currentType}`)
        callout.classList.add(`kuro-callout--${type}`)
      }
      return
    }

    // ── Wrap the current top-level block in a new callout ──────────────────
    // Use the wysiwyg's direct child so nested elements (e.g. an <li>) end up
    // with their whole container inside the callout, not partially.
    let block = range.startContainer
    if (block.nodeType === Node.TEXT_NODE) block = block.parentElement
    while (block && block.parentElement !== this.wysiwyg) block = block.parentElement
    if (!block || block === this.wysiwyg) return

    const wrap = document.createElement('div')
    wrap.className = `kuro-callout kuro-callout--${type}`
    block.before(wrap)
    wrap.appendChild(block)

    // Restore caret inside the moved block
    try {
      const r = document.createRange()
      r.setStart(block, 0)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    } catch (_) {}
  }

  /** Walk up the DOM from the caret to find an element with the given tag name. */
  _findBlockEl(tag) {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return null
    let node = sel.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    while (node && node !== this.wysiwyg) {
      if (node.tagName === tag.toUpperCase()) return node
      node = node.parentElement
    }
    return null
  }

  /** Return the nearest block-level ancestor of `node` (or node itself). */
  _nearestBlock(node) {
    const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5',
                             'LI', 'TD', 'TH', 'BLOCKQUOTE', 'PRE'])
    let el = node instanceof Element ? node : node.parentElement
    while (el && el !== this.wysiwyg) {
      if (BLOCKS.has(el.tagName)) return el
      el = el.parentElement
    }
    return this.wysiwyg
  }

  /**
   * Shift the indent level of all block elements in the current selection.
   * Each level = 2 em (padding-left).  Minimum = 0 (cannot go negative).
   * @param {number} dir  +1 = indent, -1 = outdent
   */
  _shiftBlockIndent(dir) {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range      = sel.getRangeAt(0)
    const savedRange = range.cloneRange()
    const STEP       = 2  // em per indent level

    const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5',
                             'LI', 'TD', 'TH', 'BLOCKQUOTE', 'PRE'])
    const blocks = []

    const walker = document.createTreeWalker(this.wysiwyg, NodeFilter.SHOW_ELEMENT, null)
    let node = walker.nextNode()
    while (node) {
      if (BLOCKS.has(node.tagName) && range.intersectsNode(node)) blocks.push(node)
      node = walker.nextNode()
    }

    if (blocks.length === 0) {
      const b = this._nearestBlock(range.startContainer)
      if (b) blocks.push(b)
    }

    for (const b of blocks) {
      const cur  = parseFloat(b.style.paddingLeft) || 0
      const next = Math.max(0, cur + dir * STEP)
      b.style.paddingLeft = next > 0 ? `${next}em` : ''
    }

    // Restore caret / selection
    try { sel.removeAllRanges(); sel.addRange(savedRange) } catch (_) {}
  }

  /**
   * Apply a font-size (e.g. '150%') to the current selection.
   *
   * Always clears pre-existing font-size spans in the selection first
   * (via _clearFontSize), so repeated size changes never nest spans:
   *   <span 150%><span 120%>text</span></span>  ← old bad behaviour
   *   <span 120%>text</span>                    ← correct
   *
   * When size is '100%' (the base), clearing is sufficient — no new span
   * is added, which genuinely restores the inherited font size.
   *
   * @param {string} size - CSS font-size value, e.g. '150%'
   */
  _applyFontSize(size) {
    // Step 1: strip any existing font-size spans from the selection.
    // insertBefore keeps nodes live so Range endpoints auto-update.
    this._clearFontSize()

    // Step 2: 100% = "restore default" → clearing alone is enough.
    if (size === '100%') return

    // Step 3: wrap the (now clean) selection in a new sized span.
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return

    const span = document.createElement('span')
    span.style.fontSize = size

    try {
      range.surroundContents(span)
      // Live Range auto-updates — browser tracks the moved nodes automatically.
    } catch {
      span.appendChild(range.extractContents())
      range.insertNode(span)
      try {
        sel.setBaseAndExtent(span, 0, span, span.childNodes.length)
      } catch {
        try {
          const nr = document.createRange()
          nr.selectNodeContents(span)
          sel.removeAllRanges()
          sel.addRange(nr)
        } catch (_) {}
      }
    }
    if (sel.rangeCount) this.popm._activeRange = sel.getRangeAt(0).cloneRange()
  }

  /**
   * Remove font-size from every span inside the selection that carries one.
   * Mirrors _clearColor exactly — unwrap the span if it has no other
   * style/class left, using insertBefore so nodes stay in the live document
   * and Range endpoints auto-update without an explicit restore.
   */
  _clearFontSize() {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    const spans = Array.from(this.wysiwyg.querySelectorAll('span[style]'))
    for (const span of spans) {
      if (!span.style.fontSize) continue
      if (!range.intersectsNode(span)) continue

      span.style.removeProperty('font-size')

      const hasStyle = span.style.cssText.trim() !== ''
      const hasClass = span.className !== ''
      const hasExtra = Array.from(span.attributes).some(a => a.name !== 'style' && a.name !== 'class')
      if (!hasStyle && !hasClass && !hasExtra) {
        const parent = span.parentNode
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        span.remove()
      }
    }
  }

  /**
   * Apply a font-family (CSS value, e.g. "'Hiragino Mincho ProN', serif") to
   * the current selection: clear any existing font-family spans first, then wrap
   * in a new span carrying the chosen stack.
   *
   * NOTE: ゴシック (the `base` option) is applied EXPLICITLY too — it is NOT a
   * "clear only" no-op. The host may apply its own inherited font to the editor
   * content (e.g. KuroCMS sets a site-wide web font on .kuro-content), so merely
   * clearing would leave the text in that inherited font instead of gothic.
   * Wrapping an explicit span makes ゴシック actually override the inherited font,
   * matching 明朝 / web-font behaviour and keeping the picker consistent.
   */
  _applyFontFamily(family) {
    this._clearFontFamily()

    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return

    const span = document.createElement('span')
    span.style.fontFamily = family

    try {
      range.surroundContents(span)
    } catch {
      span.appendChild(range.extractContents())
      range.insertNode(span)
      try {
        sel.setBaseAndExtent(span, 0, span, span.childNodes.length)
      } catch {
        try {
          const nr = document.createRange()
          nr.selectNodeContents(span)
          sel.removeAllRanges()
          sel.addRange(nr)
        } catch (_) {}
      }
    }
    if (sel.rangeCount) this.popm._activeRange = sel.getRangeAt(0).cloneRange()
  }

  /** Remove font-family from every span inside the selection that carries one. */
  _clearFontFamily() {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    const spans = Array.from(this.wysiwyg.querySelectorAll('span[style]'))
    for (const span of spans) {
      if (!span.style.fontFamily) continue
      if (!range.intersectsNode(span)) continue

      span.style.removeProperty('font-family')

      const hasStyle = span.style.cssText.trim() !== ''
      const hasClass = span.className !== ''
      const hasExtra = Array.from(span.attributes).some(a => a.name !== 'style' && a.name !== 'class')
      if (!hasStyle && !hasClass && !hasExtra) {
        const parent = span.parentNode
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        span.remove()
      }
    }
  }

  /**
   * Apply line-height to every block element that intersects the current selection.
   * Block-level only — no span wrapping needed.
   * @param {string} value - unitless ratio, e.g. '1.6'
   */
  _applyLineHeight(value) {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range  = sel.getRangeAt(0)
    const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5',
                             'LI', 'TD', 'TH', 'BLOCKQUOTE', 'PRE'])
    const blocks = []

    const walker = document.createTreeWalker(this.wysiwyg, NodeFilter.SHOW_ELEMENT, null)
    let node = walker.nextNode()
    while (node) {
      if (BLOCKS.has(node.tagName) && range.intersectsNode(node)) blocks.push(node)
      node = walker.nextNode()
    }

    // Fallback: nearest block ancestor
    if (blocks.length === 0) {
      let n = range.startContainer
      if (n.nodeType === Node.TEXT_NODE) n = n.parentElement
      while (n && n !== this.wysiwyg) {
        if (BLOCKS.has(n.tagName)) { blocks.push(n); break }
        n = n.parentElement
      }
      if (blocks.length === 0) blocks.push(this.wysiwyg)
    }

    for (const b of blocks) b.style.lineHeight = value
  }

  /**
   * Apply an ordered-list marker style to the nearest <ol> containing the caret.
   * Called from the OL style picker sub-panel via _bindSubBtn, which has ALREADY
   * called restoreRange() before invoking this handler — so we must NOT call
   * wysiwyg.focus() here or the restored selection will be lost again.
   *
   * value = 'kuro-list-remove'  → remove the OL (equivalent to old toggle-off)
   * value = any OL_STYLE_OPTIONS class  → set that style; insert OL first if needed
   *
   * @param {string} value
   */
  _applyListStyle(value) {
    // ── "解除": delegate to the same toggle-off logic ────────────────────────
    // _toggleListOff saves and restores the selection internally.
    if (value === 'kuro-list-remove') {
      this._toggleListOff('OL')
      return
    }

    const sel = window.getSelection()
    if (!sel?.rangeCount) return

    // ── Save the selection NOW — before any DOM mutation ──────────────────────
    // _insertList (called below when not in an OL) collapses the caret to the
    // end of the first <li>.  Saving here lets us restore the original selection
    // after all mutations, regardless of which path is taken.
    //
    // Key insight: _insertList moves text nodes from <p> → <li> via appendChild/
    // insertBefore, which keeps them in the live document at all times.  A Range
    // that references those text nodes stays valid after the move — only the
    // parent changes, not the node identity.  So setBaseAndExtent at the end
    // reliably re-selects the same characters even after reparenting.
    const savedRange = sel.getRangeAt(0).cloneRange()

    // ── Walk up from the saved position to the nearest <ol> ──────────────────
    let node = savedRange.startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    let ol = null
    while (node && node !== this.wysiwyg) {
      if (node.tagName === 'OL') { ol = node; break }
      node = node.parentElement
    }

    // ── Not in an OL → insert one, then locate it via the saved position ──────
    if (!ol) {
      this._insertList('OL')
      // _insertList collapsed the caret; walk up from the saved text node
      // (now inside <li>) to find the freshly created <ol>.
      let n = savedRange.startContainer
      if (n.nodeType === Node.TEXT_NODE) n = n.parentElement
      while (n && n !== this.wysiwyg) {
        if (n.tagName === 'OL') { ol = n; break }
        n = n.parentElement
      }
      if (!ol) return
    }

    // ── Swap the style class ──────────────────────────────────────────────────
    const PREFIX = 'kuro-list-'
    Array.from(ol.classList)
      .filter(c => c.startsWith(PREFIX))
      .forEach(c => ol.classList.remove(c))
    ol.classList.add(value)

    // ── Restore the original selection ────────────────────────────────────────
    // Works for both paths: class-only change (text nodes unmoved, trivially valid)
    // and insert-then-style (text nodes reparented to <li>, same node objects).
    //
    // Guard: _insertList removes <p>/<h*> elements (target.remove()), but TEXT
    // nodes are moved (li.appendChild), so they stay connected.  If the saved
    // endpoint was the block element itself (not a text child), it may now be
    // detached.  In that case, fall back to end-of-start or first-li content.
    this._restoreListRange(sel, savedRange, ol)
  }

  /**
   * Apply an unordered-list bullet symbol to the nearest <ul> containing the caret.
   * Exact mirror of _applyListStyle — no wysiwyg.focus() (selection already restored
   * by _bindSubBtn before this handler is called).
   *
   * value = 'kuro-ul-remove'        → remove the UL
   * value = any UL_STYLE_OPTIONS class → set symbol; insert UL first if needed
   *
   * @param {string} value
   */
  _applyULStyle(value) {
    // ── "解除": remove the nearest <ul> ──────────────────────────────────────
    // _toggleListOff saves and restores the selection internally.
    if (value === 'kuro-ul-remove') {
      this._toggleListOff('UL')
      return
    }

    const sel = window.getSelection()
    if (!sel?.rangeCount) return

    // ── Save the selection NOW — before any DOM mutation ──────────────────────
    // Same rationale as _applyListStyle: _insertList moves text nodes via
    // insertBefore (no detach), so the saved Range stays valid after reparenting.
    const savedRange = sel.getRangeAt(0).cloneRange()

    // ── Walk up from the saved position to the nearest <ul> ──────────────────
    let node = savedRange.startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    let ul = null
    while (node && node !== this.wysiwyg) {
      if (node.tagName === 'UL') { ul = node; break }
      node = node.parentElement
    }

    // ── Not in a UL → insert one, then locate it via the saved position ───────
    if (!ul) {
      this._insertList('UL')
      // _insertList collapsed the caret; walk up from saved text node (now in <li>).
      let n = savedRange.startContainer
      if (n.nodeType === Node.TEXT_NODE) n = n.parentElement
      while (n && n !== this.wysiwyg) {
        if (n.tagName === 'UL') { ul = n; break }
        n = n.parentElement
      }
      if (!ul) return
    }

    // ── Swap the style class (remove all kuro-ul-* then add the chosen one) ──
    const PREFIX = 'kuro-ul-'
    Array.from(ul.classList)
      .filter(c => c.startsWith(PREFIX))
      .forEach(c => ul.classList.remove(c))
    ul.classList.add(value)

    // ── Restore the original selection ────────────────────────────────────────
    this._restoreListRange(sel, savedRange, ul)
  }

  /**
   * Robustly restore the selection after _insertList has reparented DOM nodes.
   *
   * Text nodes are MOVED (li.appendChild) so they remain connected — their
   * Range endpoints stay valid even after reparenting.  But when a Range
   * endpoint was the block ELEMENT itself (e.g. the <p> at offset 0),
   * _insertList's target.remove() detaches it.  setBaseAndExtent() throws on
   * detached nodes and the catch silently loses the selection.
   *
   * Strategy:
   *   1. If endContainer is detached → shrink end to (startContainer, text.length)
   *   2. If startContainer is detached → collapse to start of first list item
   *   3. Otherwise → normal setBaseAndExtent
   *
   * @param {Selection} sel
   * @param {Range}     savedRange  — cloned BEFORE _insertList was called
   * @param {HTMLElement} list      — the <ul> or <ol> that was just created/updated
   */
  _restoreListRange(sel, savedRange, list) {
    let sc = savedRange.startContainer, so = savedRange.startOffset
    let ec = savedRange.endContainer,   eo = savedRange.endOffset

    // isConnected is the cleanest modern check (vs. document.contains which can
    // throw cross-document).  Fall back to wysiwyg.contains() for older engines.
    const connected = (n) => {
      try { return n.isConnected ?? this.wysiwyg.contains(n) } catch { return false }
    }

    if (!connected(ec)) {
      // endContainer was a block element that _insertList removed.
      // Shrink the selection end to the tail of startContainer if possible.
      ec = sc
      eo = sc.nodeType === Node.TEXT_NODE ? sc.length : so
    }
    if (!connected(sc)) {
      // startContainer also detached — last resort: select start of first <li>.
      const firstText = list?.querySelector('li')?.firstChild
      if (firstText) {
        try { sel.setBaseAndExtent(firstText, 0, firstText, 0) } catch (_) {}
      }
      return
    }
    try { sel.setBaseAndExtent(sc, so, ec, eo) } catch (_) {}
  }

  /**
   * Apply a text colour to the current selection using DOM manipulation — NOT
   * execCommand('foreColor'), which has two problems:
   *   1. It collapses the selection to the end of the coloured text.
   *   2. It stores colour as rgb() which makes equality checks fragile.
   *
   * Strategy:
   *   a) Try range.surroundContents() — works when selection stays within one block.
   *   b) If that throws (cross-element selection), extract the fragment, wrap it,
   *      then reinsert — coarser but handles multi-element ranges.
   *   c) After wrapping, re-select the span contents so the user still sees the
   *      selection highlight and can chain more formatting actions.
   *
   * @param {string} color - CSS colour value, e.g. '#ef4444'
   */
  _applyColor(color) {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return

    const span = document.createElement('span')
    span.style.color = color

    try {
      range.surroundContents(span)
      // After surroundContents the live Range already wraps span's content —
      // no manual restore needed; the browser updates it automatically.
    } catch {
      // Selection crosses element boundaries → extract → wrap → reinsert
      span.appendChild(range.extractContents())
      range.insertNode(span)
      // insertNode may collapse the range, so we explicitly re-select span content.
      // Use setBaseAndExtent (atomic, no empty-selection gap) with fallback.
      try {
        sel.setBaseAndExtent(span, 0, span, span.childNodes.length)
      } catch {
        try {
          const nr = document.createRange()
          nr.selectNodeContents(span)
          sel.removeAllRanges()
          sel.addRange(nr)
        } catch (_) {}
      }
    }
    // Keep _activeRange in sync for further sub-panel actions
    if (sel.rangeCount) this.popm._activeRange = sel.getRangeAt(0).cloneRange()
  }

  /**
   * Remove text colour from the current selection by unwrapping colour spans
   * rather than replacing with a new colour.  Mirrors the heading-toggle-off
   * approach: remove only what was added, leave everything else intact.
   */
  _clearColor() {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)

    // Collect spans inside wysiwyg that carry a color style AND overlap selection
    const spans = Array.from(this.wysiwyg.querySelectorAll('span[style]'))
    for (const span of spans) {
      if (!span.style.color) continue
      if (!range.intersectsNode(span)) continue

      span.style.removeProperty('color')

      // Unwrap the span if it now has no meaningful style/class/attribute left.
      // IMPORTANT: move children with insertBefore (not DocumentFragment).
      // Going through a DocumentFragment detaches text nodes from the main
      // document momentarily, which invalidates Range endpoints in Safari —
      // the selection collapses.  insertBefore keeps every node in the live
      // document at all times, so Range refs stay valid.
      const hasStyle = span.style.cssText.trim() !== ''
      const hasClass = span.className !== ''
      const hasExtra = Array.from(span.attributes).some(a => a.name !== 'style' && a.name !== 'class')
      if (!hasStyle && !hasClass && !hasExtra) {
        // insertBefore keeps text nodes in the live document at all times.
        // The browser's Range objects automatically track node moves via
        // insertBefore, so the current selection follows the text node from
        // inside the span to its new position in the parent — no explicit
        // restore needed (and avoiding removeAllRanges prevents focus glitches).
        const parent = span.parentNode
        while (span.firstChild) parent.insertBefore(span.firstChild, span)
        span.remove()
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL MENU ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  _toggleToc() {
    this._tocEnabled = !this._tocEnabled
    this.tabTocBtn.classList.toggle('kuro-tabs__toc-btn--active', this._tocEnabled)
    if (this._tocEnabled) {
      this.tocPanelEl.classList.remove('kuro-toc--user-hidden')
      // Restore the user-chosen width (if any) from the previous session
      if (this._tocWidth !== null) this.tocPanelEl.style.width = `${this._tocWidth}px`
      this.toc._doUpdate()   // re-evaluate heading-based visibility
    } else {
      this.tocPanelEl.classList.add('kuro-toc--user-hidden')
    }
  }

  /**
   * Hook up drag-resize on the small handle between the edit pane and the ToC.
   * The chosen width is held on the editor instance (this._tocWidth) so the
   * value survives toggling the ToC closed/open within the same session.
   */
  _bindTocResizer() {
    const MIN = 140   // px
    const MAX = 600   // px

    this.tocResizer.addEventListener('mousedown', (e) => {
      // Only react to the primary mouse button
      if (e.button !== 0) return
      e.preventDefault()

      const startX     = e.clientX
      const startWidth = this.tocPanelEl.getBoundingClientRect().width

      const onMove = (ev) => {
        // Dragging left widens the ToC; dragging right shrinks it
        const delta = startX - ev.clientX
        const w = Math.max(MIN, Math.min(MAX, startWidth + delta))
        this.tocPanelEl.style.width = `${w}px`
        this._tocWidth = w
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup',   onUp)
        document.body.classList.remove('kuro-toc-resizing')
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup',   onUp)
      document.body.classList.add('kuro-toc-resizing')
    })
  }

  _handleMMenu(id, anchorEl = null) {
    switch (id) {
      case 'emoji':
        this._saveRange()
        this.emojiPanel.toggle(anchorEl ?? this._mmenuBtns.emoji)
        break
      case 'table':    this._insertTable();     break
      case 'code':     this._insertCodeBlock(); break
      case 'hr':       this._insertHR();        break
      case 'media':    this._promptMedia();     break
      case 'roundbox': this._insertRoundbox();  break
    }
  }

  _saveRange() {
    const sel = window.getSelection()
    if (sel?.rangeCount) this._savedRange = sel.getRangeAt(0).cloneRange()
  }

  _insertTable() {
    this.wysiwyg.focus()
    execFormat('insertHTML', createTableHtml(3, 3) + '<p><br></p>')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CODE BLOCK (textarea-based — simple and reliable)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // DOM:
  //   <div class="kuro-code-wrap" contenteditable="false">
  //     <div class="kuro-code__gutter">1</div>
  //     <textarea class="kuro-code__area"></textarea>
  //   </div>
  //
  // The <textarea> handles all editing natively — Enter inserts "\n",
  // Tab is intercepted to insert "\t" instead of jumping focus, gutter is
  // synced on every input.  Save form is <pre><code>…</code></pre>.

  _insertCodeBlock() {
    this.wysiwyg.focus()
    execFormat('insertHTML', this._buildCodeBlockHtml('') + '<p><br></p>')
    requestAnimationFrame(() => {
      const wraps = this.wysiwyg.querySelectorAll('.kuro-code-wrap')
      const wrap  = wraps[wraps.length - 1]
      if (!wrap) return
      this._wireCodeBlock(wrap)
      wrap.querySelector('.kuro-code__area')?.focus()
    })
  }

  /** Build initial HTML for a (possibly pre-filled) code block. */
  _buildCodeBlockHtml(content) {
    const escaped = (content || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return (
      `<div class="kuro-code-wrap" contenteditable="false">` +
        `<div class="kuro-code__gutter" aria-hidden="true">1</div>` +
        `<textarea class="kuro-code__area" spellcheck="false" cols="1" rows="1" wrap="off">${escaped}</textarea>` +
        `<button class="kuro-code__del" type="button" title="コードブロックを削除" aria-label="コードブロックを削除"><svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="0.5,2.5 10.5,2.5"/><path d="M3.5,2.5v-1h4v1"/><path d="M1.5,2.5l.7,8h6.6l.7-8"/><line x1="4" y1="5" x2="4" y2="8.5"/><line x1="7" y1="5" x2="7" y2="8.5"/></svg></button>` +
        `<button class="kuro-code__copy" type="button" title="コードをコピー" aria-label="コードをコピー">📋</button>` +
      `</div>`
    )
  }

  /** Attach input / Tab / autosize handlers to a code-block textarea. */
  _wireCodeBlock(wrap) {
    const ta = wrap.querySelector('.kuro-code__area')
    if (!ta || ta._kuroWired) return
    ta._kuroWired = true

    const sync = () => {
      ta.style.height = '0'
      ta.style.height = ta.scrollHeight + 'px'
      const gutter = wrap.querySelector('.kuro-code__gutter')
      if (gutter) {
        const n = Math.max(1, ta.value.split('\n').length)
        gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n')
      }
    }

    // ── Stop all keyboard / input / mouse events from bubbling to wysiwyg ──
    // The outer .kuro-code-wrap is contenteditable="false" but events still
    // propagate.  Without stopPropagation, wysiwyg-level Tab handler would
    // run and add padding-left to the wrap on every Tab press.
    const stop = (e) => e.stopPropagation()
    ;['input', 'keydown', 'keyup', 'keypress', 'paste', 'cut', 'copy',
      'mousedown', 'mouseup', 'click'].forEach(evt => {
      ta.addEventListener(evt, stop)
    })

    // ── Delete button ──────────────────────────────────────────────────────
    const delBtn = wrap.querySelector('.kuro-code__del')
    if (delBtn) {
      delBtn.addEventListener('mousedown', (e) => e.stopPropagation())
      delBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const p = document.createElement('p')
        p.innerHTML = '<br>'
        wrap.replaceWith(p)
        const sel = window.getSelection()
        sel.setBaseAndExtent(p, 0, p, 0)
        this.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    // ── Copy button ────────────────────────────────────────────────────────
    const copyBtn = wrap.querySelector('.kuro-code__copy')
    if (copyBtn) {
      copyBtn.addEventListener('mousedown', (e) => e.stopPropagation())
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const txt = ta.value
        let ok = false
        try {
          await navigator.clipboard.writeText(txt)
          ok = true
        } catch {
          // フォールバック: 古いブラウザ / 非 HTTPS 環境
          try { ta.select(); ok = document.execCommand('copy'); ta.selectionEnd = ta.selectionStart } catch {}
        }
        const original = copyBtn.textContent
        copyBtn.textContent = ok ? '✓' : '✗'
        copyBtn.classList.add('kuro-code__copy--flash')
        setTimeout(() => {
          copyBtn.textContent = original
          copyBtn.classList.remove('kuro-code__copy--flash')
        }, 1500)
      })
    }

    ta.addEventListener('input', sync)

    ta.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return
      e.preventDefault()
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      if (e.shiftKey) {
        const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
        let remove = 0
        if (ta.value[lineStart] === '\t') remove = 1
        else if (ta.value.slice(lineStart, lineStart + 2) === '  ') remove = 2
        else if (ta.value[lineStart] === ' ') remove = 1
        if (remove > 0) {
          ta.value = ta.value.slice(0, lineStart) + ta.value.slice(lineStart + remove)
          ta.selectionStart = ta.selectionEnd = Math.max(lineStart, start - remove)
          sync()
        }
      } else {
        ta.value = ta.value.slice(0, start) + '\t' + ta.value.slice(end)
        ta.selectionStart = ta.selectionEnd = start + 1
        sync()
      }
    })

    sync()   // initial autosize + gutter
    this._bindCodeBlockDrag(wrap)
  }

  _bindCodeBlockDrag(wrap) {
    const gutter = wrap.querySelector('.kuro-code__gutter')
    if (!gutter || gutter._kuroDragWired) return
    gutter._kuroDragWired = true

    const wysiwyg = this.wysiwyg

    gutter.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      const indicator = document.createElement('div')
      indicator.className = 'kuro-code-drop-indicator'
      wrap.classList.add('kuro-code-wrap--dragging')

      let dropTarget = null

      const getDropTarget = (clientY) => {
        const siblings = Array.from(wysiwyg.children).filter(c => c !== wrap && c !== indicator)
        for (const el of siblings) {
          const rect = el.getBoundingClientRect()
          if (clientY <= rect.top + rect.height / 2) return { el, before: true }
          if (clientY <= rect.bottom)                 return { el, before: false }
        }
        const last = siblings[siblings.length - 1]
        return last ? { el: last, before: false } : null
      }

      const onMouseMove = (e) => {
        dropTarget = getDropTarget(e.clientY)
        if (!dropTarget) { indicator.remove(); return }
        dropTarget.before ? dropTarget.el.before(indicator) : dropTarget.el.after(indicator)
      }

      const onMouseUp = () => {
        wrap.classList.remove('kuro-code-wrap--dragging')
        indicator.remove()
        if (dropTarget) {
          dropTarget.before ? dropTarget.el.before(wrap) : dropTarget.el.after(wrap)
        }
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup',   onMouseUp)
        wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup',   onMouseUp)
    })
  }

  /**
   * Convert any legacy <pre.kuro-code><code> back to the new wrap, then wire
   * every wrap (including freshly-loaded HTML).
   */
  _initAllCodeBlocks() {
    // ① Migrate legacy pre+code to the wrap structure
    for (const pre of this.wysiwyg.querySelectorAll('pre.kuro-code')) {
      if (pre.closest('.kuro-code-wrap')) continue
      const code = pre.querySelector('code')
      const tmp = document.createElement('div')
      tmp.innerHTML = this._buildCodeBlockHtml(code ? code.textContent : '')
      pre.replaceWith(tmp.firstChild)
    }
    // ② Wire all wraps
    for (const wrap of this.wysiwyg.querySelectorAll('.kuro-code-wrap')) {
      this._wireCodeBlock(wrap)
    }
  }

  /**
   * Replace each <textarea>-based wrap in `root` with a serialisable
   * <pre><code>…</code></pre> capturing the live textarea value (which
   * is not present in innerHTML for cloned trees).
   */
  _serializeCodeBlocksToHtml(root) {
    const live  = Array.from(this.wysiwyg.querySelectorAll('.kuro-code-wrap'))
    const clone = Array.from(root.querySelectorAll('.kuro-code-wrap'))
    clone.forEach((wrap, i) => {
      const value = live[i]?.querySelector('.kuro-code__area')?.value ?? ''
      const pre  = document.createElement('pre')
      pre.className = 'kuro-code'
      const code = document.createElement('code')
      code.textContent = value
      pre.appendChild(code)
      wrap.replaceWith(pre)
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UNDO / REDO  (browser-provided history via execCommand)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Chrome / Safari / Firefox all maintain a per-element undo stack for
  // contenteditable. execCommand('undo'/'redo') is stable enough for typical
  // editing operations; complex DOM manipulations we do (table merge, callout
  // wrap, etc.) may not be perfectly reversible, but a single undo always
  // brings the user closer to the previous state.

  _undo() {
    this.wysiwyg.focus()
    try { document.execCommand('undo') } catch (_) {}
    this._updateCharCount()
  }

  _redo() {
    this.wysiwyg.focus()
    try { document.execCommand('redo') } catch (_) {}
    this._updateCharCount()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARACTER COUNT
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // 「字」表示は textContent ベース。スペース・改行・全角半角を区別せず
  // 単純に code unit 数 (Array.from で書記素も 1 字としてカウント)。

  _updateCharCount() {
    // Array.from で書記素クラスタを 1 文字として扱う（絵文字なども 1 字）
    const text = (this.wysiwyg.textContent || '').replace(/\s+/g, ' ').trim()
    const n = Array.from(text).length
    const label = `文字数 ${n.toLocaleString('ja-JP')}`
    if (this._mmenuCharCount) this._mmenuCharCount.textContent = label
    if (this._tabCharCount)   this._tabCharCount.textContent   = label
  }

  _insertHR() {
    this.wysiwyg.focus()
    execFormat('insertHTML', '<hr class="kuro-hr"><p><br></p>')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUNDED BOX
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // DOM:
  //   <div class="kuro-roundbox" data-align="center" data-width="100%"
  //        style="width:100%;display:block;margin:0 auto">
  //     <p>...</p>
  //   </div>
  //
  // 普通のブロック div。wysiwyg 内で普通に編集可能。
  // カーソルが中にある間だけ RoundboxMenu（kmenu）が浮かぶ。
  // float で左右 align → 周囲テキストが回り込む。ネスト可能。

  _insertRoundbox() {
    this.wysiwyg.focus()
    execFormat('insertHTML',
      '<div class="kuro-roundbox" data-align="center" data-width="100%"' +
      ' style="width:100%;display:block;margin:0 auto"><p><br></p></div>' +
      '<p><br></p>'
    )
    // Drop the caret INSIDE the new box so its settings menu (kmenu) appears right
    // away. After insertHTML the caret usually sits in the trailing <p>, whose
    // previous sibling is the new box.
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    let n = sel.getRangeAt(0).startContainer
    while (n && n.parentNode && n.parentNode !== this.wysiwyg) n = n.parentNode
    const box = n?.classList?.contains('kuro-roundbox')
      ? n
      : (n?.previousElementSibling?.classList?.contains('kuro-roundbox') ? n.previousElementSibling : null)
    if (box) {
      const p = box.querySelector('p') || box
      const r = document.createRange()
      r.setStart(p, 0)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
      this._updateRoundboxContext()
    }
  }

  // Returns the nearest .kuro-roundbox ancestor of the current caret, or null.
  _roundboxAtCaret() {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return null
    let node = sel.getRangeAt(0).startContainer
    while (node && node !== this.wysiwyg) {
      if (node.nodeType === 1 && node.classList?.contains('kuro-roundbox')) return node
      node = node.parentNode
    }
    return null
  }

  // Full update (activate OR deactivate) — used from mouseup / keyup where it is
  // safe to dismiss the menu when the caret has left the box.
  _updateRoundboxContext() {
    const box = this._roundboxAtCaret()
    if (box) this.roundboxMenu.activate(box)
    else this.roundboxMenu.deactivate()
  }

  _promptMedia() {
    // Show custom media dialog near the current caret position.
    // _savedRange is updated on wysiwyg blur (which fires when clicking mmenu).
    this.mediaDialog.show(this._savedRange, this.wysiwyg)
  }

  /** Open the line-style popup near a row/col border button; close any open popm first. */
  _openLinePopup(target, anchorBtn) {
    this.popm.hide()
    this.tableManager._hideColorPanel?.()
    this.linePopupMenu.open(target, anchorBtn)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set editor content. [[...]] syntax in the supplied HTML is rendered.
   * @param {string} html
   */
  setContent(html) {
    const rendered = renderSpecialLinks(html ?? '', this.options.urlResolver)
    this.wysiwyg.innerHTML = rendered
    if (this._mode === 'source') this.sourceArea.value = html ?? ''
    this.toc._doUpdate()
    this._initAllCodeBlocks()
    this._updateCharCount()
  }

  /**
   * Get current content as an HTML string with [[...]] syntax restored.
   * @returns {string}
   */
  getContent() {
    if (this._mode === 'source') return this.sourceArea.value
    // Clone the live tree, then serialize code-block textareas to <pre><code>.
    const clone = this.wysiwyg.cloneNode(true)
    this._serializeCodeBlocksToHtml(clone)
    return unrenderSpecialLinks(clone.innerHTML)
  }

  /**
   * Switch edit mode.
   * @param {'wysiwyg'|'source'} mode
   */
  setMode(mode)  { this._setMode(mode) }

  /** @returns {'wysiwyg'|'source'} */
  getMode()      { return this._mode }

  /** Read the persisted auto-save preference. Defaults to ON (true) when unset. */
  _readAutoSavePref() {
    try {
      return window.localStorage.getItem('kuro-editor-autosave') !== '0'
    } catch {
      return true  // private mode / storage disabled → keep the default
    }
  }

  /** Persist the auto-save preference ('1' = on, '0' = off). */
  _writeAutoSavePref(on) {
    try {
      window.localStorage.setItem('kuro-editor-autosave', on ? '1' : '0')
    } catch {
      /* storage unavailable — preference simply won't survive reloads */
    }
  }

  /** Start periodic auto-save (default interval 30 s, overridable via options). */
  _startAutoSave() {
    this._stopAutoSave()  // clear any existing timer
    const ms = this.options.autoSaveInterval ?? 30_000
    this._autoSaveTimer = setInterval(() => {
      this.options.onSave?.(this.getContent())
    }, ms)
  }

  _stopAutoSave() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer)
      this._autoSaveTimer = null
    }
  }

  /** Remove the editor and restore the original mount element. */
  destroy() {
    this._stopAutoSave()

    // Remove document-level listeners registered in _bindEvents()
    document.removeEventListener('selectionchange', this._onDocSelChange)
    document.removeEventListener('mousedown',       this._onDocMousedown)
    document.removeEventListener('mouseup',         this._onDocMouseup)

    this.toc.destroy()
    this.roundboxMenu.destroy()
    this.tableManager.destroy()
    this.tableInserter.destroy()
    this.tableResizer.destroy()
    this.linePopupMenu.destroy()
    this.emojiPanel.destroy()
    this.mediaDialog.destroy()
    this.imageMenu.destroy()
    this.mmenu.remove()   // fixed to body (or modalToolbar) — remove separately
    this.root.replaceWith(this.mountEl)
  }
}
