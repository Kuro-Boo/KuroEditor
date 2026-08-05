/**
 * 表の操作をスマホでも成立させるための 2 点。
 *
 *   1. ボタンを画面内に丸める — 編集領域が画面いっぱいになる端末では、表の右端＝
 *      画面の右端。「表の外」に置くと画面外に出て【押せない】ので、外に出せない分は
 *      内側（罫線の上）へ寄せる。押せないボタンは無いのと同じ。
 *   2. 行のスワイプ削除 — 18px の丸を指で正確に狙うのは辛いので、左へ振って消せる
 *      近道を足す。⚠ 基本は「−」ボタンのままで、これは追加の道。
 *
 * ⚠ 並べ替えハンドルが指で動かない件（mousedown → pointerdown へ）と、位置の
 *   丸め結果そのものは実ブラウザで確認すること（happy-dom は矩形を返さない）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** happy-dom には PointerEvent が無いので、必要な値だけ持つイベントを作る */
function pointer(type, { x = 0, y = 0, pointerType = 'touch', id = 1 } = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { clientX: x, clientY: y, pointerType, pointerId: id })
  return e
}

/** 指で左へ振る（dx px）。dy を渡せば縦に振る */
function swipe(el, { dx = -200, dy = 0, pointerType = 'touch' } = {}) {
  el.dispatchEvent(pointer('pointerdown', { x: 300, y: 100, pointerType }))
  el.dispatchEvent(pointer('pointermove', { x: 300 + dx / 2, y: 100 + dy / 2, pointerType }))
  el.dispatchEvent(pointer('pointermove', { x: 300 + dx, y: 100 + dy, pointerType }))
  el.dispatchEvent(pointer('pointerup', { x: 300 + dx, y: 100 + dy, pointerType }))
}

const TABLE =
  '<table><tbody>' +
  '<tr><td id="a1">A1</td><td>B1</td></tr>' +
  '<tr><td id="a2">A2</td><td>B2</td></tr>' +
  '<tr><td id="a3">A3</td><td>B3</td></tr>' +
  '</tbody></table>'

/** 行の幅を測れるようにする（happy-dom は矩形を返さない） */
function measurable(ed, width = 340) {
  for (const tr of ed.wysiwyg.querySelectorAll('tr')) {
    tr.getBoundingClientRect = () => ({
      left: 20, right: 20 + width, top: 80, bottom: 126,
      width, height: 46, x: 20, y: 80,
    })
  }
}

const rows = (ed) =>
  [...ed.wysiwyg.querySelectorAll('tr')].map((r) => r.cells[0].textContent).join(',')

describe('表 — スマホでの操作', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('大きく左へ振ると、その行が消える', async () => {
    const ed = makeEditor(TABLE)
    measurable(ed)
    swipe(ed.wysiwyg.querySelector('#a2'), { dx: -200 })
    await new Promise((r) => setTimeout(r, 220))   // 消える前の見送りアニメーション
    expect(rows(ed)).toBe('A1,A3')
  })

  it('半分に届かないスワイプでは消さない（行幅 340 → しきい値 170）', async () => {
    const ed = makeEditor(TABLE)
    measurable(ed, 340)
    swipe(ed.wysiwyg.querySelector('#a2'), { dx: -150 })
    await new Promise((r) => setTimeout(r, 220))
    expect(rows(ed)).toBe('A1,A2,A3')
  })

  it('少しだけ動かしたときは消さない（誤操作で本文を失わせない）', async () => {
    const ed = makeEditor(TABLE)
    measurable(ed)
    const row = ed.wysiwyg.querySelector('#a2').closest('tr')
    swipe(ed.wysiwyg.querySelector('#a2'), { dx: -40 })
    await new Promise((r) => setTimeout(r, 220))
    expect(rows(ed)).toBe('A1,A2,A3')
    expect(row.style.transform).toBe('')          // 元の位置へ戻す
  })

  it('縦に振ったときは何もしない（ページのスクロールに譲る）', async () => {
    const ed = makeEditor(TABLE)
    measurable(ed)
    swipe(ed.wysiwyg.querySelector('#a2'), { dx: -200, dy: -260 })
    await new Promise((r) => setTimeout(r, 220))
    expect(rows(ed)).toBe('A1,A2,A3')
  })

  it('マウスでは動かない（横ドラッグは本文の範囲選択）', async () => {
    const ed = makeEditor(TABLE)
    measurable(ed)
    swipe(ed.wysiwyg.querySelector('#a2'), { dx: -300, pointerType: 'mouse' })
    await new Promise((r) => setTimeout(r, 220))
    expect(rows(ed)).toBe('A1,A2,A3')
  })

  it('閲覧モードでは動かない', async () => {
    const ed = makeEditor(TABLE)
    measurable(ed)
    ed.setMode('view')
    swipe(ed.wysiwyg.querySelector('#a2'), { dx: -300 })
    await new Promise((r) => setTimeout(r, 220))
    expect(rows(ed)).toBe('A1,A2,A3')
  })

  it('最後の 1 行は消さない（表ごと消えるのは意図しない）', async () => {
    const ed = makeEditor('<table><tbody><tr><td id="only">X</td></tr></tbody></table>')
    measurable(ed)
    swipe(ed.wysiwyg.querySelector('#only'), { dx: -300 })
    await new Promise((r) => setTimeout(r, 220))
    expect(ed.wysiwyg.querySelectorAll('tr').length).toBe(1)
  })

  it('削除ボタンは画面の外へ出さない（表の右端が画面の右端でも押せる）', () => {
    const ed = makeEditor(TABLE)
    const table = ed.wysiwyg.querySelector('table')
    const cell  = ed.wysiwyg.querySelector('#a1')
    // 表の右端 = viewport の右端（＝スマホで編集領域が画面いっぱいの状態）
    const vw = window.innerWidth
    const rect = (o) => () => ({ ...o, x: o.left, y: o.top,
      width: o.right - o.left, height: o.bottom - o.top })
    table.getBoundingClientRect = rect({ left: 0, right: vw, top: 80, bottom: 220 })
    cell.getBoundingClientRect  = rect({ left: 0, right: vw / 2, top: 80, bottom: 126 })
    for (const tr of ed.wysiwyg.querySelectorAll('tr')) {
      tr.getBoundingClientRect = rect({ left: 0, right: vw, top: 80, bottom: 126 })
    }
    ed.tableInserter.activate(table)
    ed.tableInserter.updateCursor(cell)

    const left = parseFloat(ed.tableInserter.rowDelBtn.style.left)
    expect(left + 18).toBeLessThanOrEqual(vw)     // 18px = ボタンの直径
    expect(left).toBeGreaterThanOrEqual(0)
  })
})
