/**
 * チェックリスト（記号リストのマーカー ☑ = ul.kuro-ul-check）。
 *
 * 見張っているのはこの 4 点:
 *   1. 状態は <li data-checked="1"> の【属性】で持つ ＝ getContent() で往復する
 *      （<input type="checkbox"> の checked はプロパティなので保存で消える）
 *   2. Enter で生まれた空項目にチェックが伝染しない・本文のある項目のチェックは
 *      絶対に外れない
 *   3. マーカー系クラスは排他（☑ ⇔ ● の切替）
 *   4. 閲覧モードではトグルしない（チェックは本文の変更）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

/** キャレットを node の末尾へ。 */
function caretAtEnd(node) {
  const sel = window.getSelection()
  const r = document.createRange()
  r.selectNodeContents(node)
  r.collapse(false)
  sel.removeAllRanges()
  sel.addRange(r)
  return r
}

/** happy-dom は矩形を返さないので、マーカー判定用に <li> を採寸可能にする。 */
function measurable(li, { left = 0, top = 0, width = 300, height = 26, pad = '32px' } = {}) {
  li.style.paddingLeft = pad
  li.style.lineHeight = '26px'
  li.getBoundingClientRect = () => ({
    left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
  })
  return li
}

const CHECKLIST = '<ul class="kuro-ul-check"><li>牛乳を買う</li><li data-checked="1">卵を買う</li></ul>'

describe('チェックリスト', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  // ── 1. 保存形式 ───────────────────────────────────────────────────────────
  it('data-checked は getContent() で往復する', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const html = ed.getContent()
    expect(html).toContain('class="kuro-ul-check"')
    expect(html).toContain('data-checked="1"')
    // 往復させても失われない
    const ed2 = new KuroEditor(makeMount(), { initialContent: html })
    expect(ed2.wysiwyg.querySelectorAll('li[data-checked="1"]').length).toBe(1)
  })

  it('公開用 HTML でもチェック状態は残る（内部 id だけが落ちる）', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST, blockIds: true })
    const build = ed.getBuildImage()
    expect(build).toContain('data-checked="1"')
    expect(build).not.toContain('data-bid=')
  })

  // ── 2. トグル ─────────────────────────────────────────────────────────────
  it('_toggleCheckItem で属性が付く / 外れる', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const [a, b] = ed.wysiwyg.querySelectorAll('li')
    ed._toggleCheckItem(a)
    expect(a.getAttribute('data-checked')).toBe('1')
    ed._toggleCheckItem(b)
    expect(b.hasAttribute('data-checked')).toBe(false)
  })

  it('箱をタップするとトグルし、本文をタップしても何も起きない', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const li = measurable(ed.wysiwyg.querySelector('li'))
    const tap = (x, y) => li.dispatchEvent(
      new window.PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, cancelable: true }))

    tap(10, 12)                       // 箱の中（padding-left 32px の内側）
    expect(li.getAttribute('data-checked')).toBe('1')
    tap(10, 12)
    expect(li.hasAttribute('data-checked')).toBe(false)

    tap(120, 12)                      // 本文の上 → キャレットが立つだけ
    expect(li.hasAttribute('data-checked')).toBe(false)
  })

  it('2 行目の行頭ではトグルしない（箱は 1 行目にしか無い）', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const li = measurable(ed.wysiwyg.querySelector('li'), { height: 52 })
    li.dispatchEvent(new window.PointerEvent('pointerdown',
      { clientX: 10, clientY: 40, bubbles: true, cancelable: true }))
    expect(li.hasAttribute('data-checked')).toBe(false)
  })

  it('入れ子の普通の箇条書きは対象外（外側の項目を誤ってトグルしない）', () => {
    const ed = new KuroEditor(makeMount(), {
      initialContent: '<ul class="kuro-ul-check"><li>親<ul><li>子</li></ul></li></ul>',
    })
    const inner = ed.wysiwyg.querySelector('ul ul li')
    expect(ed._checklistItemAt(inner)).toBe(null)
  })

  it('トグルは保存ボタンを点灯させ、undo で戻る', async () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    expect(ed.isDirty()).toBe(false)
    const li = ed.wysiwyg.querySelector('li')
    ed._toggleCheckItem(li)
    await new Promise(r => setTimeout(r, 0))    // MutationObserver は microtask
    expect(ed.isDirty()).toBe(true)
  })

  // ── 3. 閲覧モード ─────────────────────────────────────────────────────────
  it('閲覧モードでは箱を押してもトグルしない', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    ed.setMode('view')
    const li = measurable(ed.wysiwyg.querySelector('li'))
    li.dispatchEvent(new window.PointerEvent('pointerdown',
      { clientX: 10, clientY: 12, bubbles: true, cancelable: true }))
    expect(li.hasAttribute('data-checked')).toBe(false)
  })

  // ── 4. Enter でのチェック伝染 ─────────────────────────────────────────────
  it('チェック済み項目の末尾で Enter → 新しい項目は未チェック', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const ul = ed.wysiwyg.querySelector('ul')
    const checked = ul.querySelector('li[data-checked="1"]')
    // ブラウザは <li> を属性ごと複製する。その状況を作って input を流す。
    const born = checked.cloneNode(false)       // data-checked 付きの空 <li>
    ul.appendChild(born)
    caretAtEnd(born)
    ed._resetSplitCheckItems({ inputType: 'insertParagraph' })
    expect(born.hasAttribute('data-checked')).toBe(false)
    expect(checked.getAttribute('data-checked')).toBe('1')   // 元の項目は無傷
  })

  it('チェック済み項目の先頭で Enter → 元の項目のチェックは外れない', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const ul = ed.wysiwyg.querySelector('ul')
    const checked = ul.querySelector('li[data-checked="1"]')
    // 先頭 Enter ではブラウザが空の <li> を【手前】に挿し、キャレットは元の項目に残る
    const born = checked.cloneNode(false)
    ul.insertBefore(born, checked)
    caretAtEnd(checked)
    ed._resetSplitCheckItems({ inputType: 'insertParagraph' })
    expect(checked.getAttribute('data-checked')).toBe('1')
    expect(born.hasAttribute('data-checked')).toBe(false)
  })

  it('画像だけの項目は「空」ではない（改行の巻き添えでチェックが外れない）', () => {
    const ed = new KuroEditor(makeMount(), {
      initialContent: '<ul class="kuro-ul-check"><li data-checked="1"><img src="x.png"></li><li>a</li></ul>',
    })
    const ul = ed.wysiwyg.querySelector('ul')
    const imgItem = ul.querySelector('li[data-checked="1"]')
    const born = imgItem.cloneNode(false)
    ul.appendChild(born)
    caretAtEnd(born)
    ed._resetSplitCheckItems({ inputType: 'insertParagraph' })
    expect(imgItem.getAttribute('data-checked')).toBe('1')
    expect(born.hasAttribute('data-checked')).toBe(false)
  })

  it('Shift+Enter（改行）は何もしない', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const ul = ed.wysiwyg.querySelector('ul')
    const born = ul.querySelector('li[data-checked="1"]').cloneNode(false)
    ul.appendChild(born)
    caretAtEnd(born)
    ed._resetSplitCheckItems({ inputType: 'insertLineBreak' })
    expect(born.getAttribute('data-checked')).toBe('1')
  })

  // ── 5. マーカーの切替 ─────────────────────────────────────────────────────
  it('☑ は記号リストのマーカーの選択肢として出る', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>x</p>' })
    const btn = ed.popm.el.querySelector('[data-ul-style="kuro-ul-check"]')
    expect(btn).toBeTruthy()
  })

  it('● ⇔ ☑ は排他（マーカークラスは 1 つだけ残る）', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<ul class="kuro-ul-star"><li>a</li></ul>' })
    const ul = ed.wysiwyg.querySelector('ul')
    caretAtEnd(ul.querySelector('li'))

    ed._applyULStyle('kuro-ul-check')
    expect(ul.className).toBe('kuro-ul-check')

    ed._applyULStyle('kuro-ul-disc')
    expect(ul.className).toBe('kuro-ul-disc')
  })

  it('☑ から他のマーカーへ移してもチェック状態は捨てない（戻せば復活する）', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: CHECKLIST })
    const ul = ed.wysiwyg.querySelector('ul')
    caretAtEnd(ul.querySelector('li'))
    ed._applyULStyle('kuro-ul-disc')
    expect(ul.querySelector('li[data-checked="1"]')).toBeTruthy()
    ed._applyULStyle('kuro-ul-check')
    expect(ul.querySelector('li[data-checked="1"]')).toBeTruthy()
  })

  // ── 6. 行頭記法 ───────────────────────────────────────────────────────────
  it('段落の行頭 "[] " でチェックリストになる', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>[] </p>' })
    const p = ed.wysiwyg.querySelector('p')
    const t = p.firstChild
    const sel = window.getSelection()
    const r = document.createRange()
    r.setStart(t, 3); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)

    ed._detectAutoList({ inputType: 'insertText' })
    const ul = ed.wysiwyg.querySelector('ul.kuro-ul-check')
    expect(ul).toBeTruthy()
    expect(ul.querySelector('li').textContent).toBe('')
  })

  it('箇条書きの項目の中で "[x] " と打つとチェック済みで始まる', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<ul><li>[x] </li></ul>' })
    const li = ed.wysiwyg.querySelector('li')
    const t = li.firstChild
    const sel = window.getSelection()
    const r = document.createRange()
    r.setStart(t, 4); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)

    ed._detectAutoList({ inputType: 'insertText' })
    const ul = ed.wysiwyg.querySelector('ul')
    expect(ul.classList.contains('kuro-ul-check')).toBe(true)
    expect(ul.querySelector('li').getAttribute('data-checked')).toBe('1')
  })
})
