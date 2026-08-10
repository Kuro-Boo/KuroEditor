/**
 * 表メニュー（TBL設定）の後始末と、つかんで動かせること。
 *
 *   1. ノートを切り替えた（setContent）ら必ず畳む。「表は消えたのにメニューだけ
 *      画面に残る」という報告があった。⚠ activeTable の有無で早期 return しない。
 *   2. 「TBL設定」ラベルをつかんでメニューを動かせる。表の上に重なって編集できない
 *      ときの逃げ道。⚠ ボタンはどれも押した瞬間に効くので、取っ手は
 *      「押しても何も起きない場所」＝ラベルにする。
 *   3. 手で動かしたあとは自動配置しない（どけたのに戻ってきたら意味がない）。
 *      別の表へ移ったら自動配置へ戻す。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

function pointer(type, { x = 0, y = 0 } = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(e, { clientX: x, clientY: y, pointerType: 'mouse', pointerId: 1 })
  return e
}

const TABLE = '<table><tbody><tr><td id="c1">A</td><td>B</td></tr></tbody></table>'
const visible = (ed) => ed.tableManager.el.classList.contains('kuro-table-menu--visible')

describe('表メニュー', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('ノートを切り替えたら畳む（表と一緒にメニューも消える）', () => {
    const ed = makeEditor(TABLE)
    ed.tableManager.activate(ed.wysiwyg.querySelector('table'))
    ed.tableManager.el.classList.add('kuro-table-menu--visible')   // rAF を待たずに可視化
    expect(visible(ed)).toBe(true)
    ed.setContent('<p>別のノート</p>')
    expect(visible(ed)).toBe(false)
  })

  it('activeTable が先に消えていても畳む（早期 return で残さない）', () => {
    const ed = makeEditor(TABLE)
    ed.tableManager.el.classList.add('kuro-table-menu--visible')
    ed.tableManager.activeTable = null          // 何らかの理由で参照だけ落ちた状態
    ed.tableManager.deactivate()
    expect(visible(ed)).toBe(false)
  })

  it('目印アイコン（上部ツールバーと同じ絵）をつかんで動かせる', () => {
    const ed = makeEditor(TABLE)
    const tm = ed.tableManager
    // ⚠ 文字ラベル（旧「TBL設定」）ではなくアイコン。どのメニューも同じ絵で揃える
    const handle = tm.el.querySelector('.kuro-menu-icon')
    expect(handle).toBeTruthy()
    expect(tm.el.textContent).not.toContain('TBL設定')
    expect(handle.getAttribute('title')).toContain('移動')

    handle.dispatchEvent(pointer('pointerdown', { x: 100, y: 100 }))
    document.dispatchEvent(pointer('pointermove', { x: 260, y: 300 }))
    document.dispatchEvent(pointer('pointerup', { x: 260, y: 300 }))
    expect(tm.el.style.left).not.toBe('')
    expect(tm.el.style.top).not.toBe('')
    expect(tm._dragged).toBe(true)
  })

  it('動かしたあとは自動配置しない / 別の表へ移れば自動へ戻る', () => {
    const ed = makeEditor(TABLE + '<p>間</p><table><tbody><tr><td id="c2">X</td></tr></tbody></table>')
    const tm = ed.tableManager
    const [t1, t2] = ed.wysiwyg.querySelectorAll('table')
    tm.activate(t1)
    tm._dragged = true
    tm.el.style.left = '500px'
    tm._place()
    expect(tm.el.style.left).toBe('500px')      // 自動配置に上書きされない

    tm.activate(t2)
    expect(tm._dragged).toBe(false)             // 別の表なら自動配置へ戻す
  })

  // ── 共通のつまみ（全浮遊メニュー）──────────────────────────────────────
  it('主要な浮遊メニューすべてに「つまみ」と「目印アイコン」がある', () => {
    const ed = makeEditor(TABLE)
    const has = (el) => !!el.querySelector('.kuro-drag-grip') && !!el.querySelector('.kuro-menu-icon')
    expect(has(ed.tableManager.el)).toBe(true)     // 表
    expect(has(ed.linePopupMenu.el)).toBe(true)    // 罫線
    expect(has(ed.imageMenu.el)).toBe(true)        // 画像
    expect(has(ed.roundboxMenu.el)).toBe(true)     // BOX設定
  })

  // popm だけは目印アイコンを置かない（v2.36.2〜）。目印は文字装飾なので必然的に
  // 「A」になるが、同じ列に文字色（A＋赤い下線）とルビ（大小の A）が並ぶため、
  // 押せない目印の A が【もう一つの機能ボタン】に見える。揃えるより誤解を招かない
  // ことを優先した例外なので、うっかり「統一」で戻されないようここで見張る。
  it('popm には目印アイコンを置かない（A が機能ボタンに見えるため）', () => {
    const ed = makeEditor('<p>本文</p>')
    expect(ed.popm.el.querySelector('.kuro-menu-icon')).toBeNull()
    // つまみは残る（無いと動かせない）。アイコン分の取っ手を補う --wide 付き。
    const grip = ed.popm.el.querySelector('.kuro-drag-grip')
    expect(grip).not.toBeNull()
    expect(grip.classList.contains('kuro-drag-grip--wide')).toBe(true)
  })

  it('つまみを掴んでも文字の選択が解除されない（mousedown を潰す）', () => {
    const ed = makeEditor('<p id="t">選択する文章</p>')
    // 選択を作る
    const r = document.createRange()
    r.selectNodeContents(ed.wysiwyg.querySelector('#t'))
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
    const before = sel.toString()
    expect(before.length).toBeGreaterThan(0)

    const grip = ed.popm.el.querySelector('.kuro-drag-grip')
    // ⚠ contenteditable の選択を潰すのは mousedown。ここが preventDefault
    //   されていないと、掴んだ瞬間に選択が消えて popm ごと閉じる。
    const md = new Event('mousedown', { bubbles: true, cancelable: true })
    grip.dispatchEvent(md)
    expect(md.defaultPrevented).toBe(true)

    grip.dispatchEvent(pointer('pointerdown', { x: 50, y: 50 }))
    document.dispatchEvent(pointer('pointermove', { x: 300, y: 400 }))
    document.dispatchEvent(pointer('pointerup', { x: 300, y: 400 }))
    expect(window.getSelection().toString()).toBe(before)   // 選択はそのまま
    expect(ed.popm.el.style.left).not.toBe('')
  })

  it('つまみは選択できない要素にする（掴んだ指でメニュー内の文字を選ばせない）', () => {
    const ed = makeEditor(TABLE)
    const grip = ed.popm.el.querySelector('.kuro-drag-grip')
    expect(grip.style.userSelect).toBe('none')
    expect(grip.style.touchAction).toBe('none')
  })

  it('罫線ポップアップもノート切り替えで畳む', () => {
    const ed = makeEditor(TABLE)
    ed.linePopupMenu.el.classList.add('kuro-line-popm--visible')
    ed.setContent('<p>別のノート</p>')
    expect(ed.linePopupMenu.el.classList.contains('kuro-line-popm--visible')).toBe(false)
  })
})
