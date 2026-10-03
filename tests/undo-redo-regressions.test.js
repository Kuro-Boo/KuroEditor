/**
 * Undo / Redo の4つの穴（監査で見つけ、実物で再現してから直した・2026-10-03）。
 *
 * どれも「画面は動くのに、戻る先が違う」種類の壊れ方で、気づくのは実機である。
 * だから**再現の筋をそのまま**試験に残す — 直し方ではなく、起きてはいけない
 * ことを書く。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function mount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

/** 文字を打った体にする（input を出して履歴の予約を起こす）。 */
function type(ed, html) {
  ed.wysiwyg.innerHTML = html
  ed.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Undo の直後に打った字を、Redo で消さない', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  /**
   * 400ms の畳み込みの内側で Redo を押すと、**まだ積まれていない入力**の上に
   * 古い redo 先が被さっていた。履歴にも無いので Undo でも戻せず、打った字が
   * そのまま消えた（`_redo` が打ちかけを確定していなかった）。
   */
  it('Undo → 入力 → Redo で、入力した字が残る', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>A</p>' })
    type(ed, '<p>AB</p>');  ed._commitSnapshot()
    type(ed, '<p>ABC</p>'); ed._commitSnapshot()
    ed._undo()
    expect(ed.getContent()).toContain('AB')

    type(ed, '<p>ABX</p>')   // 打ちかけ（まだ積まれていない）
    ed._redo()

    expect(ed.getContent()).toContain('ABX')
    // 確定した時点で redo 先は捨てられる＝「打ったらやり直しは効かない」
    // という普通の形。打った字の方を残すのが正しい。
    expect(ed.getContent()).not.toContain('ABC')
  })

  it('打ちかけが無ければ、Redo はこれまでどおり進む', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>A</p>' })
    type(ed, '<p>AB</p>');  ed._commitSnapshot()
    type(ed, '<p>ABC</p>'); ed._commitSnapshot()
    ed._undo()
    ed._redo()
    expect(ed.getContent()).toContain('ABC')
  })
})

describe('ブロックの中の形が変わっても、カーソルは同じ字の所へ戻る', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  /**
   * AI / API 由来の本文は、保存の正規化で内側の <div> が外れたり段落が <p> に
   * 変わる。ブロック内の**行番号**だけで持っていたので、作り直した DOM では
   * どの行も指さず、文字位置 4 が 0 へ飛んでいた。
   */
  it('内側の <div> が正規化で外れても、文字位置を保つ', () => {
    const ed = new KuroEditor(mount(), { blockIds: true })
    ed.setContent('<div><div>abcdefg</div></div>')
    const inner = ed.wysiwyg.firstElementChild.firstElementChild
    window.getSelection().setBaseAndExtent(inner.firstChild, 4, inner.firstChild, 4)
    const caret = ed._caretOffset()
    expect(caret.offset).toBe(4)

    // 同じブロック・同じ文字で、内側の <div> だけが無い形へ戻す
    ed._restoreSnapshot({ html: `<div data-bid="${caret.bid}">abcdefg</div>`, caret })

    expect(ed._caretOffset()?.offset).toBe(4)
  })

  it('形が変わらなければ、これまでどおり行番号で戻る', () => {
    const ed = new KuroEditor(mount(), { blockIds: true })
    ed.setContent('<div><div>abcdefg</div></div>')
    const inner = ed.wysiwyg.firstElementChild.firstElementChild
    window.getSelection().setBaseAndExtent(inner.firstChild, 4, inner.firstChild, 4)
    const caret = ed._caretOffset()
    ed._restoreSnapshot({ html: ed.wysiwyg.innerHTML, caret })
    expect(ed._caretOffset()?.offset).toBe(4)
  })
})

describe('Undo / Redo の後も、カード用の囲いが残る', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  /**
   * `data-kuro-block` の囲いは、URL カードや裸の <br> をキャレットで通り抜ける
   * ための足場（`_wrapAtomicBlocks`）。`setContent` は組むのに復元では組んで
   * いなかったので、Undo / Redo の後だけカードの前後で矢印・Backspace が
   * 効かなくなっていた。
   */
  it('Undo しても data-kuro-block の囲いが消えない', () => {
    const ed = new KuroEditor(mount(), {
      initialContent: '<p>text</p>[[https://a.example|]]',
    })
    const before = ed.wysiwyg.querySelectorAll('div[data-kuro-block]').length
    expect(before).toBeGreaterThan(0)

    type(ed, ed.wysiwyg.innerHTML + '<p>more</p>')
    ed._commitSnapshot()
    ed._undo()

    expect(ed.wysiwyg.querySelectorAll('div[data-kuro-block]').length).toBe(before)
  })
})

describe('鍵盤を持たない経路からの取り消しも拾う', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  function history(ed, inputType, target) {
    const ev = new Event('beforeinput', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'inputType', { value: inputType })
    ;(target ?? ed.wysiwyg).dispatchEvent(ev)
    return ev
  }

  /**
   * iOS の3本指スワイプ・編集メニュー、Android の操作、macOS の
   * 「編集 ▸ 取り消す」はキーを伴わず `beforeinput` で来る。素通りさせると
   * ブラウザ自身が contenteditable を巻き戻し、こちらの履歴と中身が食い違う。
   */
  it('historyUndo で戻り、historyRedo で進む', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>A</p>' })
    type(ed, '<p>AB</p>')
    ed._commitSnapshot()

    const undo = history(ed, 'historyUndo')
    expect(undo.defaultPrevented, 'ブラウザに任せてはいけない').toBe(true)
    expect(ed.getContent()).toContain('<p>A</p>')
    expect(ed.getContent()).not.toContain('AB')

    history(ed, 'historyRedo')
    expect(ed.getContent()).toContain('AB')
  })

  it('コードブロックの中は、その textarea の履歴に任せる', () => {
    const ed = new KuroEditor(mount(), { initialContent: '<p>A</p>' })
    type(ed, '<p>AB</p>')
    ed._commitSnapshot()
    const wrap = document.createElement('div')
    wrap.className = 'kuro-code-wrap'
    const ta = document.createElement('textarea')
    wrap.appendChild(ta)
    ed.wysiwyg.appendChild(wrap)

    const ev = history(ed, 'historyUndo', ta)
    expect(ev.defaultPrevented).toBe(false)
    expect(ed.getContent()).toContain('AB')
  })
})
