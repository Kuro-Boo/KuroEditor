/**
 * タブバー上段のヘルプボタン（？）。
 *
 * 見張っているのはこの 4 点:
 *   1. 位置は【目次ボタンの左】（同じ列の同じ大きさのアイコンとして並ぶ）
 *   2. クリックで操作ガイドを【別タブ】で開く（本文の編集は起こさない）
 *   3. 閲覧モードでも押せる — 編集アクションではないので disabled にしない
 *      （読んでいる最中こそ操作を確かめたくなる）
 *   4. helpUi:false / helpUrl:null で消せる（ホストが独自マニュアルを持つ場合の逃げ道）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

const helpBtn = (ed) => ed.root.querySelector('.kuro-tabs__help-btn')

describe('ヘルプボタン', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('既定で表示され、目次ボタンのすぐ左に並ぶ', () => {
    const ed = new KuroEditor(makeMount(), {})
    const btn = helpBtn(ed)
    expect(btn).toBeTruthy()
    expect(btn.nextElementSibling).toBe(ed.tabTocBtn)
  })

  it('ホバー説明は「エディッター操作ガイド」', () => {
    const ed = new KuroEditor(makeMount(), {})
    expect(helpBtn(ed).getAttribute('title')).toBe('エディッター操作ガイド')
    // 読み上げ用は「別タブで開く」ことまで伝える
    expect(helpBtn(ed).getAttribute('aria-label')).toContain('別タブ')
  })

  it('クリックでガイドを別タブに開く（本文は変えない）', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>本文</p>' })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    helpBtn(ed).click()
    expect(open).toHaveBeenCalledWith(
      'https://kuro.boo/kuroeditor/guide/', '_blank', 'noopener')
    expect(ed.wysiwyg.textContent).toBe('本文')
    expect(ed.isDirty()).toBe(false)
    open.mockRestore()
  })

  it('helpUrl を差し替えるとそちらを開く', () => {
    const ed = new KuroEditor(makeMount(), { helpUrl: 'https://example.test/manual' })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    helpBtn(ed).click()
    expect(open).toHaveBeenCalledWith('https://example.test/manual', '_blank', 'noopener')
    open.mockRestore()
  })

  it('閲覧モードでも押せる（編集アクションではない）', () => {
    const ed = new KuroEditor(makeMount(), {})
    ed.setMode('view')
    const btn = helpBtn(ed)
    expect(btn.disabled).toBe(false)
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    btn.click()
    expect(open).toHaveBeenCalled()
    open.mockRestore()
  })

  it('helpUi:false / helpUrl:null で出さない', () => {
    expect(helpBtn(new KuroEditor(makeMount(), { helpUi: false }))).toBeNull()
    expect(helpBtn(new KuroEditor(makeMount(), { helpUrl: null }))).toBeNull()
  })
})
