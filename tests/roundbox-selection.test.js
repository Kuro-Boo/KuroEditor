/**
 * 角丸ボックスは、**選んでいた文字を中へ入れる**（v2.39.3）。
 *
 * `insertHTML` は選択範囲を置き換えるので、選んだまま押すと**本文が消えていた**。
 * 囲みたくて選んでいるのだから、消すのは常に間違いである。
 *
 * `document.execCommand` は happy-dom に無く、setup.js が spy に差し替えている。
 * だから確かめるのは**何を渡したか** —— 既存の editor.test.js と同じやり方。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

/** 直近の insertHTML に渡された HTML。 */
function lastInsertedHtml() {
  const calls = document.execCommand.mock.calls.filter((c) => c[0] === 'insertHTML')
  return calls.length ? calls[calls.length - 1][2] : null
}

/** 本文の1段落を丸ごと選ぶ。 */
function selectParagraph(ed, index = 0) {
  const p = ed.wysiwyg.querySelectorAll('p')[index]
  const r = document.createRange()
  r.selectNodeContents(p)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(r)
  return p
}

describe('角丸ボックスと選択', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('選んだ文字を、箱の中に入れて渡す', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>だいじな文</p>' })
    selectParagraph(ed)
    ed._insertRoundbox()

    const html = lastInsertedHtml()
    expect(html).toContain('kuro-roundbox')
    // **消さない。** 箱の中に入っていること。
    expect(html).toContain('だいじな文')
    expect(html.indexOf('だいじな文')).toBeGreaterThan(html.indexOf('kuro-roundbox'))
    expect(html).not.toContain('<p><br></p></div>')
  })

  it('装飾は保つ（見た目を落とさない）', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>ここに<b>太字</b>あり</p>' })
    selectParagraph(ed)
    ed._insertRoundbox()
    expect(lastInsertedHtml()).toContain('<b>太字</b>')
  })

  it('行になっていない選択は、段落で包んでから入れる', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>あいうえお</p>' })
    const text = ed.wysiwyg.querySelector('p').firstChild
    const r = document.createRange()
    r.setStart(text, 1)
    r.setEnd(text, 3)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(r)
    ed._insertRoundbox()
    // 生のインラインを直に入れると、箱の中に「行」が無く、後から改行できない。
    expect(lastInsertedHtml()).toContain('<p>いう</p>')
  })

  it('選んでいなければ、これまでどおり空の箱', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>そのまま</p>' })
    const sel = window.getSelection()
    sel.removeAllRanges()
    ed._insertRoundbox()
    expect(lastInsertedHtml()).toContain('<p><br></p></div>')
  })

  it('ブロック id は写さない（同じ id が2つできない）', () => {
    const ed = new KuroEditor(mount(), {
      initialContent: '<p>id つき</p>', blockIds: true,
    })
    expect(ed.wysiwyg.querySelector('p')?.getAttribute('data-bid')).toBeTruthy()
    selectParagraph(ed)
    ed._insertRoundbox()
    expect(lastInsertedHtml()).not.toContain('data-bid')
  })
})
