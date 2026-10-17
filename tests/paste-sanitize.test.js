/**
 * 貼り付けの掃除は【許可リスト】で行う。
 *
 * 外部の HTML が持ち込む装飾は無数にある（letter-spacing / word-spacing /
 * text-indent / white-space / box-shadow / transform …）。KuroEditor の UI には
 * それらを直す手段が無いので、一度入ると【HTML タブでしか消せない】＝書き手には
 * 手の出しようがない。「このエディタが自分で書けるものだけ残す」なら、残った
 * ものは必ず UI で直せる、という保証になる。
 *
 * ⚠ 禁止リスト方式に戻さないこと（新しい CSS プロパティが出るたびに漏れる）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor() {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, {})
}

describe('貼り付けの掃除（許可リスト）', () => {
  let ed
  beforeEach(() => { document.body.innerHTML = ''; ed = makeEditor() })

  it('形と値は本文の形（API・保存と同じ conform）が決める＝貼り付けだけの決まりは無い', async () => {
    const { normalizeContentHtml } = await import('../src/normalize.js')
    for (const html of [
      '<p style="letter-spacing: 3px; text-align: center; line-height: 1.8">文</p>',
      '<p id="theirs" data-x="1" class="prose" onclick="alert(1)">文</p>',
      '<p><span style="color: #fff; background-color: #000">文</span></p>',
      '<table><tr><td style="border: 1px solid #000">a</td></tr></table>',
    ]) expect(ed._sanitizePastedHTML(html)).toBe(normalizeContentHtml(html))
  })

  it('貼った写しは新しいブロック（data-bid を持ち込まない）', () => {
    expect(ed._sanitizePastedHTML('<p data-bid="b-1">文</p>')).toBe('<p>文</p>')
  })

  it('行の中の文字だけの断片は段落で包まない（貼っただけで行が割れない）', () => {
    expect(ed._sanitizePastedHTML('<span style="font-weight: 700; font-style: italic">強調</span>'))
      .toBe('<strong><em>強調</em></strong>')
    expect(ed._sanitizePastedHTML('<p>段落</p>')).toBe('<p>段落</p>')
  })

  it('StartFragment の印があればその間だけ読む', () => {
    expect(ed._sanitizePastedHTML('<html><head><style>.a{}</style></head><body><!--StartFragment--><p>文</p><!--EndFragment--></body></html>'))
      .toBe('<p>文</p>')
  })

  it('外のリンクは記法になり、描いた形で入る（編集ポップアップで直せる）', () => {
    const out = ed._sanitizePastedHTML('<a href="https://example.com" class="theirs">リンク</a>')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('data-kuro-wiki')
    expect(out).not.toContain('theirs')
  })

  it('Google ドキュメントの <b style="font-weight:normal"> の包みは太字にしない', () => {
    const out = ed._sanitizePastedHTML(
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">' +
      '<p dir="ltr"><span style="font-size:11pt;color:#000">一</span></p>' +
      '<p dir="ltr"><span style="font-size:11pt;font-weight:700">二</span></p></b>')
    expect(out).not.toMatch(/<strong[^>]*>\s*<p/)
    expect(out).toMatch(/<strong>二<\/strong>/)
    expect(out).not.toContain('font-size')   // 11pt が本文の大きさ＝100%
    expect(out.match(/docs-internal-guid-1/g)?.length).toBe(1)   // id は重ならない
  })

  it('本文に置けない要素は中身ごと落とす・危ない href は文字になる（R0）', () => {
    expect(ed._sanitizePastedHTML('<style>body{display:none}</style><p>文</p><script>alert(1)</script>')).toBe('<p>文</p>')
    const out = ed._sanitizePastedHTML('<p><a href="javascript:alert(1)">a</a></p>')
    expect(out).not.toMatch(/javascript/i)
    expect(out).toContain('a')
  })
})

describe('壊れた colspan とコメント（v2.43.1・Google の AI の回答のコピー）', () => {
  it('cellSpan は正の整数でなければ 1', async () => {
    const { cellSpan } = await import('../src/editor.js')
    const td = document.createElement('td')
    for (const [v, want] of [['undefined', 1], ['', 1], ['0', 1], ['-2', 1], ['1.5', 1], ['3', 3]]) {
      td.setAttribute('colspan', v)
      expect(cellSpan(td, 'colspan')).toBe(want)
    }
    expect(cellSpan(null, 'colspan')).toBe(1)
  })

  it('colspan="undefined" の表でも論理グリッドが組める（列幅のドラッグの前提）', async () => {
    const { buildTableGrid } = await import('../src/editor.js')
    const box = document.createElement('div')
    box.innerHTML = '<table><tbody><tr><th colspan="undefined">a</th><th colspan="undefined">b</th></tr><tr><td colspan="undefined">1</td><td colspan="undefined">2</td></tr></tbody></table>'
    const { grid } = buildTableGrid(box.querySelector('table'))
    expect(grid[0].length).toBe(2)
    expect(grid[1].length).toBe(2)
  })

  it('貼り付けはコメントと壊れた span を落とす', async () => {
    const { KuroEditor } = await import('../src/editor.js')
    const el = document.createElement('div'); document.body.appendChild(el)
    const ed = new KuroEditor(el, {})
    const out = ed._sanitizePastedHTML('<table><tbody><tr><td colspan="undefined">a<!--TgQPHd|||[[2,[null]]]--></td><td colspan="2">b</td></tr></tbody></table>')
    expect(out).not.toContain('<!--')
    expect(out).not.toContain('undefined')
    expect(out).toContain('colspan="2"')
  })

  it('[[…]] の描き直しはコメントの中に触れない', async () => {
    const { renderSpecialLinks } = await import('../src/kuro-links.js')
    const html = '<p>x<!--TgQPHd|||[[2,[null,0]]]--></p><p>[[https://example.com|ex]]</p>'
    const out = renderSpecialLinks(html)
    expect(out).toContain('<!--TgQPHd|||[[2,[null,0]]]-->')
    expect(out).toContain('<a ')
  })
})
