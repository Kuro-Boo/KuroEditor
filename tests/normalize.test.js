/**
 * Shared content normalization (editor paste / host API / maintenance cleaner).
 * The rules were derived from measured damage in the live corpus — see
 * src/normalize.js for the counts.
 */
import { describe, it, expect } from 'vitest'
import { normalizeContentHtml, inspectContentHtml } from '../src/normalize.js'

const N = normalizeContentHtml

describe('bold is spelled one way (<strong>)', () => {
  it('rewrites <b> to <strong>', () => {
    expect(N('<p>a <b>bold</b> c</p>')).toBe('<p>a <strong>bold</strong> c</p>')
  })

  it('rewrites a span whose only style is a bold font-weight', () => {
    expect(N('<p><span style="font-weight: 700;">x</span></p>'))
      .toBe('<p><strong>x</strong></p>')
    expect(N('<p><span style="font-weight:bold">x</span></p>'))
      .toBe('<p><strong>x</strong></p>')
    expect(N('<p><span style="font-weight: bolder;">x</span></p>'))
      .toBe('<p><strong>x</strong></p>')
  })

  it('leaves a span that also carries other styling', () => {
    // collapsing this to <strong> would silently drop the size
    const src = '<p><span style="font-weight: 700; font-size: 1.25rem;">x</span></p>'
    expect(N(src)).toBe(src)
  })

  it('leaves a non-bold font-weight alone', () => {
    const src = '<p><span style="font-weight: 400;">x</span></p>'
    expect(N(src)).toBe(src)
  })

  it('keeps <strong> untouched (idempotent on already-clean content)', () => {
    const src = '<p>a <strong>b</strong> c</p>'
    expect(N(src)).toBe(src)
  })
})

describe('paragraphs are <p>', () => {
  it('renames a div paragraph to p, keeping attributes', () => {
    expect(N('<div data-bid="x-1">text</div>')).toBe('<p data-bid="x-1">text</p>')
  })

  it('keeps styling on a renamed div (alignment must survive)', () => {
    expect(N('<div style="text-align: center;">c</div>'))
      .toBe('<p style="text-align: center;">c</p>')
  })

  it('unwraps a bare div that only wraps blocks', () => {
    expect(N('<div data-bid="w"><p>a</p><p>b</p></div>'))
      .toBe('<p>a</p><p>b</p>')
  })

  it('does NOT unwrap a block wrapper that carries styling', () => {
    const src = '<div style="text-align: center;"><p>a</p></div>'
    expect(N(src)).toBe(src)
  })

  it('leaves <p> alone', () => {
    expect(N('<p>a</p>')).toBe('<p>a</p>')
  })
})

describe('empty blocks', () => {
  it('top-level empty div becomes an empty paragraph', () => {
    expect(N('<div><br></div>')).toBe('<p><br></p>')
  })

  it('nested empty div degrades to a line break', () => {
    expect(N('<div data-bid="w"><p>a</p><div><br></div></div>'))
      .toBe('<p>a</p><br>')
  })

  it('an empty <p> stays a single <br> paragraph', () => {
    expect(N('<p><br></p>')).toBe('<p><br></p>')
  })

  it('a COLLAPSED blank block never gains a <br> (it must stay zero-height)', () => {
    // <p>\n</p> renders as nothing; <p><br></p> renders as one blank line.
    // Rewriting the first into the second would insert visible blank lines.
    expect(N('<p>\n</p>')).toBe('<p>\n</p>')
    expect(N('<p>   </p>')).toBe('<p>   </p>')
    expect(N('<div>  </div>')).toBe('<p>  </p>')
  })

  it('a nested collapsed block is dropped, a nested <br> block keeps its line', () => {
    expect(N('<div data-bid="w"><p>a</p><div> </div></div>')).toBe('<p>a</p>')
    expect(N('<div data-bid="w"><p>a</p><div><br></div></div>')).toBe('<p>a</p><br>')
  })

  it('collapses multiple <br> in a blank block to one', () => {
    expect(N('<div><br><br></div>')).toBe('<p><br></p>')
  })

  it('&nbsp; is content, not emptiness', () => {
    expect(N('<p>&nbsp;</p>')).toBe('<p>&nbsp;</p>')
  })
})

describe('safety', () => {
  it('never touches code / pre subtrees', () => {
    const src = '<pre class="kuro-code"><code>if (a &lt; b) { x = "<b>y</b>" }</code></pre>'
    expect(N(src)).toBe(src)
  })

  it('returns malformed HTML unchanged', () => {
    const src = '<p>unclosed'
    expect(N(src)).toBe(src)
    expect(N('</p>')).toBe('</p>')
  })

  it('preserves entities and attributes byte-for-byte when nothing matches', () => {
    const src = '<p class="x" data-bid="k">a &amp; b &lt;c&gt; &quot;d&quot;</p>'
    expect(N(src)).toBe(src)
  })

  it('preserves media / link tokens and void tags', () => {
    const src = '<p>[[img-1]]</p><figure class="kuro-media-wrap"><img src="a.png"></figure><hr class="kuro-hr">'
    expect(N(src)).toBe(src)
  })

  it('is idempotent', () => {
    const src = '<div><b>a</b></div><div><br></div><div data-bid="w"><p>x</p></div>'
    const once = N(src)
    expect(N(once)).toBe(once)
  })

  it('handles empty / non-string input', () => {
    expect(N('')).toBe('')
    expect(N(null)).toBe('')
    expect(N(undefined)).toBe('')
  })
})

describe('inspectContentHtml', () => {
  it('counts what would change without changing it', () => {
    const src = '<div>a</div><p><b>x</b></p><div><br></div>'
    const s = inspectContentHtml(src)
    expect(s.bTags).toBe(1)
    expect(s.divBlocks).toBe(1)
    expect(s.changed).toBe(true)
  })

  it('reports no change for already-canonical content', () => {
    const s = inspectContentHtml('<p>a <strong>b</strong></p><p><br></p>')
    expect(s.changed).toBe(false)
  })
})

describe('mismatched nesting is refused, not guessed at (regression)', () => {
  it('leaves a body containing an unescaped "<A word …>" untouched', () => {
    // Seen live: an article whose text contained a literal "<A função …>".
    // It parses as an <a> that is never closed, so a lenient unwind would let
    // the following </b> close it too and emit a </a> that was never written.
    const src = '<div><b><A função de uso final não é um bônus></b></div>'
    expect(N(src)).toBe(src)
  })

  it('refuses interleaved tags rather than re-ordering them', () => {
    const src = '<p><b><i>x</b></i></p>'
    expect(N(src)).toBe(src)
  })

  it('still normalizes a document with correctly nested inline tags', () => {
    expect(N('<div><b><i>x</i></b></div>')).toBe('<p><strong><i>x</i></strong></p>')
  })
})
