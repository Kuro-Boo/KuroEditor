/**
 * LinkEditPopup の「カード表示（表題なし）」チェックボックス。
 * ON→[[URL|]] カード化 / OFF→テキストリンクへ、を writeLinkParts 経由で行う。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('LinkEditPopup card toggle', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('テキストリンクを開くとチェックは外れている', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>[[https://example.com|見出し]]</p>' })
    const a = ed.wysiwyg.querySelector('a')
    expect(a.classList.contains('kuro-url-card')).toBe(false)
    ed.linkEditPopup.open(a)
    expect(ed.linkEditPopup._cardToggle.checked).toBe(false)
  })

  it('チェックすると URL カード化し、外すとテキストリンクへ戻る', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>[[https://example.com|見出し]]</p>' })
    const a = ed.wysiwyg.querySelector('a')
    const popup = ed.linkEditPopup
    popup.open(a)

    // ON → カード
    popup._cardToggle.checked = true
    popup._cardToggle.dispatchEvent(new Event('change'))
    expect(a.classList.contains('kuro-url-card')).toBe(true)
    expect(popup._textInput.value).toBe('')
    expect(a.getAttribute('data-kuro-wiki')).toBe(encodeURIComponent('[[https://example.com|]]'))

    // OFF → テキストリンク（既定表示 = URL）
    popup._cardToggle.checked = false
    popup._cardToggle.dispatchEvent(new Event('change'))
    expect(a.classList.contains('kuro-url-card')).toBe(false)
    expect(popup._textInput.value).toBe('https://example.com')
  })

  it('既存のカードリンクを開くとチェックが入る', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>[[https://example.com/blog|]]</p>' })
    const a = ed.wysiwyg.querySelector('a.kuro-url-card')
    expect(a).toBeTruthy()
    ed.linkEditPopup.open(a)
    expect(ed.linkEditPopup._cardToggle.checked).toBe(true)
  })

  it('表示テキストを手入力で空にしてもチェックが追従する', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>[[https://example.com|x]]</p>' })
    const a = ed.wysiwyg.querySelector('a')
    const popup = ed.linkEditPopup
    popup.open(a)
    popup._textInput.value = ''
    popup._textInput.dispatchEvent(new Event('input'))
    expect(popup._cardToggle.checked).toBe(true)
    expect(a.classList.contains('kuro-url-card')).toBe(true)
  })
})
