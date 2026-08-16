/**
 * コピーは【正規形】をクリップボードへ書く。
 *
 * Chrome の既定の直列化は本文を壊す。計算済みスタイルをインラインで焼き込み
 * （font-size: 15px; font-weight: 400 の出所）、選択が見出しの内側から始まると
 * 全体をその見出しで包む（<h1> が記事全体を飲み込む）。2026-08-16 に
 * Entamy 管理画面の規約編集で実際に起きた壊れ方がこれで、ブラウザ側に止める
 * 設定は無い。
 *
 * ⚠ 発生源で止めることに意味がある。貼り付け側の掃除だけだと、他アプリへは
 *   汚れた HTML が出ていく。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html, opts = {}) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html, ...opts })
}

/** 本文全体を覆う Range。 */
function selectAll(ed) {
  const range = document.createRange()
  range.selectNodeContents(ed.wysiwyg)
  return range
}

describe('コピーはクリップボードに正規形を書く', () => {
  let ed
  beforeEach(() => { document.body.innerHTML = '' })

  it('選択範囲を保存と同じ形にする', () => {
    ed = makeEditor('<h2>見出し</h2><p>本文</p>')
    const out = ed._canonicalSelectionHtml(selectAll(ed))
    expect(out).toContain('<h2>見出し</h2>')
    expect(out).toContain('<p>本文</p>')
  })

  it('ブロック ID を持ち出さない（他アプリにも他文書にも内部属性を出さない）', () => {
    ed = makeEditor('<p>本文</p>', { blockIds: true })
    expect(ed.wysiwyg.querySelector('p')?.hasAttribute('data-bid')).toBe(true)
    expect(ed._canonicalSelectionHtml(selectAll(ed))).not.toContain('data-bid')
  })

  it('壊れた形が混ざっていても正規形になって出る', () => {
    // 一度壊れた本文を読み込んで、そこからコピーしても壊れは伝播しない。
    ed = makeEditor('<h1><p style="font-size: 15px; font-weight: 400;">本文</p></h1>')
    const out = ed._canonicalSelectionHtml(selectAll(ed))
    expect(out).not.toMatch(/font-size|font-weight/)
    expect(out).not.toMatch(/<h1>\s*<p/)
    expect(out).toContain('本文')
  })

  it('部分選択でも見出しの入れ子を作らない（Chrome の文脈要素対策）', () => {
    // 選択が見出しの【途中】から始まり次の段落まで届く形。Chrome はこれを
    // <h2> で包んで直列化するが、cloneContents は部分選択された祖先を
    // 兄弟として複製するので、そもそも入れ子が生まれない。
    ed = makeEditor('<h2>見出し</h2><p>本文</p>')
    const h2 = ed.wysiwyg.querySelector('h2')
    const p = ed.wysiwyg.querySelector('p')
    const range = document.createRange()
    range.setStart(h2.firstChild, 1)          // 「見」の後ろから
    range.setEnd(p.firstChild, 2)             // 「本文」の途中まで
    const out = ed._canonicalSelectionHtml(range)
    expect(out).not.toMatch(/<h2>[^<]*<p/)
    expect(out).toContain('出し')
    expect(out).toContain('本文')
  })

  it('copy イベントで text/html と text/plain を差し替える', () => {
    ed = makeEditor('<p>本文</p>')
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(selectAll(ed))

    const written = {}
    let prevented = false
    const e = new Event('copy', { bubbles: true, cancelable: true })
    e.clipboardData = { setData: (type, value) => { written[type] = value } }
    Object.defineProperty(e, 'preventDefault', { value: () => { prevented = true } })
    ed.wysiwyg.dispatchEvent(e)

    expect(prevented).toBe(true)
    expect(written['text/html']).toContain('<p>本文</p>')
    expect(written['text/plain']).toContain('本文')
  })

  it('選択が空なら何もしない（ブラウザ既定に任せる）', () => {
    ed = makeEditor('<p>本文</p>')
    window.getSelection().removeAllRanges()

    let prevented = false
    const e = new Event('copy', { bubbles: true, cancelable: true })
    e.clipboardData = { setData: () => {} }
    Object.defineProperty(e, 'preventDefault', { value: () => { prevented = true } })
    ed.wysiwyg.dispatchEvent(e)

    expect(prevented).toBe(false)
  })

  it('getContent とコピーは同じ直列化を通る（保存とコピーがずれない）', () => {
    ed = makeEditor('<h2>見出し</h2><p>本文</p>')
    const copied = ed._canonicalSelectionHtml(selectAll(ed))
    expect(copied).toBe(ed.getBuildImage())
  })
})
