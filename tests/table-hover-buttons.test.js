/**
 * 表の行・列のボタン（＋ −・つかむ手・罫線）のホバー表示。
 * 表のメニューのボタンで入り切りし、入のときは表から離れて 2 秒で消え、近づけば出る。
 * マウスの無い端末では効かない（ボタンも出さない）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KuroEditor, TableInserter } from '../src/editor.js'

const TABLE = '<table><tbody><tr><td id="c">a</td><td>b</td></tr></tbody></table>'

function stubHover(on) {
  window.matchMedia = (q) => ({
    matches: on && q.includes('hover: hover'), media: q,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  })
}

function makeEditor() {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: TABLE })
}

const move = (x, y) => document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }))

describe('表のボタンのホバー表示', () => {
  let orig
  beforeEach(() => {
    document.body.innerHTML = ''
    orig = window.matchMedia
    try { localStorage.clear() } catch {}
    vi.useFakeTimers()
  })
  afterEach(() => { window.matchMedia = orig; vi.useRealTimers() })

  it('既定は入 — 何も覚えていない端末では、離れて 2 秒で消える', () => {
    stubHover(true)
    const ed = makeEditor()
    const ins = ed.tableInserter
    expect(ins.hoverMode).toBe(true)
    expect(ed.tableManager._hoverBtn.classList.contains('kuro-table-menu__btn--active')).toBe(true)
    ins.activate(ed.wysiwyg.querySelector('table'))
    move(5000, 5000)
    vi.advanceTimersByTime(2100)
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(true)
  })

  it('切 — 表から離れてもボタンは消えない。切も端末に覚える', () => {
    stubHover(true)
    const ed = makeEditor()
    const ins = ed.tableInserter
    ed.tableManager._hoverBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(ins.hoverMode).toBe(false)
    expect(localStorage.getItem('kuro-editor-table-hover-buttons')).toBe('0')
    ins.activate(ed.wysiwyg.querySelector('table'))
    move(5000, 5000)
    vi.advanceTimersByTime(3000)
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(false)
    document.body.innerHTML = ''
    expect(makeEditor().tableInserter.hoverMode).toBe(false)
  })

  it('入 — 離れて 2 秒で消え、近づけば出る。設定は端末に覚える', () => {
    stubHover(true)
    const ed = makeEditor()
    const ins = ed.tableInserter
    const table = ed.wysiwyg.querySelector('table')
    table.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 200, width: 200, height: 100 })
    ed._setTableHoverButtons(true)
    expect(ins.hoverMode).toBe(true)
    expect(ed.tableManager._hoverBtn.classList.contains('kuro-table-menu__btn--active')).toBe(true)
    expect(localStorage.getItem('kuro-editor-table-hover-buttons')).toBe('1')

    ins.activate(table)
    move(150, 150)            // 表の上
    vi.advanceTimersByTime(3000)
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(false)

    move(1000, 1000)          // 離れる
    vi.advanceTimersByTime(1900)
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(false)
    vi.advanceTimersByTime(200)
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(true)

    move(90, 150)             // 表の左の「＋」の帯に戻る
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(false)

    // 次に開いたエディタも入のまま
    document.body.innerHTML = ''
    expect(makeEditor().tableInserter.hoverMode).toBe(true)
  })

  it('並べ替えのドラッグ中は消さない', () => {
    stubHover(true)
    const ed = makeEditor()
    const ins = ed.tableInserter
    ed._setTableHoverButtons(true)
    ins.activate(ed.wysiwyg.querySelector('table'))
    ins._rowDrag = true
    move(5000, 5000)
    vi.advanceTimersByTime(5000)
    expect(ins.container.classList.contains('kuro-table-inserter--asleep')).toBe(false)
  })

  it('マウスの無い端末では、入り切りのボタンを出さず、入でも消さない', () => {
    stubHover(false)
    const ed = makeEditor()
    expect(ed.tableManager._hoverBtn).toBeUndefined()
    expect(TableInserter.canHover()).toBe(false)
    ed.tableInserter.setHoverMode(true)
    ed.tableInserter.activate(ed.wysiwyg.querySelector('table'))
    move(5000, 5000)
    vi.advanceTimersByTime(5000)
    expect(ed.tableInserter.container.classList.contains('kuro-table-inserter--asleep')).toBe(false)
  })
})
