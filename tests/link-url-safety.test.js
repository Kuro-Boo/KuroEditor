// [[...]] の URL を属性へ入れる前に確かめる(2026-10-11)。
// 以前は href / src へ素のまま埋めていたので、`"` で属性の外へ出られ、
// メディアの飛び先 `[[img.png|60%|javascript:…]]` もそのまま押せるリンクになった。
import { describe, it, expect } from 'vitest'
import { renderSpecialLinks, isSafeUrl, _attrUrl } from '../src/kuro-links.js'

describe('isSafeUrl', () => {
  it('http / https / 相対 / # / mailto は通す', () => {
    for (const u of ['https://example.com', 'http://a.b/c?d=1&amp;e=2', '/about', 'page', '#top', 'mailto:a@b.c']) {
      expect(isSafeUrl(u), u).toBe(true)
    }
  })
  it('javascript: や data:text は通さない(文字参照・空白で隠しても)', () => {
    for (const u of [
      'javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)',
      '&#106;avascript:alert(1)', '&#x6A;avascript:alert(1)', 'javascript&colon;alert(1)',
      'vbscript:x', 'data:text/html,<script>alert(1)</script>',
    ]) {
      expect(isSafeUrl(u), u).toBe(false)
    }
  })
  it('src は data:image と blob: を通し、mailto: は通さない', () => {
    expect(isSafeUrl('data:image/png;base64,AAAA', 'src')).toBe(true)
    expect(isSafeUrl('blob:https://x/1', 'src')).toBe(true)
    expect(isSafeUrl('mailto:a@b.c', 'src')).toBe(false)
  })
})

describe('renderSpecialLinks は属性の外へ出さない', () => {
  it('URL の " は文字参照になり、属性を閉じられない', () => {
    const html = renderSpecialLinks('[[https://x.example/" onmouseover="alert(1)|ここ]]')
    expect(html).not.toContain('" onmouseover="')
    expect(html).toContain('&quot; onmouseover=&quot;')
  })
  it('メディアの飛び先の javascript: は捨てる(画像は残す)', () => {
    const html = renderSpecialLinks('[[https://x.example/a.png|60%|javascript:alert(1)]]')
    expect(html).toContain('<img src="https://x.example/a.png"')
    expect(html).not.toMatch(/javascript:/i)
  })
  it('URL カード・素のリンクも同じ', () => {
    expect(renderSpecialLinks('[[https://x.example/"><b>|]]')).not.toContain('"><b>')
    expect(renderSpecialLinks('[[https://x.example/"x]]')).toContain('href="https://x.example/&quot;x"')
  })
  it('& は二重にしない(本文はすでに HTML)', () => {
    expect(_attrUrl('https://x/?a=1&amp;b=2')).toBe('https://x/?a=1&amp;b=2')
  })
})
