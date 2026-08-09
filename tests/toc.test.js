/**
 * 目次パネル（TableOfContents）。
 *
 * 見張っているのはこの 4 点:
 *   1. 【本文に id を書き込まない】— 目次は本文を映すビューであって本文の内容
 *      ではない。かつて振っていた `id="kuro-h-<連番>"` は getContent() に乗って
 *      保存 HTML・公開ページまで流れ、連番なので見出しを 1 つ足すだけで全部
 *      ずれた（共有できるアンカーにならず、data-bid の無いブロックでは
 *      mergeBlocks の鍵にも揺れが混ざる）。公開用の安定 id は publish 時の
 *      ホストの仕事（KuroCMS の src/headings.ts）。
 *   2. 飛び先は要素参照（クリックでその見出しへ scrollIntoView）
 *   3. 見出しテキストはエスケープする（'<' を含む見出しで目次が壊れない）
 *   4. 折りたたみは並び順で覚える（旧実装の連番 id と同じ粒度）
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuroEditor as RealKuroEditor } from '../src/editor.js'

const _created = []
class KuroEditor extends RealKuroEditor {
  constructor(...args) {
    super(...args)
    _created.push(this)
  }
}

function makeEditor(initialContent) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const ed = new KuroEditor(mount, { initialContent })
  // 目次の更新は debounce(250ms) 越し。テストでは同期に取り回す
  ed.toc._doUpdate()
  return ed
}

const rows = (ed) => Array.from(ed.tocPanelEl.querySelectorAll('.kuro-toc__row'))
const items = (ed) => Array.from(ed.tocPanelEl.querySelectorAll('.kuro-toc__item'))

describe('目次パネル', () => {
  beforeEach(() => { document.body.innerHTML = '' })
  afterEach(() => {
    while (_created.length) {
      try { _created.pop().destroy() } catch { /* 破棄済み */ }
    }
  })

  it('本文の見出しに id を書き込まない', () => {
    const ed = makeEditor('<h2>第一章</h2><p>x</p><h3>節</h3>')
    const headings = ed.wysiwyg.querySelectorAll('h2,h3')
    expect(headings.length).toBe(2)
    for (const h of headings) expect(h.getAttribute('id')).toBe(null)
    expect(ed.getContent()).not.toContain('kuro-h-')
  })

  it('著者が付けた id は消さない（触らない）', () => {
    const ed = makeEditor('<h2 id="mine">第一章</h2><h2>第二章</h2>')
    expect(ed.wysiwyg.querySelector('h2').id).toBe('mine')
  })

  it('見出しの数だけ行を作る', () => {
    const ed = makeEditor('<h1>A</h1><h2>B</h2><h3>C</h3>')
    expect(items(ed).map((el) => el.textContent)).toEqual(['A', 'B', 'C'])
  })

  it('行のクリックでその見出しへスクロールする（id を引かない）', () => {
    const ed = makeEditor('<h2>A</h2><h2>B</h2>')
    const second = ed.wysiwyg.querySelectorAll('h2')[1]
    let scrolled = null
    second.scrollIntoView = () => { scrolled = second }
    items(ed)[1].click()
    expect(scrolled).toBe(second)
  })

  it('見出しテキストはエスケープする', () => {
    const ed = makeEditor('<h2>a &lt;b&gt; c</h2><h2>x</h2>')
    const first = items(ed)[0]
    expect(first.textContent).toBe('a <b> c')
    expect(first.querySelector('b')).toBe(null)
  })

  it('折りたたみは並び順で覚える（子の行が隠れる）', () => {
    const ed = makeEditor('<h2>親</h2><h3>子</h3><h2>次</h2>')
    const toggle = ed.tocPanelEl.querySelector('.kuro-toc__toggle')
    expect(toggle).toBeTruthy()
    toggle.click()
    const hidden = rows(ed).map((r) => r.classList.contains('kuro-toc__row--hidden'))
    expect(hidden).toEqual([false, true, false])
  })

  it('見出しが無ければパネルを畳む', () => {
    const ed = makeEditor('<p>本文だけ</p>')
    expect(ed.tocPanelEl.classList.contains('kuro-toc--hidden')).toBe(true)
  })
})
