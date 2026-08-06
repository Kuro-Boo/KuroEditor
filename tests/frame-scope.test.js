/**
 * 枠の中で編集したときに【枠ごと】巻き込まないこと。
 *
 * 「本文直下のブロックまで遡る」「intersectsNode で拾う」のどちらも、枠
 * （コールアウト・角丸ボックス・引用）の中で押すと枠そのものを掴んでしまう —
 * 選択は祖先とも交差し、遡った先は枠だから。対象は常に【行】であること。
 *
 * 同じ罠を踏んだ実績: Tab の字下げ（v2.25.0）、リスト化・寄せ・行間・
 * コールアウト（v2.33.3）。新しいブロック操作を足すときは必ずここに 1 件足す。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** el の中身を選択する（範囲選択＝実際の操作と同じ土俵） */
function select(ed, el) {
  const r = document.createRange()
  r.selectNodeContents(el)
  const s = window.getSelection()
  s.removeAllRanges(); s.addRange(r)
  ed.wysiwyg.focus()
  return r
}

const CALLOUT = '<div class="kuro-callout kuro-callout--tip">' +
  '<p id="a">一行目</p><p id="b">二行目</p></div>'

describe('枠の中の編集は枠を巻き込まない', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('リスト化 — 選んだ行だけがリストになる（枠ごとではない）', () => {
    const ed = makeEditor(CALLOUT)
    select(ed, ed.wysiwyg.querySelector('#a'))
    ed._insertList('UL')
    const callout = ed.wysiwyg.querySelector('.kuro-callout')
    // リストは【枠の中】にできる。枠そのものが <li> の中へ入ってはいけない
    expect(callout).toBeTruthy()
    expect(callout.querySelector('ul > li')?.textContent).toBe('一行目')
    expect(ed.wysiwyg.querySelector('li .kuro-callout')).toBeNull()
    expect(callout.querySelector('#b')?.tagName).toBe('P')   // 選んでいない行は据え置き
  })

  it('リスト化 — 枠の中で複数行を選べば、その行だけがまとまる', () => {
    const ed = makeEditor(CALLOUT)
    const [a, b] = [ed.wysiwyg.querySelector('#a'), ed.wysiwyg.querySelector('#b')]
    const r = document.createRange()
    r.setStart(a.firstChild, 0)
    r.setEnd(b.firstChild, b.firstChild.length)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
    ed._insertList('UL')
    const items = ed.wysiwyg.querySelectorAll('.kuro-callout ul > li')
    expect([...items].map((li) => li.textContent)).toEqual(['一行目', '二行目'])
  })

  it('寄せ — 枠には text-align を書かない（枠の中の他の行まで動く）', () => {
    const ed = makeEditor(CALLOUT)
    select(ed, ed.wysiwyg.querySelector('#a'))
    ed._applyAlign('center')
    expect(ed.wysiwyg.querySelector('#a').style.textAlign).toBe('center')
    expect(ed.wysiwyg.querySelector('.kuro-callout').style.textAlign).toBe('')
    expect(ed.wysiwyg.querySelector('#b').style.textAlign).toBe('')
  })

  it('行間 — 枠には line-height を書かない', () => {
    const ed = makeEditor(CALLOUT)
    select(ed, ed.wysiwyg.querySelector('#a'))
    ed._applyLineHeight('2')
    expect(ed.wysiwyg.querySelector('#a').style.lineHeight).toBe('2')
    expect(ed.wysiwyg.querySelector('.kuro-callout').style.lineHeight).toBe('')
  })

  it('コールアウト — 角丸ボックスの中で押しても、ボックス全体を囲まない', () => {
    const ed = makeEditor('<div class="kuro-roundbox"><p id="a">中の段落</p><p id="b">もう一行</p></div>')
    select(ed, ed.wysiwyg.querySelector('#a'))
    ed._applyCallout('tip')
    const box = ed.wysiwyg.querySelector('.kuro-roundbox')
    expect(box).toBeTruthy()
    expect(box.querySelector('.kuro-callout > #a')).toBeTruthy()   // 枠の中に囲みができる
    expect(ed.wysiwyg.querySelector('.kuro-callout .kuro-roundbox')).toBeNull()
    expect(box.querySelector(':scope > #b') ?? box.querySelector('#b')).toBeTruthy()
  })

  // 入れ子のリストも同じ罠（祖先の <ul> にも選択が交差する）
  it('「解除」は選んだ子リストだけ — 親リストを巻き込まない', () => {
    const ed = makeEditor(
      '<ul class="kuro-ul-disc"><li>親<ul class="kuro-ul-disc"><li id="c">子</li></ul></li>' +
      '<li>親2</li></ul>')
    select(ed, ed.wysiwyg.querySelector('#c'))
    ed._applyULStyle('kuro-ul-remove')                 // 1 段目（記号だけ消す）
    const [outer, inner] = ed.wysiwyg.querySelectorAll('ul')
    expect(inner.classList.contains('kuro-ul-none')).toBe(true)
    expect(outer.classList.contains('kuro-ul-none')).toBe(false)  // 親は無傷

    select(ed, ed.wysiwyg.querySelector('#c'))
    ed._applyULStyle('kuro-ul-remove')                 // 2 段目（段落へ）
    expect(ed.wysiwyg.querySelectorAll('ul').length).toBe(1)      // 親リストは残る
    expect(ed.wysiwyg.querySelectorAll('li').length).toBe(2)
  })

  it('「解除」で <p> の中に子リストを入れない（壊れた HTML を作らない）', () => {
    const ed = makeEditor(
      '<ul class="kuro-ul-none"><li id="a">親<ul class="kuro-ul-disc"><li>子</li></ul></li></ul>')
    select(ed, ed.wysiwyg.querySelector('#a'))
    ed._toggleListOff('UL')
    expect(ed.getContent()).not.toMatch(/<p>[^<]*<p>/)   // <p> の入れ子は不正
    expect(ed.wysiwyg.querySelector('p + ul')).toBeTruthy()  // 子リストは段落の次へ
  })

  it('コールアウト — リスト項目ではリストごと囲む（リストを分断しない）', () => {
    const ed = makeEditor('<ul class="kuro-ul-disc"><li id="a">項目1</li><li>項目2</li></ul>')
    select(ed, ed.wysiwyg.querySelector('#a'))
    ed._applyCallout('note')
    const callout = ed.wysiwyg.querySelector('.kuro-callout')
    expect(callout.querySelector('ul')).toBeTruthy()
    expect(callout.querySelectorAll('li').length).toBe(2)
  })
})
