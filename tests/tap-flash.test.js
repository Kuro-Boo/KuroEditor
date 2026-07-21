/**
 * タップ/クリックのフラッシュ・フィードバック。
 *
 * スマホでは押したボタンが指に隠れて「どこを押したか」分かりづらい。押下時に
 * 対象ボタンの領域を一瞬フラッシュ（.kuro-tap-flash を付与）して、押した対象を
 * 明確にする（マウスでも有効）。委譲リスナ（document の pointerdown・capture）で
 * chrome・浮遊メニュー横断の全 <button> に一括適用する。
 *   - 対象は KuroEditor の <button>（kuro- クラスを持つもの）のみ。
 *   - 本文（typing 領域）や非 button、ホストページの button には付けない。
 *   - disabled ボタン（閲覧モードの挿入系など）には付けない。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

let ed
function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}
const pointerdown = (target) =>
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }))

describe('tap-flash — 押下でボタン領域を一瞬フラッシュ', () => {
  beforeEach(() => { document.body.innerHTML = '' })
  afterEach(() => { ed?.destroy?.(); ed = null; document.body.innerHTML = '' })

  it('chrome のボタン押下で .kuro-tap-flash が付く', () => {
    ed = new KuroEditor(makeMount())
    const btn = ed.mmenu.querySelector('button')
    expect(btn).toBeTruthy()
    expect(btn.classList.contains('kuro-tap-flash')).toBe(false)
    pointerdown(btn)
    expect(btn.classList.contains('kuro-tap-flash')).toBe(true)
  })

  it('ボタン内のアイコン(子要素)を押しても、フラッシュはボタン領域に付く', () => {
    ed = new KuroEditor(makeMount())
    const btn = ed.mmenu.querySelector('button')
    const inner = btn.querySelector('svg, span') || btn.firstChild || btn
    pointerdown(inner)
    expect(btn.classList.contains('kuro-tap-flash')).toBe(true)
  })

  it('本文(typing 領域)を押してもフラッシュは付かない', () => {
    ed = new KuroEditor(makeMount())
    pointerdown(ed.wysiwyg)
    expect(ed.wysiwyg.classList.contains('kuro-tap-flash')).toBe(false)
  })

  it('disabled ボタンにはフラッシュを付けない', () => {
    ed = new KuroEditor(makeMount())
    const btn = ed.mmenu.querySelector('button')
    btn.disabled = true
    pointerdown(btn)
    expect(btn.classList.contains('kuro-tap-flash')).toBe(false)
  })

  it('ホストページの button(kuro- クラス無し)には付けない', () => {
    ed = new KuroEditor(makeMount())
    const host = document.createElement('button')
    document.body.appendChild(host)
    pointerdown(host)
    expect(host.classList.contains('kuro-tap-flash')).toBe(false)
  })

  it('destroy 後は pointerdown リスナが外れる(フラッシュしない)', () => {
    ed = new KuroEditor(makeMount())
    const btn = ed.mmenu.querySelector('button')
    ed.destroy()
    ed = null
    pointerdown(btn)
    expect(btn.classList.contains('kuro-tap-flash')).toBe(false)
  })
})
