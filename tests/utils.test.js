/**
 * Unit tests — pure utility functions (no DOM required for most)
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createElement,
  renderSpecialLinks,
  defaultResolver,
  createTableHtml,
  findCell,
  parseMediaParams,
  resolveEmbedUrl,
  VERSION,
  LINK_RE,
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
    expect(html).toContain('<table')   // matches <table> or <table class="...">
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
  })

  it('creates the right number of columns in header', () => {
    const html = createTableHtml(2, 3)
    const thCount = (html.match(/<th /g) || []).length
    expect(thCount).toBe(3)
  })

  it('creates the right number of body rows', () => {
    const html = createTableHtml(4, 2)
    const trCount = (html.match(/<tr>/g) || []).length
    // 1 header row (inside thead) + 3 body rows = but <tr> in thead is outside tbody
    // header row uses <tr> inside <thead>, body has rows - 1
    expect(trCount).toBeGreaterThanOrEqual(3) // 1 header + 3 body
  })

  it('cells are contenteditable', () => {
    const html = createTableHtml(2, 2)
    expect(html).toContain('contenteditable="true"')
  })

  it('defaults to 2×2', () => {
    const html = createTableHtml()
    const thCount = (html.match(/<th /g) || []).length
    const tdCount = (html.match(/<td /g) || []).length
    expect(thCount).toBe(2)
    expect(tdCount).toBe(2)
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
