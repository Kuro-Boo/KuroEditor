/**
 * 番号付きリストの「開始番号」（マーカーのサブパネル）。
 *
 * 説明の段落を挟んでリストを分けると、後ろのリストは必ず 1 から始まる。
 * 続きの番号にしたいときのための入力で、実体は <ol start="N">。
 *
 * 見張っているのはこの 4 点:
 *   1. 実体は標準の start 属性 ＝ 保存 HTML にも公開ページにも効く
 *   2. 1（既定）は属性を外す — 意味の無い start="1" を本文に残さない
 *   3. リストの中にいるときだけ出す
 *   4. 入力中は値を横から書き戻さない（打っている数字を壊さない）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** キャレットを node の中身の末尾へ置き、popm の状態を更新する */
function caretIn(ed, node) {
  const r = document.createRange()
  r.selectNodeContents(node)
  r.collapse(false)
  const s = window.getSelection()
  s.removeAllRanges(); s.addRange(r)
  ed.popm._activeRange = r.cloneRange()
  ed.popm._updateListStyleLabel()
}

const input = (ed) => ed.popm._olStartInput
const wrap  = (ed) => ed.popm._olStartWrap

describe('番号リストの開始番号', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('入力した番号が <ol start> になる', () => {
    const ed = makeEditor('<ol class="kuro-list-decimal"><li>う</li></ol>')
    caretIn(ed, ed.wysiwyg.querySelector('li'))
    input(ed).value = '3'
    input(ed).dispatchEvent(new Event('input', { bubbles: true }))
    expect(ed.wysiwyg.querySelector('ol').getAttribute('start')).toBe('3')
    // 保存 HTML にも残る（公開ページでもそのまま効く標準属性）
    expect(ed.getContent()).toContain('start="3"')
    expect(ed.getBuildImage()).toContain('start="3"')
  })

  it('1 に戻すと属性ごと消える', () => {
    const ed = makeEditor('<ol class="kuro-list-decimal" start="5"><li>あ</li></ol>')
    caretIn(ed, ed.wysiwyg.querySelector('li'))
    expect(input(ed).value).toBe('5')          // 既存の値を拾って出す
    input(ed).value = '1'
    input(ed).dispatchEvent(new Event('input', { bubbles: true }))
    expect(ed.wysiwyg.querySelector('ol').hasAttribute('start')).toBe(false)
    expect(ed.getContent()).not.toContain('start=')
  })

  it('数字でない入力では属性を付けない', () => {
    const ed = makeEditor('<ol class="kuro-list-decimal"><li>あ</li></ol>')
    caretIn(ed, ed.wysiwyg.querySelector('li'))
    input(ed).value = ''
    input(ed).dispatchEvent(new Event('input', { bubbles: true }))
    expect(ed.wysiwyg.querySelector('ol').hasAttribute('start')).toBe(false)
  })

  it('リストの外では出さない', () => {
    const ed = makeEditor('<p>ただの段落</p><ol class="kuro-list-decimal"><li>あ</li></ol>')
    caretIn(ed, ed.wysiwyg.querySelector('li'))
    expect(wrap(ed).style.display).toBe('')
    caretIn(ed, ed.wysiwyg.querySelector('p'))
    expect(wrap(ed).style.display).toBe('none')
  })

  it('入れ子の子リストにも個別に効く（親は変わらない）', () => {
    const ed = makeEditor(
      '<ol class="kuro-list-decimal"><li>親' +
      '<ol class="kuro-list-decimal"><li id="c">子</li></ol></li></ol>')
    caretIn(ed, ed.wysiwyg.querySelector('#c'))
    input(ed).value = '4'
    input(ed).dispatchEvent(new Event('input', { bubbles: true }))
    const [parent, child] = ed.wysiwyg.querySelectorAll('ol')
    expect(child.getAttribute('start')).toBe('4')
    expect(parent.hasAttribute('start')).toBe(false)
  })
})
