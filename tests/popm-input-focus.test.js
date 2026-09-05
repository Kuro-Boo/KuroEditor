/**
 * **自分の入力欄に焦点があるあいだ、popm を畳まない**（v2.39.3）。
 *
 * ルビの読みや色の欄へ焦点が移ると、本文の選択は browser 側で解かれる。
 * 「選択が無い＝畳む」で判定すると、**打ち始めた瞬間に欄ごと消えて文字も入らない**。
 *
 * KuroNote はタッチ選択で mouseup が出ないため `selectionchange` から
 * `_onSelectionChange()` を直に呼ぶ。だから**アプリでだけ**再現していた。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function selectAll(ed) {
  const p = ed.wysiwyg.querySelector('p')
  const r = document.createRange()
  r.selectNodeContents(p)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(r)
}

describe('popm と入力欄の焦点', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('ルビの欄に焦点があるあいだは畳まない', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>漢字</p>' })
    selectAll(ed)
    ed.popm.el.classList.add('kuro-popm--visible')

    // 読みを打ち始めた状態 = 欄に焦点があり、本文の選択は解けている。
    ed.popm._rubyInput.focus()
    window.getSelection().removeAllRanges()

    ed._onSelectionChange()
    expect(ed.popm.el.classList.contains('kuro-popm--visible')).toBe(true)
  })

  it('焦点が欄の外にあり、選択も無ければ畳む（これまでどおり）', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>漢字</p>' })
    ed.popm.el.classList.add('kuro-popm--visible')
    ed.wysiwyg.focus()
    window.getSelection().removeAllRanges()

    ed._onSelectionChange()
    expect(ed.popm.el.classList.contains('kuro-popm--visible')).toBe(false)
  })

  it('閲覧モードでは、欄に焦点があっても出さない', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>漢字</p>' })
    ed.popm.el.classList.add('kuro-popm--visible')
    ed.setMode('view')
    ed.popm._rubyInput.focus()

    ed._onSelectionChange()
    expect(ed.popm.el.classList.contains('kuro-popm--visible')).toBe(false)
  })
})
