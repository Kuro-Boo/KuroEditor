/**
 * 結合（rowspan / colspan）のある表での、結合・分割・行列の追加と削除・罫線。
 * どれも【論理グリッド】（buildTableGrid）で考える。物理のセル番号で考えると、
 * 結合のある表でだけ別の場所に効いたり、表が崩れたりする。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor, buildTableGrid, dropEmptyTableRows } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}
function caretIn(ed, sel) {
  const el = ed.wysiwyg.querySelector(sel)
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(true)
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
  return el
}
const table = (ed) => ed.wysiwyg.querySelector('table')
const out = (ed) => table(ed).outerHTML
  .replace(/ (data-bid|data-cbid|contenteditable|class)="[^"]*"/g, '')
  .replace(/<\/?tbody>/g, '')
/** 各行の論理の列の数（崩れていなければすべて同じ） */
const widths = (t) => buildTableGrid(t).grid.map((r) => r.filter(Boolean).length)

describe('結合のある表', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('下と結合して行が空になったら、行を消して rowspan も縮める（次の行の追加で崩れない）', () => {
    const ed = makeEditor('<table><tbody><tr><td id="a">A</td><td rowspan="2">X</td></tr>' +
      '<tr><td>B</td></tr></tbody></table>')
    caretIn(ed, '#a')
    ed.tableManager._mergeDown()
    expect(out(ed)).toBe('<table><tr><td id="a">AB</td><td>X</td></tr></table>')
    ed.tableInserter.activeTable = table(ed)
    ed.tableInserter._insertRow(1)
    expect(widths(table(ed))).toEqual([2, 2])
  })

  it('下へ分割 — 右に縦の結合セルがあっても例外にならず、行のセルが揃う', () => {
    const ed = makeEditor('<table><tbody><tr><td id="a" rowspan="2">A</td><td rowspan="2">X</td><td>Z</td></tr>' +
      '<tr><td>W</td></tr></tbody></table>')
    caretIn(ed, '#a')
    expect(() => ed.tableManager._splitDown()).not.toThrow()
    expect(widths(table(ed))).toEqual([3, 3])
    expect(buildTableGrid(table(ed)).grid[1][0].textContent).toBe('')
  })

  it('下へ分割 — 見出しのセルは見出しのまま', () => {
    const ed = makeEditor('<table><tbody><tr><th id="a" rowspan="2">A</th><td>Z</td></tr>' +
      '<tr><td>W</td></tr></tbody></table>')
    caretIn(ed, '#a')
    ed.tableManager._splitDown()
    expect(buildTableGrid(table(ed)).grid[1][0].tagName).toBe('TH')
  })

  it('結合で空のセルの <br> を中身に足さない', () => {
    const ed = makeEditor('<table><tbody><tr><td id="a">A</td><td><br></td></tr></tbody></table>')
    caretIn(ed, '#a')
    ed.tableManager._mergeRight()
    expect(ed.wysiwyg.querySelector('#a').innerHTML).toBe('A')
  })

  it('列の削除で空になった行を残さない（rowspan も縮める）', () => {
    const ed = makeEditor('<table><tbody><tr><td id="a" rowspan="2">A</td><td>B</td></tr>' +
      '<tr><td id="c">C</td></tr></tbody></table>')
    const ins = ed.tableInserter
    ins.activeTable = table(ed)
    ins._currentCell = ed.wysiwyg.querySelector('#c')
    ins._deleteCol()
    expect(out(ed)).toBe('<table><tr><td id="a">A</td></tr></table>')
  })

  it('dropEmptyTableRows — 空の行が無ければ何もしない', () => {
    const ed = makeEditor('<table><tbody><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></tbody></table>')
    const before = out(ed)
    dropEmptyTableRows(table(ed))
    expect(out(ed)).toBe(before)
  })

  it('列の「＋」の位置は論理の列で数える（1 行目に横の結合があっても B の左に挿す）', () => {
    const ed = makeEditor('<table><tbody><tr><td colspan="2">A</td><td id="b">B</td></tr>' +
      '<tr><td>1</td><td id="c2">2</td><td>3</td></tr></tbody></table>')
    const t = table(ed)
    const rect = (l, r) => () => ({ left: l, right: r, top: 0, bottom: 40, width: r - l, height: 40 })
    t.getBoundingClientRect = rect(0, 300)
    const [r0, r1] = t.querySelectorAll('tr')
    r0.cells[0].getBoundingClientRect = rect(0, 200)
    r0.cells[1].getBoundingClientRect = rect(200, 300)
    r1.cells[0].getBoundingClientRect = rect(0, 100)
    r1.cells[1].getBoundingClientRect = rect(100, 200)
    r1.cells[2].getBoundingClientRect = rect(200, 300)
    for (const tr of [r0, r1]) tr.getBoundingClientRect = rect(0, 300)
    const ins = ed.tableInserter
    ins.activate(t)
    ins._handleMouseMove({ clientX: 200, clientY: -10 })   // A と B の境目の上
    expect(ins._pendingColIdx).toBe(2)
    ins._insertCol(ins._pendingColIdx)
    expect(widths(t)).toEqual([4, 4])
    expect(r0.cells[0].getAttribute('colspan')).toBe('2')   // A は広がらない
    expect(r0.cells[1].textContent).toBe('')                  // 新しいセルは A と B の間
    ins._handleMouseMove({ clientX: 100, clientY: -10 })   // 1 と 2 の境目（A の中）も挿せる
    expect(ins._pendingColIdx).toBe(1)
  })

  it('罫線 — 外枠の右は、上の rowspan に覆われた行でも右端のセルに引く', () => {
    const ed = makeEditor('<table><tbody><tr><td>A</td><td id="r" rowspan="2">R</td></tr>' +
      '<tr><td id="b">B</td></tr></tbody></table>')
    const menu = ed.linePopupMenu
    menu._target = { table: table(ed), axis: 'col', idx: 2 }
    menu._scope = 'outer'
    menu._applyStyle('2px solid')
    expect(ed.wysiwyg.querySelector('#r').style.borderRight).toBe('2px solid')
    expect(ed.wysiwyg.querySelector('#b').style.borderRight).toBe('')   // B は右端ではない
    expect(ed.wysiwyg.querySelector('#b').style.borderLeft).toBe('2px solid')
  })

  it('罫線 — 行の境目は、上から垂れて境目で終わるセルの下にも引き、またぐセルには引かない', () => {
    const ed = makeEditor('<table><tbody><tr><td id="a" rowspan="2">A</td><td id="x">X</td></tr>' +
      '<tr><td id="y">Y</td></tr><tr><td id="c">C</td><td id="z">Z</td></tr></tbody></table>')
    const menu = ed.linePopupMenu
    menu._scope = 'single'
    menu._target = { table: table(ed), axis: 'row', idx: 2 }
    menu._applyStyle('1px dashed')
    for (const id of ['a', 'y']) expect(ed.wysiwyg.querySelector('#' + id).style.borderBottom).toBe('1px dashed')
    for (const id of ['c', 'z']) expect(ed.wysiwyg.querySelector('#' + id).style.borderTop).toBe('1px dashed')

    menu._target = { table: table(ed), axis: 'row', idx: 1 }
    menu._applyStyle('3px solid')
    expect(ed.wysiwyg.querySelector('#a').style.borderBottom).toBe('1px dashed')   // またいでいる
    expect(ed.wysiwyg.querySelector('#x').style.borderBottom).toBe('3px solid')
  })
})
