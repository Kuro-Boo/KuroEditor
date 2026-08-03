/**
 * Tab / Shift+Tab の字下げ（_linesInSelection / _shiftBlockIndent）。
 *
 * 見張っているのはこの 3 点:
 *   1. Tab が効くのは【行】だけ — 段落・見出し・セル。枠（引用・コールアウト・
 *      角丸ボックス・原子ブロック）には padding-left を付けない。枠は自前の内側
 *      余白を CSS で持っており（コールアウトの padding-left:3rem = アイコン列）、
 *      インラインで上書きすると文字がアイコンに重なる。位置と幅は枠自身の設定の担当。
 *   2. 祖先を巻き込まない — 選択は祖先とも交差するので、素朴に intersectsNode で
 *      拾うと「中の段落」と「枠」の両方が 2em ずつ動く（v2.24.0 までのバグ）。
 *   3. 選択がかかっている行は【全部】動く。リストと段落が混ざっていても、
 *      項目は入れ子・段落は字下げでそれぞれ処理される。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** キャレットを node の中身の末尾へ。 */
function caretIn(node) {
  const sel = window.getSelection()
  const r = document.createRange()
  r.selectNodeContents(node)
  r.collapse(false)
  sel.removeAllRanges()
  sel.addRange(r)
}

/** from の先頭から to の末尾までを選択。 */
function selectRange(from, to) {
  const sel = window.getSelection()
  const r = document.createRange()
  r.setStart(from, 0)
  r.setEnd(to, to.childNodes.length)
  sel.removeAllRanges()
  sel.addRange(r)
}

const tab = (ed, shift = false) =>
  ed.wysiwyg.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true,
  }))

const pad = (el) => el.style.paddingLeft

describe('Tab の字下げ', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  // ── 1. 通常の行 ───────────────────────────────────────────────────────────
  it('段落は 1 段（2em）字下げされ、Shift+Tab で戻る', () => {
    const ed = makeEditor('<p>hello</p>')
    const p = ed.wysiwyg.querySelector('p')
    caretIn(p)
    tab(ed)
    expect(pad(p)).toBe('2em')
    tab(ed, true)
    expect(pad(p)).toBe('')
  })

  it('見出しも行として字下げされる', () => {
    const ed = makeEditor('<h2>title</h2>')
    const h = ed.wysiwyg.querySelector('h2')
    caretIn(h)
    tab(ed)
    expect(pad(h)).toBe('2em')
  })

  // ── 2. 枠の中 ─────────────────────────────────────────────────────────────
  // 枠ごとに「中の行だけが動き、枠は動かない」ことを確かめる
  const FRAMES = [
    ['コールアウト', '<div class="kuro-callout kuro-callout--tip"><p>hello</p></div>', '.kuro-callout'],
    ['引用',         '<blockquote><p>hello</p></blockquote>',                          'blockquote'],
    ['角丸ボックス', '<div class="kuro-roundbox"><p>hello</p></div>',                   '.kuro-roundbox'],
  ]
  for (const [name, html, frameSel] of FRAMES) {
    it(`${name}の中は段落だけが動き、枠には padding が付かない`, () => {
      const ed = makeEditor(html)
      const frame = ed.wysiwyg.querySelector(frameSel)
      const p     = frame.querySelector('p')
      caretIn(p)
      tab(ed)
      expect(pad(p)).toBe('2em')
      expect(pad(frame)).toBe('')   // ← 枠は絶対に動かさない
    })
  }

  it('テキストを直接持つ枠では何も起きない（枠は行ではない）', () => {
    const ed = makeEditor('<div class="kuro-callout kuro-callout--tip">hello</div>')
    const frame = ed.wysiwyg.querySelector('.kuro-callout')
    caretIn(frame)
    tab(ed)
    expect(pad(frame)).toBe('')
  })

  it('原子ブロック（URL カード等のラッパー）も動かさない', () => {
    const ed = makeEditor('<div data-kuro-block=""><a href="https://x.test" contenteditable="false">card</a></div>')
    const wrap = ed.wysiwyg.querySelector('[data-kuro-block]')
    caretIn(wrap)
    tab(ed)
    expect(pad(wrap)).toBe('')
  })

  it('セルの中の段落を字下げしてもセルと表は動かない', () => {
    const ed = makeEditor('<table><tbody><tr><td><p>a</p></td></tr></tbody></table>')
    const td = ed.wysiwyg.querySelector('td')
    const p  = td.querySelector('p')
    caretIn(p)
    tab(ed)
    expect(pad(p)).toBe('2em')
    expect(pad(td)).toBe('')
    expect(pad(ed.wysiwyg.querySelector('table'))).toBe('')
  })

  it('テキストを直接持つセルはセル自身が行になる', () => {
    const ed = makeEditor('<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>')
    const [td1, td2] = ed.wysiwyg.querySelectorAll('td')
    caretIn(td1)
    tab(ed)
    expect(pad(td1)).toBe('2em')
    expect(pad(td2)).toBe('')
  })

  // ── 3. 複数行・混在 ───────────────────────────────────────────────────────
  it('選択がかかっている段落は全部字下げされる', () => {
    const ed = makeEditor('<p>a</p><p>b</p><p>c</p>')
    const [a, b, c] = ed.wysiwyg.querySelectorAll('p')
    selectRange(a, b)
    tab(ed)
    expect([pad(a), pad(b), pad(c)]).toEqual(['2em', '2em', ''])
  })

  it('枠をまたぐ選択でも枠は動かず、中の行だけが動く', () => {
    const ed = makeEditor('<p>a</p><div class="kuro-callout"><p>b</p></div>')
    const frame = ed.wysiwyg.querySelector('.kuro-callout')
    const [a, b] = ed.wysiwyg.querySelectorAll('p')
    selectRange(a, b)
    tab(ed)
    expect([pad(a), pad(b)]).toEqual(['2em', '2em'])
    expect(pad(frame)).toBe('')
  })

  it('リスト項目と段落が混ざった選択は、項目は入れ子・段落は字下げ', () => {
    const ed = makeEditor('<ul><li>one</li><li>two</li></ul><p>tail</p>')
    const [li1, li2] = ed.wysiwyg.querySelectorAll('li')
    const p = ed.wysiwyg.querySelector('p')
    selectRange(li2, p)
    tab(ed)
    // 2 つ目の項目は 1 つ目の子リストへ、段落は padding で字下げ
    expect(li1.querySelector('ul > li')).toBe(li2)
    expect(pad(li2)).toBe('')
    expect(pad(p)).toBe('2em')
  })

  it('リスト項目には padding-left を付けない', () => {
    const ed = makeEditor('<ul><li>one</li><li>two</li></ul>')
    const [, li2] = ed.wysiwyg.querySelectorAll('li')
    caretIn(li2)
    tab(ed)
    expect(pad(li2)).toBe('')
  })

  // ── 4. 旧版の後始末 ───────────────────────────────────────────────────────
  it('枠に残った旧版の字下げは読込み時に落とす（UI から外せなくなるため）', () => {
    const ed = makeEditor(
      '<div class="kuro-callout kuro-callout--tip" style="padding-left: 2em;">' +
      '<p style="padding-left: 2em;">hello</p></div>')
    expect(pad(ed.wysiwyg.querySelector('.kuro-callout'))).toBe('')
    expect(pad(ed.wysiwyg.querySelector('p'))).toBe('2em')  // 行の字下げは残す
    expect(ed.isDirty()).toBe(false)  // 開いただけで保存ボタンを点けない
  })

  // ── 5. 行頭 Backspace のアウトデント ──────────────────────────────────────
  it('行頭 Backspace は字下げ中の行を 1 段戻す', () => {
    const ed = makeEditor('<p>hello</p>')
    const p = ed.wysiwyg.querySelector('p')
    caretIn(p)
    tab(ed)
    tab(ed)
    expect(pad(p)).toBe('4em')

    const sel = window.getSelection()
    const r = document.createRange()
    r.setStart(p.firstChild, 0)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)
    ed.wysiwyg.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Backspace', bubbles: true, cancelable: true,
    }))
    expect(pad(p)).toBe('2em')
  })
})
