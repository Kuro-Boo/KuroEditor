/**
 * フローターの重なり順 (z-index) の回帰テスト
 *
 * happy-dom は CSS を適用しないため、src/editor.css を静的に解析して
 * 「どのフローターがどの層にいるか」を検証する。
 *
 * 層の設計 (下 → 上):
 *   キャンバス装飾 (テーブルの ＋/−/✋/枠線ボタン = kuro-table-inserter)
 *     < メニュー (TBL設定 kuro-table-menu / イメージメニュー kuro-image-menu)
 *     < ポップアップ (mmenu / popm / リンク編集 / 行メニュー / 絵文字 /
 *        メディアダイアログ / リンク確認)
 *
 * v2.18.6 まで kuro-table-inserter が z-55 で全ポップアップより上にあり、
 * TBL設定のカラーピッカーの上に ✋/− ボタンが描画されるバグがあった。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let css

beforeAll(() => {
  css = readFileSync(resolve(__dirname, '../src/editor.css'), 'utf8')
})

/**
 * セレクタのルール本文から z-index を読む。
 * 素の `z-index: N` と Tailwind の `@apply ... z-NN ...` の両方に対応。
 */
function zIndexOf(selector) {
  // セレクタ出現位置から最初の { ... } を取り出す
  const start = css.indexOf(selector)
  expect(start, `${selector} が editor.css に見つからない`).toBeGreaterThan(-1)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const body = css.slice(open + 1, close)

  const plain = body.match(/z-index:\s*(\d+)/)
  if (plain) return Number(plain[1])
  const tw = body.match(/(?:^|\s)z-(\d+)(?:\s|;|$)/)
  expect(tw, `${selector} に z-index 指定が無い`).not.toBeNull()
  return Number(tw[1])
}

describe('フローターの z-index 層', () => {
  it('テーブルのボタン群 (inserter) は TBL設定メニューより下', () => {
    expect(zIndexOf('.kuro-table-inserter')).toBeLessThan(zIndexOf('.kuro-table-menu'))
  })

  it('テーブルのボタン群 (inserter) はイメージメニューより下', () => {
    expect(zIndexOf('.kuro-table-inserter')).toBeLessThan(zIndexOf('.kuro-image-menu'))
  })

  it('テーブルのボタン群 (inserter) は全ポップアップより下', () => {
    const inserter = zIndexOf('.kuro-table-inserter')
    for (const sel of [
      '.kuro-mmenu',
      '.kuro-popm',
      '.kuro-link-edit',
      '.kuro-line-popm',
      '.kuro-emoji-panel',
      '.kuro-link-open',
      '.kuro-media-dialog',
    ]) {
      expect(inserter, `${sel} が inserter に隠されないこと`).toBeLessThan(zIndexOf(sel))
    }
  })

  it('メニュー層 (TBL設定 / イメージメニュー) はポップアップ層より下', () => {
    const popup = zIndexOf('.kuro-mmenu')
    expect(zIndexOf('.kuro-table-menu')).toBeLessThan(popup)
    expect(zIndexOf('.kuro-image-menu')).toBeLessThan(popup)
  })

  it('web フォント一覧は親の popm より上 (サブメニューなので)', () => {
    expect(zIndexOf('.kuro-popm__web-fonts')).toBeGreaterThan(zIndexOf('.kuro-popm'))
  })
})
