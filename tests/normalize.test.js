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

  it('only a BARE div is treated as a paragraph', () => {
    // A div carrying anything (class/style/data-*) may be a real container.
    // We cannot prove it is a paragraph, so the tag is left alone.
    const styled = '<div style="text-align: center;">c</div>'
    expect(N(styled)).toBe(styled)
  })

  it('never turns a structural container into a paragraph (regression)', () => {
    // These are real shapes from the corpus. Renaming any of them to <p> is
    // destructive: a <p> cannot hold block content, and the editor's callout /
    // code-block handling looks for the container element.
    const callout = '<div class="kuro-callout kuro-callout--tip">tip text</div>'
    expect(N(callout)).toBe(callout)
    const codeWrap = '<div data-language="plain" spellcheck="false">x</div>'
    expect(N(codeWrap)).toBe(codeWrap)
    const tableWrap = '<div class="kuro-table">cells</div>'
    expect(N(tableWrap)).toBe(tableWrap)
  })

  it('does not unwrap a container just because it holds blocks', () => {
    const src = '<div class="kuro-callout"><p>a</p><p>b</p></div>'
    expect(N(src)).toBe(src)
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

describe('ブロックに付いた文字装飾は混入 (R6)', () => {
  // エディタが文字サイズを書くのは <span style="font-size:…"> だけ (_applyFontSize)、
  // 太字は <strong>。ブロックに付いた font-size / font-weight は Chrome のコピーが
  // 焼き込んだ計算済みスタイルだと断定できる。
  it('見出し・段落・セルから font-size / font-weight を落とす', () => {
    expect(N('<p style="font-size: 15px; font-weight: 400;">本文</p>')).toBe('<p>本文</p>')
    expect(N('<h2 style="font-weight: 700">見出し</h2>')).toBe('<h2>見出し</h2>')
    expect(N('<td style="font-size: 13px">セル</td>')).toBe('<td>セル</td>')
    expect(N('<li style="font-size: 13px">項目</li>')).toBe('<li>項目</li>')
  })

  it('span に付いたものは書き手の指定なので残す', () => {
    const src = '<p><span style="font-size: 150%;">大きく</span></p>'
    expect(N(src)).toBe(src)
  })

  it('同じ style の他の指定は一字一句そのまま残す', () => {
    // 値を作り直すと font-family の大文字小文字まで書き換わる。落とすのは
    // 該当の宣言だけで、残りは元の綴りのまま。
    expect(N(`<p style="text-align: center; font-size: 15px; font-family: 'Noto Sans JP';">x</p>`))
      .toBe(`<p style="text-align: center; font-family: 'Noto Sans JP'">x</p>`)
  })

  it('style が空になったら属性ごと消える（div は段落として扱えるようになる）', () => {
    expect(N('<div style="font-size: 15px">本文</div>')).toBe('<p>本文</p>')
  })

  it('冪等', () => {
    const once = N('<p style="font-size: 15px; font-weight: 400;">本文</p>')
    expect(N(once)).toBe(once)
  })
})

describe('ブロックを内包した見出し・段落は解く (R7 / R8)', () => {
  it('見出しが飲み込んだ本文を兄弟に戻す', () => {
    expect(N('<h1>見出し<p>本文</p></h1>')).toBe('<h1>見出し</h1><p>本文</p>')
  })

  it('自分のテキストを持たない包みは消える（Chrome の文脈要素そのもの）', () => {
    // 選択が見出しの内側から始まると、Chrome は記事全体をその見出しで包む。
    expect(N('<h1><p style="font-size: 15px">本文</p><h2>次の見出し</h2></h1>'))
      .toBe('<p>本文</p><h2>次の見出し</h2>')
  })

  it('文字は絶対に落とさない —— ブロックの後ろに続く地の文も残す', () => {
    // タグは捨ててよいが中身の文字は捨てない。見出しの後に来た地の文は
    // 段落として拾う（ブロックが始まった時点で見出しではなくなっている）。
    const out = N('<h1>見出し<p>本文</p>あとがき</h1>')
    expect(out).toBe('<h1>見出し</h1><p>本文</p><p>あとがき</p>')
    expect(out).toContain('あとがき')
  })

  it('ブロックの間の空白は行を占めないので捨てる', () => {
    expect(N('<h1>\n  <p>本文</p>\n</h1>')).toBe('<p>本文</p>')
  })

  it('空行は空行のまま残る', () => {
    expect(N('<h1><p>一</p><p><br></p><p>二</p></h1>'))
      .toBe('<p>一</p><p><br></p><p>二</p>')
  })

  it('data-bid は外側のものを1つだけ残す (R8)', () => {
    // 共同編集のため 1 ブロック 1 bid・重複なしが不変条件。中途半端に残すと
    // _dedupeNestedBids がどちらかを振り直し、他の人が編集中のブロックの id が変わる。
    const out = N('<h1 data-bid="A">見出し<p data-bid="B">本文</p></h1>')
    expect(out).toBe('<h1 data-bid="A">見出し</h1><p>本文</p>')
    expect(out.match(/data-bid/g)).toHaveLength(1)
  })

  it('外側が持っていなければ内側のものを昇格させる', () => {
    expect(N('<h1><p data-bid="B">本文</p><p data-bid="C">続き</p></h1>'))
      .toBe('<p data-bid="B">本文</p><p>続き</p>')
  })

  it('段落がブロックを抱えている場合も同じ', () => {
    expect(N('<p>まえ<ul><li>項目</li></ul></p>')).toBe('<p>まえ</p><ul><li>項目</li></ul>')
  })

  it('li / td は元からブロックを持てるので触らない', () => {
    const src = '<ul><li><p>本文</p></li></ul>'
    expect(N(src)).toBe(src)
  })

  it('冪等', () => {
    const once = N('<h1 data-bid="A">見出し<p data-bid="B">本文</p></h1>')
    expect(N(once)).toBe(once)
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

  it('コピー由来の壊れ方を数える', () => {
    const s = inspectContentHtml('<h1><p style="font-size: 15px; font-weight: 400;">本文</p></h1>')
    expect(s.blockDecor).toBe(1)
    expect(s.nestedBlocks).toBe(1)
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

describe('self-heals containers a previous version renamed to <p> (R5)', () => {
  it('restores a callout that was turned into a paragraph', () => {
    expect(N('<p class="kuro-callout kuro-callout--tip">tip</p>'))
      .toBe('<div class="kuro-callout kuro-callout--tip">tip</div>')
  })

  it('restores a code-block wrapper', () => {
    expect(N('<p data-language="plain" spellcheck="false">x</p>'))
      .toBe('<div data-language="plain" spellcheck="false">x</div>')
  })

  it('leaves an ordinary styled paragraph as a paragraph', () => {
    const src = '<p style="text-align: center;">c</p>'
    expect(N(src)).toBe(src)
    const classed = '<p class="lead">c</p>'
    expect(N(classed)).toBe(classed)
  })

  it('round-trips: damage then repair returns the original container', () => {
    const original = '<div class="kuro-callout kuro-callout--tip">tip</div>'
    const damaged = '<p class="kuro-callout kuro-callout--tip">tip</p>'
    expect(N(damaged)).toBe(original)
    expect(N(N(damaged))).toBe(original)   // idempotent
  })
})
