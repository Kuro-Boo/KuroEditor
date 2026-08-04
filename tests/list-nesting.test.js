/**
 * リストの入れ子（Tab / Shift+Tab）と 2 段階の「解除」。
 *
 * 前提: リスト操作の入口は popm（範囲選択中しか出ない）なので、対象は
 * 「キャレットの 1 行」ではなく【選択がかかっている行すべて】。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return new KuroEditor(el, { initialContent: html })
}

/** node の中身を選択する（複数行なら from..to）。 */
function select(from, to = from) {
  const sel = window.getSelection()
  const r = document.createRange()
  r.setStart(from, 0)
  r.selectNodeContents(to)
  r.setStart(from, 0)
  sel.removeAllRanges()
  sel.addRange(r)
  return r
}

const tab = (ed, shift = false) =>
  ed.wysiwyg.dispatchEvent(new window.KeyboardEvent('keydown',
    { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }))

describe('リストの入れ子（Tab / Shift+Tab）', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('Tab で前の項目の子リストになる', () => {
    const ed = makeEditor('<ul><li>買い物</li><li>牛乳</li></ul>')
    const [first, second] = ed.wysiwyg.querySelectorAll('li')
    select(second)
    tab(ed)
    expect(first.querySelector('ul > li').textContent).toBe('牛乳')
    expect(ed.wysiwyg.querySelectorAll('ul > li').length).toBe(2)   // 親1 + 子1
  })

  it('先頭の項目は入れ子にできない（親になる項目が無い）', () => {
    const ed = makeEditor('<ul><li>買い物</li><li>牛乳</li></ul>')
    const first = ed.wysiwyg.querySelector('li')
    select(first)
    tab(ed)
    expect(ed.wysiwyg.querySelector('ul ul')).toBe(null)
  })

  it('子リストはマーカーを親から継承する', () => {
    const ed = makeEditor('<ul class="kuro-ul-check"><li>親</li><li>子</li></ul>')
    const [, second] = ed.wysiwyg.querySelectorAll('li')
    select(second)
    tab(ed)
    const sub = ed.wysiwyg.querySelector('ul ul')
    expect(sub.classList.contains('kuro-ul-check')).toBe(true)
  })

  it('OL の子リストは <ol> になる', () => {
    const ed = makeEditor('<ol class="kuro-list-alpha"><li>a</li><li>b</li></ol>')
    const [, second] = ed.wysiwyg.querySelectorAll('li')
    select(second)
    tab(ed)
    const sub = ed.wysiwyg.querySelector('ol ol')
    expect(sub).toBeTruthy()
    expect(sub.classList.contains('kuro-list-alpha')).toBe(true)
  })

  it('Shift+Tab で 1 段浅くなる', () => {
    const ed = makeEditor('<ul><li>親<ul><li>子</li></ul></li></ul>')
    const child = ed.wysiwyg.querySelector('ul ul li')
    select(child)
    tab(ed, true)
    expect(ed.wysiwyg.querySelector('ul ul')).toBe(null)          // 空の子リストは畳む
    expect(ed.wysiwyg.querySelectorAll('ul > li').length).toBe(2)
  })

  it('最上位で Shift+Tab しても何も起きない（抜けるのは「解除」の仕事）', () => {
    const ed = makeEditor('<ul><li>a</li><li>b</li></ul>')
    const [, second] = ed.wysiwyg.querySelectorAll('li')
    select(second)
    tab(ed, true)
    expect(ed.wysiwyg.querySelectorAll('ul > li').length).toBe(2)
    expect(ed.wysiwyg.querySelector('p')).toBe(null)
  })

  it('アウトデントすると後続の兄弟は自分にぶら下がり、順序が保たれる', () => {
    const ed = makeEditor('<ul><li>親<ul><li>子1</li><li>子2</li><li>子3</li></ul></li></ul>')
    const kids = ed.wysiwyg.querySelectorAll('ul ul li')
    select(kids[0])                                  // 子1 だけを出す
    tab(ed, true)
    // 子1 が親の直後へ出て、子2・子3 は子1 の下にぶら下がる
    const top = ed.wysiwyg.querySelectorAll(':scope > ul > li')
    expect([...ed.wysiwyg.querySelectorAll('ul > li')].map(li => li.firstChild.textContent))
      .toEqual(['親', '子1', '子2', '子3'])
    expect(top.length === 0 || top.length === 2).toBe(true)
  })

  // ── 範囲選択（複数行）─────────────────────────────────────────────────────
  it('複数行を選んで Tab すると、選択した行が全部同じ親の下に入る', () => {
    const ed = makeEditor('<ul><li>親</li><li>子1</li><li>子2</li></ul>')
    const [first, a, b] = ed.wysiwyg.querySelectorAll('li')
    select(a, b)
    tab(ed)
    const sub = first.querySelector('ul')
    expect(sub).toBeTruthy()
    expect([...sub.children].map(li => li.textContent)).toEqual(['子1', '子2'])
  })

  it('親と子を同時に選んでも子を二重に動かさない', () => {
    const ed = makeEditor('<ul><li>先頭</li><li>親<ul><li>子</li></ul></li></ul>')
    const items = ed.wysiwyg.querySelectorAll('li')
    select(items[1], items[2])          // 親 + 子
    tab(ed)
    // 親が「先頭」の下に入り、子は親の下のまま（階層は 2 段だけ深くならない）
    const sub = ed.wysiwyg.querySelector('ul > li > ul')
    expect(sub.children.length).toBe(1)
    expect(sub.querySelector('li ul li').textContent).toBe('子')
  })
})

describe('2 段階の「解除」', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('1 回目は記号だけ消えて <li> のまま', () => {
    const ed = makeEditor('<ul class="kuro-ul-star"><li>a</li><li>b</li></ul>')
    select(ed.wysiwyg.querySelector('li'))
    ed._applyULStyle('kuro-ul-remove')
    const ul = ed.wysiwyg.querySelector('ul')
    expect(ul.classList.contains('kuro-ul-none')).toBe(true)
    expect(ul.classList.contains('kuro-ul-star')).toBe(false)
    expect(ul.children.length).toBe(2)
  })

  it('2 回目でリストから抜けて段落に戻る', () => {
    const ed = makeEditor('<ul class="kuro-ul-star"><li>a</li><li>b</li></ul>')
    select(ed.wysiwyg.querySelector('li'))
    ed._applyULStyle('kuro-ul-remove')
    select(ed.wysiwyg.querySelector('li'))
    ed._applyULStyle('kuro-ul-remove')
    expect(ed.wysiwyg.querySelector('ul')).toBe(null)
    expect(ed.wysiwyg.querySelectorAll('p').length).toBe(2)
  })

  it('入れ子の子項目を解除しても階層から飛び出さない', () => {
    const ed = makeEditor('<ul><li>親<ul><li>子</li></ul></li></ul>')
    select(ed.wysiwyg.querySelector('ul ul li'))
    ed._applyULStyle('kuro-ul-remove')
    const sub = ed.wysiwyg.querySelector('ul ul')
    expect(sub).toBeTruthy()                                  // 子リストは生きている
    expect(sub.classList.contains('kuro-ul-none')).toBe(true) // 記号だけ落ちた
  })

  it('OL も同じ（記号なし → 段落）', () => {
    const ed = makeEditor('<ol class="kuro-list-alpha"><li>a</li></ol>')
    select(ed.wysiwyg.querySelector('li'))
    ed._applyListStyle('kuro-list-remove')
    expect(ed.wysiwyg.querySelector('ol').classList.contains('kuro-list-none')).toBe(true)
    select(ed.wysiwyg.querySelector('li'))
    ed._applyListStyle('kuro-list-remove')
    expect(ed.wysiwyg.querySelector('ol')).toBe(null)
  })

  it('記号を選び直せば「記号なし」は外れる', () => {
    const ed = makeEditor('<ul class="kuro-ul-none"><li>a</li></ul>')
    select(ed.wysiwyg.querySelector('li'))
    ed._applyULStyle('kuro-ul-disc')
    expect(ed.wysiwyg.querySelector('ul').className).toBe('kuro-ul-disc')
  })

  // 入れ子の記号は【子リスト単位】で変えられる。子は作られた時点で親の記号を
  // 引き継ぐが、その後で子だけ別の記号にしたい（例: 親は ● で子は ▶）ことがある。
  it('子リストの項目を選んで記号を押すと、その子リストだけ変わる', () => {
    const ed = makeEditor(
      '<ul class="kuro-ul-disc"><li>親' +
      '<ul class="kuro-ul-disc"><li id="c1">子1</li><li>子2</li></ul>' +
      '</li></ul>')
    select(ed.wysiwyg.querySelector('#c1'))
    ed._applyULStyle('kuro-ul-arrow')
    const [parent, child] = ed.wysiwyg.querySelectorAll('ul')
    expect(child.classList.contains('kuro-ul-arrow')).toBe(true)
    expect(parent.classList.contains('kuro-ul-disc')).toBe(true)   // 親は変わらない
  })

  it('マーカー有り／無しが混ざった選択は、まず全部「記号なし」に揃える', () => {
    const ed = makeEditor(
      '<ul class="kuro-ul-none"><li>a</li></ul><ul class="kuro-ul-star"><li>b</li></ul>')
    const [a, b] = ed.wysiwyg.querySelectorAll('li')
    select(a, b)
    ed._applyULStyle('kuro-ul-remove')
    const uls = ed.wysiwyg.querySelectorAll('ul')
    expect(uls.length).toBe(2)                                  // まだ段落になっていない
    expect([...uls].every(u => u.classList.contains('kuro-ul-none'))).toBe(true)
  })
})
