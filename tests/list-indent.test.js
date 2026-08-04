/**
 * リストごとの字下げ（先頭の項目で Tab を押したとき）。
 *
 * リストの Tab は本来「入れ子の出し入れ」だが、先頭の項目は親になる相手がいない
 * ため入れ子にできない。そこで何も起きないと【押しても無反応＝バグに見える】ので、
 * 入れ子にできないときはリストごと 1 段字下げする（＝先頭行でも他の行と同じように
 * 何度でも押して位置を調整できる）。項目の相対関係は変わらない。
 *
 * 見張っているのはこの 4 点:
 *   1. 入れ子にできる項目では【リストは動かない】（構造の変更が優先）
 *   2. 先頭の項目では押した分だけ累積し、Shift+Tab / 行頭 Backspace で戻る
 *   3. 動かすのは margin-left（padding-left はマーカーの居場所なので触らない）
 *   4. 0 に戻したら style 属性ごと消す（保存 HTML を汚さない）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** キャレットを li の中身の末尾（または先頭）へ */
function caret(ed, li, at = 'end') {
  const t = li.firstChild
  const r = document.createRange()
  r.setStart(t, at === 'start' ? 0 : t.length)
  r.collapse(true)
  const s = window.getSelection()
  s.removeAllRanges(); s.addRange(r)
  ed.wysiwyg.focus()
}

const tab = (ed, shift = false) =>
  ed.wysiwyg.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true,
  }))
const backspace = (ed) =>
  ed.wysiwyg.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Backspace', bubbles: true, cancelable: true,
  }))

const LIST = '<ul class="kuro-ul-check"><li id="a">牛乳</li><li id="b">卵</li></ul>'

describe('リストごとの字下げ', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('先頭の項目の Tab はリストごと動かし、押した分だけ累積する', () => {
    const ed = makeEditor(LIST)
    const ul = ed.wysiwyg.querySelector('ul')
    caret(ed, ed.wysiwyg.querySelector('#a'))
    tab(ed)
    expect(ul.style.marginLeft).toBe('2em')
    tab(ed)
    expect(ul.style.marginLeft).toBe('4em')
    // 構造は一切変わらない（入れ子にはならない）
    expect([...ul.children].filter((n) => n.tagName === 'LI').length).toBe(2)
    expect(ul.querySelector('ul')).toBeNull()
  })

  it('入れ子にできる項目では、リストは動かない（構造の変更が優先）', () => {
    const ed = makeEditor(LIST)
    const ul = ed.wysiwyg.querySelector('ul')
    caret(ed, ed.wysiwyg.querySelector('#b'))
    tab(ed)
    expect(ul.style.marginLeft).toBe('')          // リストは据え置き
    expect(ul.querySelector('li ul li')).toBeTruthy()  // 入れ子になった
  })

  it('Shift+Tab で戻り、0 になったら style ごと消える', () => {
    const ed = makeEditor(LIST)
    const ul = ed.wysiwyg.querySelector('ul')
    caret(ed, ed.wysiwyg.querySelector('#a'))
    tab(ed); tab(ed)
    tab(ed, true)
    expect(ul.style.marginLeft).toBe('2em')
    tab(ed, true)
    expect(ul.hasAttribute('style')).toBe(false)
    tab(ed, true)                                  // 0 からさらに押しても壊れない
    expect(ul.hasAttribute('style')).toBe(false)
  })

  it('先頭の項目の行頭 Backspace でも 1 段戻る', () => {
    const ed = makeEditor(LIST)
    const ul = ed.wysiwyg.querySelector('ul')
    const a = ed.wysiwyg.querySelector('#a')
    caret(ed, a)
    tab(ed); tab(ed)
    caret(ed, a, 'start')
    backspace(ed)
    expect(ul.style.marginLeft).toBe('2em')
  })

  it('2 番目以降の行頭 Backspace は横取りしない（項目の結合を邪魔しない）', () => {
    const ed = makeEditor(LIST)
    const b = ed.wysiwyg.querySelector('#b')
    caret(ed, b, 'start')
    const ev = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })
    ed.wysiwyg.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)   // ブラウザ既定の結合に任せる
  })

  it('動かすのは margin-left（padding-left はマーカーの居場所なので触らない）', () => {
    const ed = makeEditor(LIST)
    const ul = ed.wysiwyg.querySelector('ul')
    caret(ed, ed.wysiwyg.querySelector('#a'))
    tab(ed)
    expect(ul.style.paddingLeft).toBe('')
    expect(ed.getContent()).toContain('margin-left: 2em')
  })
})
