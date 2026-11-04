/**
 * 複数行を選んで押したとき、【選んだ行すべて】に効くこと。
 *
 * popm は範囲選択中に出るので、選択の先頭（キャレット 1 点）だけを見て処理を書くと
 * 「3 行選んで押したのに 1 行しか変わらない」壊れ方をする。行をまたぐ選択を
 * 1 つの要素で包むと、`<span><p>…</p></span>` の不正 HTML と空の段落が残る。
 *
 * 実績: コールアウト（複数行を選んで付けると 1 行だけが入った）、見出しの解除
 * （先頭だけ外れ、外した文字が段落の外に出た）、色・大きさ・書体・kbd
 * （段落ごと span に入り、両端に空の段落が残った）、リストのマーカー（先頭のリストだけ）。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** #from の先頭から #to の末尾までを選ぶ */
function selectLines(ed, from, to) {
  const a = ed.wysiwyg.querySelector(from)
  let b = ed.wysiwyg.querySelector(to)
  while (b.lastChild) b = b.lastChild
  let s = a
  while (s.firstChild) s = s.firstChild
  const r = document.createRange()
  r.setStart(s, 0)
  r.setEnd(b, b.nodeType === Node.TEXT_NODE ? b.length : 0)
  const sel = window.getSelection()
  sel.removeAllRanges(); sel.addRange(r)
  return r
}

const html = (ed) => ed.wysiwyg.innerHTML
  .replace(/ data-bid="[^"]*"/g, '')
  .replace(/<p data-kuro-caret-slot=""><br><\/p>/g, '')

const P3 = '<p id="a">一</p><p id="b">二</p><p id="c">三</p>'

describe('複数行の選択', () => {
  let origQCV
  beforeEach(() => { document.body.innerHTML = ''; origQCV = document.queryCommandValue })
  afterEach(() => { document.queryCommandValue = origQCV })

  it('コールアウト — 選んだ行をまとめて 1 つで囲む（他の行を落とさない）', () => {
    const ed = makeEditor(P3)
    selectLines(ed, '#a', '#c')
    ed._applyCallout('tip')
    expect(html(ed)).toBe(
      '<div class="kuro-callout kuro-callout--tip"><p id="a">一</p><p id="b">二</p><p id="c">三</p></div>')
  })

  it('コールアウト — 途中の 2 行だけなら、その 2 行だけ', () => {
    const ed = makeEditor(P3)
    selectLines(ed, '#b', '#c')
    ed._applyCallout('note')
    expect(html(ed)).toBe(
      '<p id="a">一</p><div class="kuro-callout kuro-callout--note"><p id="b">二</p><p id="c">三</p></div>')
  })

  it('コールアウト — 段落とリストをまたいでも、リストごと 1 つに入る', () => {
    const ed = makeEditor('<p id="a">一</p><ul><li>x</li><li id="c">y</li></ul>')
    selectLines(ed, '#a', '#c')
    ed._applyCallout('tip')
    expect(html(ed)).toBe(
      '<div class="kuro-callout kuro-callout--tip"><p id="a">一</p><ul><li>x</li><li id="c">y</li></ul></div>')
  })

  it('コールアウト — 既存のコールアウトと段落を選べば 1 つにまとまる（入れ子にしない）', () => {
    const ed = makeEditor('<div class="kuro-callout kuro-callout--warn"><p id="a">一</p></div><p id="c">三</p>')
    selectLines(ed, '#a', '#c')
    ed._applyCallout('tip')
    expect(html(ed)).toBe(
      '<div class="kuro-callout kuro-callout--tip"><p id="a">一</p><p id="c">三</p></div>')
  })

  it('コールアウト — 2 つのコールアウトにまたがる解除・種類替えは両方に効く', () => {
    const two = '<div class="kuro-callout kuro-callout--tip"><p id="a">一</p></div>' +
      '<div class="kuro-callout kuro-callout--tip"><p id="c">三</p></div>'
    let ed = makeEditor(two)
    selectLines(ed, '#a', '#c')
    ed._applyCallout('danger')
    expect(ed.wysiwyg.querySelectorAll('.kuro-callout--danger').length).toBe(2)

    document.body.innerHTML = ''
    ed = makeEditor(two)
    selectLines(ed, '#a', '#c')
    ed._applyCallout('tip')
    expect(html(ed)).toBe('<p id="a">一</p><p id="c">三</p>')
  })

  it('見出しの解除 — 選んだ見出しすべてが段落に戻る（文字が 1 行に繋がらない）', () => {
    const ed = makeEditor('<h2 id="a">一</h2><h2 id="b">二</h2><h2 id="c">三</h2>')
    selectLines(ed, '#a', '#c')
    document.queryCommandValue = () => 'h2'
    ed._formatBlock('h2')
    expect(html(ed)).toBe(P3)
  })

  it('引用の解除 — 中の段落は段落のまま外へ出る', () => {
    const ed = makeEditor('<blockquote><p id="a">一</p><p id="c">三</p></blockquote>')
    selectLines(ed, '#a', '#c')
    document.queryCommandValue = () => 'blockquote'
    ed._formatBlock('blockquote')
    expect(html(ed)).toBe('<p id="a">一</p><p id="c">三</p>')
  })

  for (const [name, run, open, close] of [
    ['文字色', (ed) => ed._applyColor('#ef4444'), '<span style="color: #ef4444;">', '</span>'],
    ['文字の大きさ', (ed) => ed._applyFontSize('150%'), '<span style="font-size: 150%;">', '</span>'],
    ['書体', (ed) => ed._applyFontFamily('serif'), '<span style="font-family: serif;">', '</span>'],
    ['kbd', (ed) => ed._toggleKbd(), '<kbd>', '</kbd>'],
  ]) {
    it(`${name} — 行ごとに包む（段落を span に入れない・空の段落を残さない）`, () => {
      const ed = makeEditor(P3)
      selectLines(ed, '#a', '#c')
      run(ed)
      expect(html(ed)).toBe(
        `<p id="a">${open}一${close}</p><p id="b">${open}二${close}</p><p id="c">${open}三${close}</p>`)
      // 選択は包んだ範囲のまま（続けて装飾できる）
      expect(window.getSelection().toString()).toBe('一二三')
    })
  }

  it('文字色 — 行の途中から途中まで', () => {
    const ed = makeEditor('<p id="a">あいう</p><p id="c">えおか</p>')
    const r = document.createRange()
    r.setStart(ed.wysiwyg.querySelector('#a').firstChild, 1)
    r.setEnd(ed.wysiwyg.querySelector('#c').firstChild, 2)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
    ed._applyColor('#ef4444')
    expect(html(ed)).toBe(
      '<p id="a">あ<span style="color: #ef4444;">いう</span></p>' +
      '<p id="c"><span style="color: #ef4444;">えお</span>か</p>')
  })

  it('文字色 — 子リストを持つ項目では、子リストを span に入れない', () => {
    const ed = makeEditor('<ul><li id="a">親<ul><li id="c">子</li></ul></li></ul>')
    selectLines(ed, '#a', '#c')
    ed._applyColor('#ef4444')
    expect(ed.wysiwyg.querySelector('span ul')).toBeNull()
    expect(ed.wysiwyg.querySelectorAll('span').length).toBe(2)
  })

  it('リストのマーカー — 選んだ 2 つのリストの両方に効く', () => {
    const ed = makeEditor('<ul><li id="a">x</li></ul><ul><li id="c">y</li></ul>')
    selectLines(ed, '#a', '#c')
    ed._applyULStyle('kuro-ul-star')
    expect(ed.wysiwyg.querySelectorAll('ul.kuro-ul-star').length).toBe(2)
  })

  it('番号のマーカー — 記号リストと番号リストをまたげば両方が番号リストに', () => {
    const ed = makeEditor('<ul><li id="a">x</li></ul><ol><li id="c">y</li></ol>')
    selectLines(ed, '#a', '#c')
    ed._applyListStyle('kuro-list-paren')
    expect(ed.wysiwyg.querySelectorAll('ol.kuro-list-paren').length).toBe(2)
    expect(ed.wysiwyg.querySelector('ul')).toBeNull()
  })

  it('記号のマーカー — リストと段落が混ざれば、段落も項目にして 1 つのリストに', () => {
    const ed = makeEditor('<ul><li id="a">x</li></ul><p id="b">m</p><h2 id="c">n</h2>')
    selectLines(ed, '#a', '#c')
    ed._applyULStyle('kuro-ul-star')
    expect(html(ed)).toBe('<ul class="kuro-ul-star"><li id="a">x</li><li>m</li><li>n</li></ul>')
    expect(window.getSelection().toString()).toBe('xmn')
  })

  it('番号のマーカー — 段落を挟んだ 2 つのリストも 1 つにまとまる（入れ子はそのまま）', () => {
    const ed = makeEditor(
      '<ol start="3"><li id="a">x<ol><li>x1</li></ol></li></ol><p id="b">m</p><ul><li id="c">y</li></ul>')
    selectLines(ed, '#a', '#c')
    ed._applyListStyle('kuro-list-paren-num')
    const top = [...ed.wysiwyg.children].filter((el) => el.tagName === 'OL')
    expect(top.length).toBe(1)
    const ol = top[0]
    expect(ol.getAttribute('start')).toBe('3')
    expect(ol.classList.contains('kuro-list-paren-num')).toBe(true)
    expect([...ol.children].map((li) => li.firstChild.textContent)).toEqual(['x', 'm', 'y'])
    expect(ol.querySelector('li > ol > li')?.textContent).toBe('x1')
    expect(ed.wysiwyg.querySelector('ul')).toBeNull()
  })

  it('マーカー — 間に表があれば、そこで別のリストに分ける（表を項目に入れない）', () => {
    const ed = makeEditor(
      '<ul><li id="a">x</li></ul><p>m</p><table><tbody><tr><td>t</td></tr></tbody></table><p id="c">n</p>')
    selectLines(ed, '#a', '#c')
    ed._applyULStyle('kuro-ul-star')
    expect([...ed.wysiwyg.children].filter((el) => el.matches('ul.kuro-ul-star')).length).toBe(2)
    expect(ed.wysiwyg.querySelector('li table')).toBeNull()
  })
})
