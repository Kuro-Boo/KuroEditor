/** Regressions for block paste, list-type conversion, and single-item unlisting. */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

function caret(node, offset = 0) {
  const text = node.nodeType === Node.TEXT_NODE ? node : node.firstChild
  const range = document.createRange()
  range.setStart(text, offset)
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

describe('リスト編集の回帰', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('リスト末尾への見出し＋リストの貼り付けを、入れ子や余分な段落にしない', () => {
    const ed = makeEditor('<h3>3. 前の見出し</h3><ul><li>前の項目</li></ul>')
    const li = ed.wysiwyg.querySelector('li')
    caret(li, li.textContent.length)

    ed._pasteSanitizedHTML('<h3>4. コピーした見出し</h3><ul><li>コピーした項目</li></ul>')

    expect([...ed.wysiwyg.children].map((el) => el.tagName)).toEqual(['H3', 'UL', 'H3', 'UL'])
    expect(ed.wysiwyg.querySelector('ul ul')).toBeNull()
    expect(ed.wysiwyg.querySelector(':scope > br')).toBeNull()
    expect(ed.wysiwyg.querySelectorAll(':scope > p')).toHaveLength(0)
  })

  it('箇条書きを番号付きへ変換しても、本文全体を巻き込まずカーソルを保つ', () => {
    const ed = makeEditor('<p>前</p><ul class="kuro-ul-disc"><li>A</li><li>B</li></ul><p>後</p>')
    const text = ed.wysiwyg.querySelector('li').firstChild
    caret(text, 1)

    ed._applyListStyle('kuro-list-decimal')

    expect([...ed.wysiwyg.children].map((el) => el.tagName)).toEqual(['P', 'OL', 'P'])
    expect([...ed.wysiwyg.querySelectorAll('ol > li')].map((li) => li.textContent)).toEqual(['A', 'B'])
    expect(ed.wysiwyg.querySelector('ol').classList.contains('kuro-list-decimal')).toBe(true)
    expect(window.getSelection().anchorNode).toBe(text)
    expect(window.getSelection().anchorOffset).toBe(1)
  })

  it('番号付きリストを箇条書きへ変換しても、項目とカーソルを保つ', () => {
    const ed = makeEditor('<p>前</p><ol class="kuro-list-alpha"><li>A</li><li>B</li></ol><p>後</p>')
    const text = ed.wysiwyg.querySelector('li').firstChild
    caret(text, 0)

    ed._applyULStyle('kuro-ul-disc')

    expect([...ed.wysiwyg.children].map((el) => el.tagName)).toEqual(['P', 'UL', 'P'])
    expect([...ed.wysiwyg.querySelectorAll('ul > li')].map((li) => li.textContent)).toEqual(['A', 'B'])
    expect(window.getSelection().anchorNode).toBe(text)
    expect(window.getSelection().anchorOffset).toBe(0)
  })

  it('番号付きリスト中央の行頭 Backspace は前後を分割し、後半の番号を保つ', () => {
    const ed = makeEditor('<ol start="3"><li>A</li><li>B</li><li>C</li></ol>')
    const middle = ed.wysiwyg.querySelectorAll('li')[1]
    caret(middle, 0)
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })

    ed.wysiwyg.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect([...ed.wysiwyg.children].map((el) => el.tagName)).toEqual(['OL', 'P', 'OL'])
    expect(ed.wysiwyg.children[0].getAttribute('start')).toBe('3')
    expect(ed.wysiwyg.children[1].textContent).toBe('B')
    expect(ed.wysiwyg.children[2].getAttribute('start')).toBe('5')
    expect(ed.wysiwyg.children[2].textContent).toBe('C')
  })
})
