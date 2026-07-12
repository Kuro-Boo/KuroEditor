/**
 * Unit tests — pure utility functions (no DOM required for most)
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createElement,
  renderSpecialLinks,
  unrenderSpecialLinks,
  defaultResolver,
  createTableHtml,
  contrastTextColor,
  findCell,
  parseMediaParams,
  resolveEmbedUrl,
  VERSION,
  LINK_RE,
  readLinkParts,
  writeLinkParts,
  linkAtCaret,
  normalizePastedLinks,
} from '../src/editor.js'

// ─── VERSION ──────────────────────────────────────────────────────────────────

describe('VERSION', () => {
  it('is a semver string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

// ─── defaultResolver ──────────────────────────────────────────────────────────

describe('defaultResolver', () => {
  it('returns http urls unchanged', () => {
    expect(defaultResolver('https://example.com')).toBe('https://example.com')
    expect(defaultResolver('http://foo.bar/baz')).toBe('http://foo.bar/baz')
  })

  it('prefixes slugs with /', () => {
    expect(defaultResolver('my-article')).toBe('/my-article')
    expect(defaultResolver('en/about')).toBe('/en/about')
  })
})

// ─── renderSpecialLinks ───────────────────────────────────────────────────────

describe('renderSpecialLinks', () => {
  it('converts [[[slug]]] to card link (new tab)', () => {
    const result = renderSpecialLinks('[[[my-page]]]')
    expect(result).toContain('href="/my-page"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('kuro-card-link')
    expect(result).toContain('my-page')
  })

  it('converts [[slug|label]] to wiki link', () => {
    const result = renderSpecialLinks('[[my-page|続きを読む]]')
    expect(result).toContain('href="/my-page"')
    expect(result).toContain('続きを読む')
    expect(result).not.toContain('target="_blank"')
  })

  it('converts [[slug]] to hyperlink', () => {
    const result = renderSpecialLinks('[[my-page]]')
    expect(result).toContain('href="/my-page"')
    expect(result).toContain('my-page')
  })

  it('treats [[http://...]] as external link', () => {
    const result = renderSpecialLinks('[[https://example.com]]')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('target="_blank"')
  })

  // ── URL card [[slug|]] — 表題なしを明示した記法 ──────────────────────────

  it('renders [[URL|]] (empty label) as a URL card, not a text link', () => {
    const result = renderSpecialLinks('[[https://example.com/blog/post|]]')
    expect(result).toContain('kuro-url-card')
    expect(result).toContain('href="https://example.com/blog/post"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('contenteditable="false"')
    // タイトル行は URL から取得したホスト名、URL 行はフル URL
    expect(result).toContain('<span class="kuro-url-card__title">example.com</span>')
    expect(result).toContain('<span class="kuro-url-card__url">https://example.com/blog/post</span>')
  })

  it('renders [[slug|]] with an internal slug as a card (title = slug, same tab)', () => {
    const result = renderSpecialLinks('[[my-article|]]')
    expect(result).toContain('kuro-url-card')
    expect(result).toContain('href="/my-article"')
    expect(result).not.toContain('target="_blank"')
    expect(result).toContain('<span class="kuro-url-card__title">my-article</span>')
  })

  it('URL card round-trips through unrenderSpecialLinks', () => {
    const raw = '[[https://example.com/post|]]'
    expect(unrenderSpecialLinks(renderSpecialLinks(raw))).toBe(raw)
  })

  it('media URL with empty label also becomes a card (明示された意図を優先)', () => {
    const result = renderSpecialLinks('[[https://example.com/hero.jpg|]]')
    expect(result).toContain('kuro-url-card')
    expect(result).not.toContain('<figure')
  })

  it('processes card before wiki before hyper (correct precedence)', () => {
    // Card pattern must win over hyper pattern for [[[slug]]]
    const result = renderSpecialLinks('[[[card-slug]]]')
    // Should only have ONE anchor, not nested
    const anchorCount = (result.match(/<a /g) || []).length
    expect(anchorCount).toBe(1)
  })

  it('accepts a custom resolver', () => {
    const customResolver = (slug) => `https://cdn.example.com/${slug}`
    const result = renderSpecialLinks('[[photo]]', customResolver)
    expect(result).toContain('href="https://cdn.example.com/photo"')
  })

  it('leaves plain text unchanged', () => {
    const text = 'Hello, world! No special syntax here.'
    expect(renderSpecialLinks(text)).toBe(text)
  })

  it('renders [[mid-xxx]] as <figure><img>', () => {
    const result = renderSpecialLinks('[[mid-abc123]]', (slug) => `https://cdn.example.com/${slug}`)
    expect(result).toContain('<figure')
    expect(result).toContain('kuro-media-wrap')
    expect(result).toContain('<img')
    expect(result).toContain('data-kuro-media=')
  })

  it('renders [[mid-xxx|60%,right]] as figure with size+align', () => {
    const result = renderSpecialLinks('[[mid-abc|60%,right]]', (slug) => `https://cdn.example.com/${slug}`)
    expect(result).toContain('kuro-media-wrap--right')
    expect(result).toContain('width:60%')
    expect(result).not.toContain('>60%,right<')   // label must NOT appear as text
  })

  it('renders [[mid-xxx|60%,right|https://link]] as figure with link button', () => {
    const result = renderSpecialLinks('[[mid-abc|60%,right|https://link.example.com]]', (slug) => `https://cdn.example.com/${slug}`)
    expect(result).toContain('kuro-media-open-link')
    expect(result).toContain('href="https://link.example.com"')
    expect(result).toContain('target="_blank"')
  })

  it('renders [[url.mp3]] as <figure><audio controls>', () => {
    const result = renderSpecialLinks('[[https://example.com/song.mp3]]')
    expect(result).toContain('<figure')
    expect(result).toContain('<audio')
    expect(result).toContain('controls')
  })

  it('renders [[youtube-url]] as iframe figure', () => {
    const result = renderSpecialLinks('[[https://www.youtube.com/watch?v=dQw4w9WgXcQ]]')
    expect(result).toContain('kuro-media-wrap--iframe')
    expect(result).toContain('<iframe')
    expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('renders [[youtu.be/...]] as iframe figure', () => {
    const result = renderSpecialLinks('[[https://youtu.be/dQw4w9WgXcQ]]')
    expect(result).toContain('<iframe')
    expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  // ── URL without file extension (CDN / R2 paths) ───────────────────────────

  it('renders [[ext-url-no-ext|60%,right]] as image figure', () => {
    // URL has no recognised extension but label is media params → image
    const result = renderSpecialLinks('[[https://cdn.example.com/hero|60%,right]]')
    expect(result).toContain('<figure')
    expect(result).toContain('<img')
    expect(result).toContain('kuro-media-wrap--right')
    expect(result).toContain('width:60%')
    // Make sure it did NOT render as a link with label text
    expect(result).not.toContain('>60%,right<')
  })

  it('renders [[ext-url-no-ext|center]] as centred image', () => {
    const result = renderSpecialLinks('[[https://cdn.example.com/hero|center]]')
    expect(result).toContain('kuro-media-wrap--center')
    expect(result).toContain('<img')
  })

  it('renders [[ext-url-no-ext||https://link]] as image with link button', () => {
    const result = renderSpecialLinks('[[https://cdn.example.com/hero||https://link.example.com]]')
    expect(result).toContain('<figure')
    expect(result).toContain('kuro-media-open-link')
  })

  it('does NOT treat [[http-url|display text]] as media', () => {
    // Label is regular text → must remain a wiki link, not a media figure
    const result = renderSpecialLinks('[[https://example.com/page|続きを読む]]')
    expect(result).toContain('href="https://example.com/page"')
    expect(result).toContain('続きを読む')
    expect(result).not.toContain('<figure')
    expect(result).not.toContain('<img')
  })

  it('does NOT treat [[http-url|Click here]] as media', () => {
    const result = renderSpecialLinks('[[https://example.com/page|Click here]]')
    expect(result).toContain('Click here') // should be wiki link with label text
    expect(result).not.toContain('<figure')
    expect(result).toContain('href="https://example.com/page"')
  })
})

// ─── parseMediaParams ─────────────────────────────────────────────────────────

describe('parseMediaParams', () => {
  it('returns nulls for empty/null input', () => {
    expect(parseMediaParams('')).toEqual({ size: null, align: null, link: null })
    expect(parseMediaParams(null)).toEqual({ size: null, align: null, link: null })
  })

  it('parses size only', () => {
    expect(parseMediaParams('60%')).toEqual({ size: '60%', align: null, link: null })
    expect(parseMediaParams('100%')).toEqual({ size: '100%', align: null, link: null })
  })

  it('parses align only', () => {
    expect(parseMediaParams('right')).toEqual({ size: null, align: 'right', link: null })
    expect(parseMediaParams('center')).toEqual({ size: null, align: 'center', link: null })
    expect(parseMediaParams('left')).toEqual({ size: null, align: 'left', link: null })
  })

  it('parses size,align together', () => {
    expect(parseMediaParams('60%,right')).toEqual({ size: '60%', align: 'right', link: null })
    expect(parseMediaParams('right,50%')).toEqual({ size: '50%', align: 'right', link: null })
  })

  it('parses size,align|link', () => {
    expect(parseMediaParams('60%,right|https://example.com'))
      .toEqual({ size: '60%', align: 'right', link: 'https://example.com' })
  })

  it('parses link only (|url)', () => {
    expect(parseMediaParams('|https://example.com'))
      .toEqual({ size: null, align: null, link: 'https://example.com' })
  })

  it('link URLs may contain commas', () => {
    const { link } = parseMediaParams('60%|https://example.com/a,b')
    expect(link).toBe('https://example.com/a,b')
  })

  it('ignores unknown tokens', () => {
    expect(parseMediaParams('60%,bogus')).toEqual({ size: '60%', align: null, link: null })
  })
})

// ─── resolveEmbedUrl ──────────────────────────────────────────────────────────

describe('resolveEmbedUrl', () => {
  it('converts YouTube watch?v= to embed URL', () => {
    expect(resolveEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('converts youtu.be short URL to embed URL', () => {
    expect(resolveEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('converts YouTube /shorts/ URL', () => {
    expect(resolveEmbedUrl('https://www.youtube.com/shorts/abc123'))
      .toBe('https://www.youtube.com/embed/abc123')
  })

  it('converts Vimeo URL', () => {
    expect(resolveEmbedUrl('https://vimeo.com/123456789'))
      .toBe('https://player.vimeo.com/video/123456789')
  })

  it('returns null for plain image URLs', () => {
    expect(resolveEmbedUrl('https://example.com/photo.jpg')).toBeNull()
  })

  it('returns null for unknown domains', () => {
    expect(resolveEmbedUrl('https://example.com/video')).toBeNull()
  })

  it('returns null for empty/null', () => {
    expect(resolveEmbedUrl('')).toBeNull()
    expect(resolveEmbedUrl(null)).toBeNull()
  })
})

// ─── createElement ────────────────────────────────────────────────────────────

describe('createElement', () => {
  it('creates an element with tag name', () => {
    const el = createElement('div')
    expect(el.tagName).toBe('DIV')
  })

  it('applies className', () => {
    const el = createElement('span', { className: 'foo bar' })
    expect(el.className).toBe('foo bar')
  })

  it('sets innerHTML', () => {
    const el = createElement('p', { html: '<b>bold</b>' })
    expect(el.innerHTML).toBe('<b>bold</b>')
  })

  it('sets attributes', () => {
    const el = createElement('button', { attrs: { type: 'button', disabled: '' } })
    expect(el.getAttribute('type')).toBe('button')
    expect(el.getAttribute('disabled')).toBe('')
  })
})

// ─── createTableHtml ──────────────────────────────────────────────────────────

describe('createTableHtml', () => {
  it('generates a <table> string', () => {
    const html = createTableHtml(3, 4)
    expect(html).toContain('<table')      // matches <table> or <table class="...">
    expect(html).toContain('<tbody>')
    expect(html).not.toContain('<thead>') // <thead> 廃止: 全行を <tbody> に統合
  })

  it('creates the right number of columns', () => {
    const html = createTableHtml(2, 3)
    // ヘッダー行廃止: 全セル <td>。2 行 × 3 列 = 6 個
    const tdCount = (html.match(/<td /g) || []).length
    expect(tdCount).toBe(6)
    // <th> は生成しない
    expect(html).not.toMatch(/<th\b/)
  })

  it('creates the right number of rows', () => {
    const html = createTableHtml(4, 2)
    const trCount = (html.match(/<tr>/g) || []).length
    expect(trCount).toBe(4)
  })

  it('cells are contenteditable', () => {
    const html = createTableHtml(2, 2)
    expect(html).toContain('contenteditable="true"')
  })

  it('defaults to 2×2 with all <td>', () => {
    const html = createTableHtml()
    const tdCount = (html.match(/<td /g) || []).length
    expect(tdCount).toBe(4)   // 2 rows × 2 cols
    expect(html).not.toMatch(/<th\b/)
  })
})

// ─── contrastTextColor ────────────────────────────────────────────────────────

describe('contrastTextColor', () => {
  it('returns white text for dark backgrounds', () => {
    expect(contrastTextColor('#374151')).toBe('#ffffff') // gray-700 (kuro.boo 本番で潰れた色)
    expect(contrastTextColor('#111827')).toBe('#ffffff') // gray-900
    expect(contrastTextColor('#ef4444')).toBe('#ffffff') // red-500
    expect(contrastTextColor('rgb(55, 65, 81)')).toBe('#ffffff')
  })

  it('returns dark text for light backgrounds', () => {
    expect(contrastTextColor('#ffffff')).toBe('#111827')
    expect(contrastTextColor('#fecdd3')).toBe('#111827') // rose-200
    expect(contrastTextColor('#e5e7eb')).toBe('#111827') // gray-200
    expect(contrastTextColor('rgb(255, 255, 0)')).toBe('#111827')
  })

  it('supports #rgb shorthand', () => {
    expect(contrastTextColor('#000')).toBe('#ffffff')
    expect(contrastTextColor('#fff')).toBe('#111827')
  })

  it('keeps inherited color for near-transparent backgrounds', () => {
    expect(contrastTextColor('rgba(0, 0, 0, 0.3)')).toBe('')
    expect(contrastTextColor('rgba(255, 255, 255, 0)')).toBe('')
  })

  it('treats opaque-enough rgba by its RGB', () => {
    expect(contrastTextColor('rgba(0, 0, 0, 0.8)')).toBe('#ffffff')
  })

  it('returns empty string for unparsable input', () => {
    expect(contrastTextColor('')).toBe('')
    expect(contrastTextColor('tomato')).toBe('')
    expect(contrastTextColor('var(--x)')).toBe('')
    expect(contrastTextColor(null)).toBe('')
  })
})

// ─── findCell ─────────────────────────────────────────────────────────────────

describe('findCell', () => {
  it('returns null when no cell ancestor exists', () => {
    const div = document.createElement('div')
    expect(findCell(div)).toBeNull()
  })

  it('returns the TD element itself', () => {
    const td = document.createElement('td')
    expect(findCell(td)).toBe(td)
  })

  it('returns the TH element itself', () => {
    const th = document.createElement('th')
    expect(findCell(th)).toBe(th)
  })

  it('climbs ancestors to find TD', () => {
    const td   = document.createElement('td')
    const span = document.createElement('span')
    const text = document.createTextNode('hi')
    span.appendChild(text)
    td.appendChild(span)
    expect(findCell(span)).toBe(td)
  })

  it('handles text nodes by using parentElement', () => {
    const td   = document.createElement('td')
    const text = document.createTextNode('hi')
    td.appendChild(text)
    expect(findCell(text)).toBe(td)
  })
})

// ─── readLinkParts / writeLinkParts / linkAtCaret ────────────────────────────

describe('readLinkParts', () => {
  const makeA = (html) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.querySelector('a')
  }

  it('reads wiki links: url = raw slug, text = label', () => {
    const a = makeA(renderSpecialLinks('[[my-page|表示名]]'))
    expect(readLinkParts(a)).toEqual({ text: '表示名', url: 'my-page' })
  })

  it('reads hyper links: url = raw slug', () => {
    const a = makeA(renderSpecialLinks('[[https://example.com/x]]'))
    expect(readLinkParts(a)).toEqual({ text: 'https://example.com/x', url: 'https://example.com/x' })
  })

  it('reads plain <a> from href / textContent', () => {
    const a = makeA('<a href="https://plain.example">click</a>')
    expect(readLinkParts(a)).toEqual({ text: 'click', url: 'https://plain.example' })
  })

  it('reads URL cards: text = empty, url = raw slug', () => {
    const a = makeA(renderSpecialLinks('[[https://example.com/post|]]'))
    expect(readLinkParts(a)).toEqual({ text: '', url: 'https://example.com/post' })
  })
})

describe('writeLinkParts', () => {
  const makeA = (html) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.querySelector('a')
  }

  it('rejects empty url without touching the link', () => {
    const a = makeA(renderSpecialLinks('[[slug|text]]'))
    expect(writeLinkParts(a, 'text', '')).toBe(false)
    expect(a.textContent).toBe('text')
  })

  it('rejects empty text on a plain <a> (non-kuro links stay unchanged)', () => {
    const a = makeA('<a href="https://plain.example">click</a>')
    expect(writeLinkParts(a, '', 'https://plain.example')).toBe(false)
    expect(a.textContent).toBe('click')
  })

  it('kuro link + empty text converts to URL card form [[url|]]', () => {
    const a = makeA(renderSpecialLinks('[[https://example.com/post|お知らせ]]'))
    expect(writeLinkParts(a, '', 'https://example.com/post')).toBe(true)
    expect(decodeURIComponent(a.getAttribute('data-kuro-wiki'))).toBe('[[https://example.com/post|]]')
    expect(a.classList.contains('kuro-url-card')).toBe(true)
    expect(a.getAttribute('contenteditable')).toBe('false')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.querySelector('.kuro-url-card__title').textContent).toBe('example.com')
    expect(a.querySelector('.kuro-url-card__url').textContent).toBe('https://example.com/post')
  })

  it('URL card + text converts back to a normal text link', () => {
    const a = makeA(renderSpecialLinks('[[https://example.com/post|]]'))
    expect(a.classList.contains('kuro-url-card')).toBe(true)
    expect(writeLinkParts(a, 'お知らせ', 'https://example.com/post')).toBe(true)
    expect(a.classList.contains('kuro-url-card')).toBe(false)
    expect(a.hasAttribute('contenteditable')).toBe(false)
    expect(a.textContent).toBe('お知らせ')
    expect(decodeURIComponent(a.getAttribute('data-kuro-wiki'))).toBe('[[https://example.com/post|お知らせ]]')
  })

  it('kuro link with text !== url becomes wiki form', () => {
    const a = makeA(renderSpecialLinks('[[https://example.com]]'))
    expect(writeLinkParts(a, 'サイト', 'https://example.com')).toBe(true)
    expect(decodeURIComponent(a.getAttribute('data-kuro-wiki'))).toBe('[[https://example.com|サイト]]')
    expect(a.hasAttribute('data-kuro-link')).toBe(false)
    expect(a.textContent).toBe('サイト')
    expect(a.getAttribute('href')).toBe('https://example.com')
  })

  it('kuro link with text === url becomes hyper form', () => {
    const a = makeA(renderSpecialLinks('[[page|label]]'))
    expect(writeLinkParts(a, 'other', 'other')).toBe(true)
    expect(decodeURIComponent(a.getAttribute('data-kuro-link'))).toBe('[[other]]')
    expect(a.hasAttribute('data-kuro-wiki')).toBe(false)
    expect(a.getAttribute('href')).toBe('/other')
  })

  it('resolves slug through the provided resolver', () => {
    const a = makeA(renderSpecialLinks('[[page|label]]'))
    writeLinkParts(a, 'ラベル', 'page2', (s) => `/base/${s}`)
    expect(a.getAttribute('href')).toBe('/base/page2')
  })

  it('rejects notation-breaking characters in kuro links', () => {
    const a = makeA(renderSpecialLinks('[[page|label]]'))
    expect(writeLinkParts(a, 'label', 'a|b')).toBe(false)
    expect(writeLinkParts(a, 'la]bel', 'page')).toBe(false)
  })

  it('plain <a>: sets href verbatim, keeps it plain', () => {
    const a = makeA('<a href="https://old.example">old</a>')
    expect(writeLinkParts(a, 'new', 'https://new.example')).toBe(true)
    expect(a.getAttribute('href')).toBe('https://new.example')
    expect(a.textContent).toBe('new')
    expect(a.hasAttribute('data-kuro-wiki')).toBe(false)
    expect(a.hasAttribute('data-kuro-link')).toBe(false)
  })

  it('keeps inline markup when only the url changes', () => {
    const a = makeA('<a href="https://old.example"><b>bold</b></a>')
    writeLinkParts(a, 'bold', 'https://new.example')
    expect(a.innerHTML).toBe('<b>bold</b>')
  })
})

describe('linkAtCaret', () => {
  let root
  const setup = (html) => {
    root = document.createElement('div')
    root.innerHTML = html
    document.body.appendChild(root)
    return root
  }
  const rangeAt = (node, offset) => {
    const r = document.createRange()
    r.setStart(node, offset)
    r.collapse(true)
    return r
  }

  it('finds the link when the caret is inside it', () => {
    setup('before <a href="/x">link</a> after')
    const a = root.querySelector('a')
    expect(linkAtCaret(rangeAt(a.firstChild, 2), root)).toBe(a)
  })

  it('finds the link when the caret is immediately before it', () => {
    setup('before <a href="/x">link</a> after')
    const a = root.querySelector('a')
    const beforeText = root.firstChild            // "before "
    expect(linkAtCaret(rangeAt(beforeText, beforeText.textContent.length), root)).toBe(a)
  })

  it('finds the link when the caret is immediately after it', () => {
    setup('before <a href="/x">link</a> after')
    const a = root.querySelector('a')
    const afterText = root.lastChild              // " after"
    expect(linkAtCaret(rangeAt(afterText, 0), root)).toBe(a)
  })

  it('returns null when the caret is away from the link', () => {
    setup('before <a href="/x">link</a> after')
    const afterText = root.lastChild
    expect(linkAtCaret(rangeAt(afterText, 3), root)).toBe(null)
  })

  it('excludes card links', () => {
    setup(renderSpecialLinks('[[[my-card]]]'))
    const a = root.querySelector('a')
    expect(linkAtCaret(rangeAt(a.firstChild, 1), root)).toBe(null)
  })

  it('returns null for a non-collapsed range', () => {
    setup('<a href="/x">link</a>')
    const a = root.querySelector('a')
    const r = document.createRange()
    r.setStart(a.firstChild, 0)
    r.setEnd(a.firstChild, 2)
    expect(linkAtCaret(r, root)).toBe(null)
  })
})


// ─── normalizePastedLinks ─────────────────────────────────────────────────────

describe('normalizePastedLinks', () => {
  const container = (html) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div
  }

  it('converts a plain external link to the wiki form', () => {
    const div = container('<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer" class="ext" style="color:red">Read the docs</a>')
    normalizePastedLinks(div)
    const a = div.querySelector('a')
    expect(decodeURIComponent(a.getAttribute('data-kuro-wiki'))).toBe('[[https://example.com/docs|Read the docs]]')
    // paste-noise attributes are stripped
    expect(a.hasAttribute('class')).toBe(false)
    expect(a.hasAttribute('style')).toBe(false)
    expect(a.hasAttribute('target')).toBe(false)
    expect(a.hasAttribute('rel')).toBe(false)
    // and the save path stores the token
    expect(unrenderSpecialLinks(div.innerHTML)).toBe('[[https://example.com/docs|Read the docs]]')
  })

  it('uses the hyper form when text equals the url', () => {
    const div = container('<a href="https://example.com/">https://example.com/</a>')
    normalizePastedLinks(div)
    expect(unrenderSpecialLinks(div.innerHTML)).toBe('[[https://example.com/]]')
  })

  it('keeps non-http links plain', () => {
    const html = '<a href="mailto:a@b.c">mail</a><a href="#sec">jump</a><a href="/local">rel</a>'
    const div = container(html)
    normalizePastedLinks(div)
    expect(div.innerHTML).toBe(html)
  })

  it('keeps links with element children plain', () => {
    const html = '<a href="https://example.com"><strong>bold</strong> link</a>'
    const div = container(html)
    normalizePastedLinks(div)
    expect(div.innerHTML).toBe(html)
  })

  it('keeps empty links plain', () => {
    const html = '<a href="https://example.com"></a>'
    const div = container(html)
    normalizePastedLinks(div)
    expect(div.innerHTML).toBe(html)
  })

  it('keeps notation-breaking urls/labels plain', () => {
    const html = '<a href="https://example.com/a|b">pipe</a><a href="https://example.com/">brack]et</a>'
    const div = container(html)
    normalizePastedLinks(div)
    expect(div.innerHTML).toBe(html)
  })

  it('does not touch existing kuro links', () => {
    const div = container(renderSpecialLinks('[[https://example.com|already]]'))
    const before = div.innerHTML
    normalizePastedLinks(div)
    expect(div.innerHTML).toBe(before)
  })

  it('resolves the href through the provided resolver', () => {
    const div = container('<a href="https://example.com">x</a>')
    normalizePastedLinks(div, (slug) => slug + '?resolved')
    expect(div.querySelector('a').getAttribute('href')).toBe('https://example.com?resolved')
  })
})
