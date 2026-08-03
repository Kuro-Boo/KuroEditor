/**
 * リストのマーカー選択パネル（番号リスト / 記号リスト）のホバー説明。
 *
 * 規約: title は記号の【説明】であること。ボタンの中に既に見えている「★」を
 * title でもう一度「★」と言っても情報が増えず、ホバーする意味がない。
 * 「記号リスト（黒星）」のように【何になるボタンなのか】を出す。
 * （仕様書 #spec-ul-title が正本）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return new KuroEditor(el, { initialContent: '<p>x</p>' })
}

describe('リストマーカーのホバー説明', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  for (const [name, attr, count] of [
    ['記号リスト（UL）', 'data-ul-style', 14],   // 解除 + 記号 12 + ☑
    ['番号リスト（OL）', 'data-ol-style', 8],    // 解除 + 7 種
  ]) {
    it(`${name}: 全ボタンに説明があり、記号の写しではない`, () => {
      const ed = makeEditor()
      const btns = [...ed.popm.el.querySelectorAll(`[${attr}]`)]
      expect(btns.length).toBe(count)
      for (const b of btns) {
        const title = b.getAttribute('title') || ''
        const face  = b.textContent.trim()
        expect(title).not.toBe('')
        expect(title).not.toBe(face)                  // 見た目の写しは説明ではない
        expect(title.length).toBeGreaterThan(face.length)
      }
    })
  }

  it('説明は「何になるボタンか」から始まる', () => {
    const ed = makeEditor()
    const title = (sel) => ed.popm.el.querySelector(sel).getAttribute('title')
    expect(title('[data-ul-style="kuro-ul-star"]')).toBe('記号リスト（黒星）')
    expect(title('[data-ol-style="kuro-list-paren-kata"]')).toBe('番号リスト（括弧付きカタカナ）')
    // ☑ だけは「マーカーが変わる」ではなく「振る舞いが変わる」ので別の説明
    expect(title('[data-ul-style="kuro-ul-check"]')).toBe('チェックボックス（[]+スペースでも作れる）')
  })

  it('半角／全角の違いが結果に出る記号は、それも書く', () => {
    const ed = makeEditor()
    const title = (v) => ed.popm.el.querySelector(`[data-ul-style="${v}"]`).getAttribute('title')
    expect(title('kuro-ul-dash')).toContain('半角')
    expect(title('kuro-ul-hash')).toContain('半角')
    expect(title('kuro-ul-asterisk')).toContain('半角')
    expect(title('kuro-ul-arrow')).toContain('半角')
  })
})
