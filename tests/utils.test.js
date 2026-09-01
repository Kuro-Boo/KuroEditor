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
  buildTableGrid,
  parseMediaParams,
  resolveEmbedUrl,
  isMapEmbed,
  VERSION,
  LINK_RE,
  readLinkParts,
  writeLinkParts,
  linkAtCaret,
  normalizePastedLinks,
  nativeSelectionBarClearance,
  popupBottomLimit,
  isImeComposing,
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

// ─── Google マップ ────────────────────────────────────────────────────────────
// 専用記法（[[map:…]]）は作らず、動画と同じ「URL を貼れば埋め込み」に乗せる。
// これでサイズ・寄せの指定とイメージメニューでの大きさ変更がそのまま効く。
describe('resolveEmbedUrl — Google マップ', () => {
  it('公式の埋め込み URL（共有 → 地図を埋め込む）はそのまま使う', () => {
    const u = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3'
    expect(resolveEmbedUrl(u)).toBe(u)
  })

  it('座標つきの地図 URL は座標とズームを引き継ぐ', () => {
    expect(resolveEmbedUrl('https://www.google.com/maps/place/X/@35.6812,139.7671,17z/data=!3m1'))
      .toBe('https://maps.google.com/maps?q=35.6812,139.7671&z=17&output=embed')
  })

  it('q= の地図 URL は検索語を引き継ぐ（google.co.jp などでも）', () => {
    expect(resolveEmbedUrl('https://maps.google.co.jp/maps?q=%E6%9D%B1%E4%BA%AC%E9%A7%85'))
      .toBe('https://maps.google.com/maps?q=%E6%9D%B1%E4%BA%AC%E9%A7%85&output=embed')
  })

  it('/maps/place/名前 の "+" は空白として扱う（検索語を変えない）', () => {
    expect(resolveEmbedUrl('https://www.google.com/maps/place/Tokyo+Tower/'))
      .toBe('https://maps.google.com/maps?q=Tokyo%20Tower&output=embed')
  })

  it('短縮 URL は埋め込みにしない（展開できない＝リンクのまま）', () => {
    expect(resolveEmbedUrl('https://maps.app.goo.gl/abc123')).toBeNull()
    expect(resolveEmbedUrl('https://goo.gl/maps/abc123')).toBeNull()
  })

  it('isMapEmbed は地図の埋め込みだけを true にする（動画と見分ける）', () => {
    expect(isMapEmbed(resolveEmbedUrl('https://maps.google.co.jp/maps?q=x'))).toBe(true)
    expect(isMapEmbed(resolveEmbedUrl('https://www.google.com/maps/embed?pb=!1m18'))).toBe(true)
    expect(isMapEmbed(resolveEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))).toBe(false)
    expect(isMapEmbed(null)).toBe(false)
  })

  it('Google でも地図以外は埋め込みにしない', () => {
    expect(resolveEmbedUrl('https://www.google.com/search?q=foo')).toBeNull()
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

// ─── buildTableGrid ───────────────────────────────────────────────────────────

describe('buildTableGrid', () => {
  const makeTable = (html) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.querySelector('table')
  }

  it('plain grid: cellIndex matches logical column for every row', () => {
    const table = makeTable(
      '<table><tbody>' +
        '<tr><td>A</td><td>B</td><td>C</td></tr>' +
        '<tr><td>D</td><td>E</td><td>F</td></tr>' +
      '</tbody></table>'
    )
    const { grid, pos } = buildTableGrid(table)
    expect(grid[0].map(c => c.textContent)).toEqual(['A', 'B', 'C'])
    expect(grid[1].map(c => c.textContent)).toEqual(['D', 'E', 'F'])
    const e = table.querySelectorAll('td')[4]
    expect(pos.get(e)).toEqual({ row: 1, col: 1 })
  })

  it('a rowspan cell shifts every later column of the covered rows out of DOM order', () => {
    // This is exactly the shape from the reported bug: col 2 (開発元) spans
    // rows 0-1, so row 1's own <td> list is missing that slot — cellIndex 2
    // in row 1 is physically "タイプ", not "開発元".
    const table = makeTable(
      '<table><tbody>' +
        '<tr><td>1</td><td>Model A</td><td rowspan="2">Anthropic</td><td>クローズド</td><td>80%</td></tr>' +
        '<tr><td>2</td><td>Model B</td><td>クローズド</td><td>77%</td></tr>' +
      '</tbody></table>'
    )
    const { grid, pos } = buildTableGrid(table)
    // Logical grid: row 1 col 2 is STILL "Anthropic" (covered by the rowspan),
    // even though no physical <td> sits there in row 1's own DOM.
    expect(grid[1].map(c => c.textContent)).toEqual(['2', 'Model B', 'Anthropic', 'クローズド', '77%'])
    // The physically-second <td> in row 1 ("クローズド") is logical col 3, NOT
    // col 2 — this is precisely what row.cells[cellIndex]-based code got wrong.
    const row1ClosedCell = table.querySelectorAll('tr')[1].cells[2]
    expect(row1ClosedCell.textContent).toBe('クローズド')
    expect(pos.get(row1ClosedCell)).toEqual({ row: 1, col: 3 })
  })

  it('colspan and rowspan both fill every covered grid slot with the same cell', () => {
    const table = makeTable(
      '<table><tbody>' +
        '<tr><td rowspan="2" colspan="2">X</td><td>C</td></tr>' +
        '<tr><td>F</td></tr>' +
      '</tbody></table>'
    )
    const { grid } = buildTableGrid(table)
    const x = table.querySelector('td')
    expect(grid[0][0]).toBe(x)
    expect(grid[0][1]).toBe(x)
    expect(grid[1][0]).toBe(x)
    expect(grid[1][1]).toBe(x)
    expect(grid[0][2].textContent).toBe('C')
    expect(grid[1][2].textContent).toBe('F')
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

  // v2.11.0〜: 判定は「リンクの左端 / 右端」だけ。ただし “端” は【見た目の位置】で
  // あって DOM 上の隣接ではない。ブラウザはリンクのすぐ右をクリックすると、
  // キャレットを <a> の外ではなく【内側テキストの末尾】に置くため
  // (v2.11.2 でこの取りこぼしを修正)。
  it('returns null when the caret is in the MIDDLE of the link', () => {
    setup('before <a href="/x">link</a> after')
    const a = root.querySelector('a')
    expect(linkAtCaret(rangeAt(a.firstChild, 2), root)).toBe(null)
  })

  it('finds the link at the start / end INSIDE the link text (視覚的な左右の端)', () => {
    setup('before <a href="/x">link</a> after')
    const a = root.querySelector('a')
    expect(linkAtCaret(rangeAt(a.firstChild, 0), root)).toBe(a)   // 見た目は左端
    expect(linkAtCaret(rangeAt(a.firstChild, 4), root)).toBe(a)   // 見た目は右端
  })

  // リンクが 2 つ隣接している場合は【キャレットの前のリンク】を対象にする
  describe('隣接する 2 つのリンクの間にキャレット', () => {
    const two = () => {
      setup('<a href="/a">AAA</a><a href="/b">BBB</a>')
      const [a, bb] = root.querySelectorAll('a')
      return { a, bb }
    }

    it('要素境界（<a>A</a>|<a>B</a>）→ 前のリンク', () => {
      const { a } = two()
      expect(linkAtCaret(rangeAt(root, 1), root)).toBe(a)
    })

    it('前のリンクの内側末尾 → 前のリンク', () => {
      const { a } = two()
      expect(linkAtCaret(rangeAt(a.firstChild, 3), root)).toBe(a)
    })

    it('後ろのリンクの内側先頭（ブラウザはここに置くことがある）→ 前のリンク', () => {
      const { a, bb } = two()
      expect(linkAtCaret(rangeAt(bb.firstChild, 0), root)).toBe(a)
    })

    it('後ろのリンクの内側末尾 → 後ろのリンク', () => {
      const { bb } = two()
      expect(linkAtCaret(rangeAt(bb.firstChild, 3), root)).toBe(bb)
    })

    it('間に文字があるなら（<a>A</a> |<a>B</a>）後ろのリンクのまま', () => {
      setup('<a href="/a">AAA</a> <a href="/b">BBB</a>')
      const [, bb] = root.querySelectorAll('a')
      expect(linkAtCaret(rangeAt(bb.firstChild, 0), root)).toBe(bb)
    })

    it('前が編集対象外リンク（カード型）なら、後ろのリンクを返す', () => {
      setup(renderSpecialLinks('[[[my-card]]]') + '<a href="/b">BBB</a>')
      const bb = root.querySelector('a:not(.kuro-card-link)')
      expect(linkAtCaret(rangeAt(bb.firstChild, 0), root)).toBe(bb)
    })
  })

  it('端の判定は入れ子の装飾タグ越しでも効く', () => {
    setup('before <a href="/x"><b>bold</b> tail</a> after')
    const a = root.querySelector('a')
    const b = root.querySelector('b')
    const tail = a.lastChild                        // " tail"
    expect(linkAtCaret(rangeAt(b.firstChild, 0), root)).toBe(a)                       // 先頭
    expect(linkAtCaret(rangeAt(tail, tail.textContent.length), root)).toBe(a)         // 末尾
    expect(linkAtCaret(rangeAt(b.firstChild, 2), root)).toBe(null)                    // 途中
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

  it('excludes card links (even when the caret is adjacent)', () => {
    setup(renderSpecialLinks('[[[my-card]]]') + ' after')
    const a = root.querySelector('a')
    // 直後に立っても対象外（編集ポップアップは開かない）
    expect(linkAtCaret(rangeAt(root, [...root.childNodes].indexOf(a) + 1), root)).toBe(null)
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

// ─── nativeSelectionBarClearance ──────────────────────────────────────────────

describe('nativeSelectionBarClearance', () => {
  it('Android では OS 選択ツールバーの帯(64px)を返す', () => {
    expect(
      nativeSelectionBarClearance(
        'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36',
      ),
    ).toBe(64)
  })

  // iOS 16 で編集メニューが吹き出し型になり、**選択の上**に出るのが既定に
  // なった。0 のままだと装飾ポップアップと正面から重なる(2026-09-02 実機)。
  it('iOS でも帯を返す(編集メニューは選択の上に出る)', () => {
    expect(
      nativeSelectionBarClearance(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe(58)
  })

  it('マウスのデスクトップでは 0(OS のメニューが出ない)', () => {
    expect(
      nativeSelectionBarClearance(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      ),
    ).toBe(0)
  })

  // iPadOS 13+ の Safari は Macintosh を名乗る。UA だけ見ると「デスクトップ」に
  // 化けて、iPad でだけポップアップが重なる。触れる画面かどうかで見分ける。
  it('Macintosh を名乗る iPad は、触れる画面として扱う', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
    try {
      expect(
        nativeSelectionBarClearance(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        ),
      ).toBe(58)
    } finally {
      if (original) Object.defineProperty(navigator, 'maxTouchPoints', original)
      else delete navigator.maxTouchPoints
    }
  })
})

// ─── popupBottomLimit ─────────────────────────────────────────────────────────

describe('popupBottomLimit', () => {
  /** rect を返す mmenu 風の要素を作って body に載せる */
  function mmenu(top, height = 48) {
    const el = document.createElement('div')
    el.className = 'kuro-mmenu'
    el.getBoundingClientRect = () => ({
      top, bottom: top + height, height, left: 0, right: 100, width: 100,
    })
    document.body.appendChild(el)
    return el
  }

  it('returns viewport bottom when mmenu is missing', () => {
    expect(popupBottomLimit(null)).toBe(window.innerHeight - 4)
    expect(popupBottomLimit(undefined, 10)).toBe(window.innerHeight - 10)
  })

  it('returns viewport bottom when mmenu is not in the DOM (modalMenu: false)', () => {
    const el = mmenu(0, 0)
    el.remove()
    expect(popupBottomLimit(el)).toBe(window.innerHeight - 4)
  })

  it('ignores a slotted mmenu placed high up (top toolbar)', () => {
    // A top-slotted toolbar sits in the upper half → not a bottom obstacle.
    const el = mmenu(20)
    el.classList.add('kuro-mmenu--slotted')
    expect(popupBottomLimit(el)).toBe(window.innerHeight - 4)
    el.remove()
  })

  it('dodges a slotted mmenu anchored to the viewport bottom (regression)', () => {
    // KuroCMS slots the toolbar into a fixed .articleBottomBar at the bottom of
    // the viewport. The popup used to clamp to the raw viewport bottom and slide
    // under it. A slotted bar whose centre is in the lower half is a real
    // obstacle and must clamp to its top.
    const top = window.innerHeight - 60
    const el = mmenu(top)
    el.classList.add('kuro-mmenu--slotted')
    expect(popupBottomLimit(el)).toBe(top - 6)
    el.remove()
  })

  it('stops above a visible fixed mmenu (top - 6)', () => {
    const top = window.innerHeight - 60
    const el = mmenu(top)
    expect(popupBottomLimit(el)).toBe(top - 6)
    el.remove()
  })

  it('never exceeds the viewport bottom even if mmenu sits lower', () => {
    const el = mmenu(window.innerHeight + 100)
    expect(popupBottomLimit(el)).toBe(window.innerHeight - 4)
    el.remove()
  })
})

// ─── isImeComposing ───────────────────────────────────────────────────────────

describe('isImeComposing', () => {
  it('true while the IME is composing (isComposing)', () => {
    expect(isImeComposing({ key: 'Enter', isComposing: true })).toBe(true)
  })

  it('true for the legacy keyCode 229 (old Safari / Android IME)', () => {
    expect(isImeComposing({ key: 'Enter', keyCode: 229 })).toBe(true)
  })

  it('false for a plain key press', () => {
    expect(isImeComposing({ key: 'Enter', isComposing: false, keyCode: 13 })).toBe(false)
    expect(isImeComposing({ key: 'Escape' })).toBe(false)
  })

  it('false for null / undefined events', () => {
    expect(isImeComposing(null)).toBe(false)
    expect(isImeComposing(undefined)).toBe(false)
  })
})
