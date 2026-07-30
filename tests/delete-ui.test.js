/**
 * 「削除」ボタンの表現がエディタ全体で統一されているかの見張り番。
 *
 * 決めごと（editor.css の .kuro-del-btn のコメントが正本）:
 *   - ブロックを消す操作は【SVG ゴミ箱 + 「削除」】。絵文字は使わない
 *     （フォント差で大きさ・ベースラインがずれる）。
 *   - アイコンだけの列（テーブルメニュー / リンク編集ポップアップ /
 *     コードブロックの chrome）は例外的にアイコン単独のまま。
 *   - 「削除」の語はそのブロックを消すとき専用。リンクを外す等は別の語にする。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

let ed
beforeEach(() => {
  document.body.innerHTML = ''
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  ed = new KuroEditor(mount, { recipeUi: true })
})
afterEach(() => { try { ed.destroy() } catch { /* 破棄済み */ } })

/** 文字付きの削除ボタン（角丸ボックス / イメージ / レシピ） */
const labeled = () => [
  ed.roundboxMenu.el.querySelector('.kuro-roundbox-menu__del'),
  ed.imageMenu.el.querySelector('.kuro-image-menu__btn--delete'),
  ed.recipeDialog._deleteBtn,
]

describe('削除ボタンの表現', () => {
  it('文字を置くものは【SVG アイコン + 「削除」】で揃っている', () => {
    for (const btn of labeled()) {
      expect(btn, 'ボタンが見つからない').not.toBeNull()
      expect(btn.querySelector('svg'), btn.className).not.toBeNull()
      expect(btn.textContent.trim(), btn.className).toBe('削除')
      expect(btn.classList.contains('kuro-del-btn'), btn.className).toBe(true)
    }
  })

  it('絵文字のゴミ箱（🗑）は使わない', () => {
    for (const btn of labeled()) {
      expect(btn.textContent, btn.className).not.toContain('🗑')
    }
    // ×（かつての角丸ボックス）も残っていない
    expect(labeled()[0].textContent).not.toContain('×')
  })

  it('アイコン列（リンク編集ポップアップ）はアイコン単独のまま', () => {
    const btn = ed.linkEditPopup.el.querySelector('.kuro-link-edit__delete')
    expect(btn.querySelector('svg')).not.toBeNull()
    expect(btn.textContent.trim()).toBe('')
    expect(btn.getAttribute('title')).toContain('削除')   // 何が消えるかは tooltip で示す
  })

  it('「削除」の語はブロック削除専用（リンクを外すのは別の語）', () => {
    const texts = [...ed.imageMenu.el.querySelectorAll('button')]
      .map((b) => b.textContent.trim())
    expect(texts).toContain('リンクを解除')
    // イメージメニュー内で「削除」と読めるのはメディア削除の 1 つだけ
    expect(texts.filter((t) => t === '削除').length).toBe(1)
  })
})
