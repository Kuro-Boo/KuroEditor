/**
 * 操作マニュアル（public/guide/index.html）に埋めたボタンの見本が、
 * 【エディタ本体の実物】と一致し続けているか。
 *
 * マニュアルは「画面と同じボタンレイアウト」を見せるために、ツールバーの
 * アイコンをページ内に直接置いている。似せて描き直したものではなく本体の
 * markup そのものなので、本体のアイコンを変えたらマニュアルも直す必要がある。
 * 放っておくと「マニュアルにしか無いボタン」が読者を迷わせるため、ここで見張る。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KuroEditor } from '../src/editor.js'
import { buildRecipeCardHtml, decodeRecipe } from '../src/recipe.js'

/** 属性順・空白の揺れを均して比べる（innerHTML はブラウザ実装で整形が違う） */
const norm = (html) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim()

describe('マニュアルのボタン見本', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const guide = readFileSync(join(here, '..', 'public', 'guide', 'index.html'), 'utf8')

  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const ed = new KuroEditor(mount, { recipeUi: true })

  const buttons = {
    ...ed._tabActionBtns,          // 絵文字 / 表 / メディア / コード / 水平線 / 角丸 / リンク / レシピ
    undo: ed._tabUndoBtn,
    redo: ed._tabRedoBtn,
    help: ed.tabHelpBtn,
    toc:  ed.tabTocBtn,
    tabWysiwyg: ed.tabWysiwyg,
    tabView:    ed.tabView,
    tabSource:  ed.tabSource,
  }

  for (const [name, btn] of Object.entries(buttons)) {
    it(`${name} のアイコンが本体と同じ`, () => {
      expect(norm(guide)).toContain(norm(btn.innerHTML))
    })
  }

  // 「実際の表示」の例は、本物の公開ページ用スタイルで描く（似せて書き直さない）。
  // クラス名が変わると例だけ素の HTML に戻って静かに嘘になるので、ここで見張る。
  it('表示例は kuro-content.css を読んで描いている', () => {
    expect(guide).toContain('href="../kuro-content.css"')
    // 自前の <style> より後に読むこと（どちらも unlayered ＝ 後勝ち）
    expect(guide.indexOf('href="../kuro-content.css"'))
      .toBeGreaterThan(guide.indexOf('</style>'))
  })

  it('表示例で使っているクラスはすべて content.css に実在する', () => {
    const content = readFileSync(join(here, '..', 'src', 'content.css'), 'utf8')
    const used = new Set()
    for (const block of guide.match(/<div class="demo[^]*?<\/div>\s*<\/div>/g) ?? []) {
      for (const attr of block.match(/class="[^"]*"/g) ?? []) {
        for (const cls of attr.slice(7, -1).split(/\s+/)) {
          // kuro-recipe__* はカードの markup ごと下のテストで照合するので除く
          // （grid の子など、CSS を持たない構造上のクラスも含まれるため）
          if (cls.startsWith('kuro-') && cls !== 'kuro-content' &&
              !cls.startsWith('kuro-recipe__')) used.add(cls)
        }
      }
    }
    expect(used.size).toBeGreaterThan(5)   // 例が消えていないことの確認も兼ねる
    for (const cls of used) expect(content, `${cls} が content.css に無い`).toContain(cls)
  })

  it('レシピカードの例は、いまの生成器が吐く markup と同じ', () => {
    // data-recipe（＝カードの正本）を取り出して作り直し、丸ごと突き合わせる。
    // プレビューの構造が変わったらここで気づける。
    const card = guide.match(/<div data-kuro-block="recipe-card"[^]*?<\/div><\/div><\/div>/)?.[0]
    expect(card, 'マニュアルにレシピカードの例が無い').toBeTruthy()
    const data = card.match(/data-recipe="([^"]*)"/)[1]
    const layout = {
      width: card.match(/data-width="([^"]*)"/)[1],
      align: card.match(/data-align="([^"]*)"/)[1],
    }
    expect(norm(card)).toBe(norm(buildRecipeCardHtml(decodeRecipe(data), layout)))
  })

  // ポップアップ類は実物のスクリーンショット（build-scripts/capture-guide-shots.mjs）。
  // 貼り忘れ・パスのずれは「壊れた画像」として読者に見えるので、実在を確かめる。
  it('貼っているスクリーンショットは実在する', () => {
    const srcs = [...guide.matchAll(/<img src="\.\/(img\/[^"]+)"/g)].map((m) => m[1])
    expect(srcs.length).toBeGreaterThan(5)
    for (const rel of srcs) {
      expect(existsSync(join(here, '..', 'public', 'guide', rel)), `${rel} が無い`).toBe(true)
    }
  })

  it('マニュアルは通常カラー（ライト）で、ロゴは公式の 2 色構成', () => {
    expect(guide).toContain('color-scheme: light')
    expect(guide).toContain('kuroeditor_logo_plus_mark.png')  // 黒兎マーク + Kuro/Editor
    expect(guide).toContain('assets/favicon.svg')             // タブのアイコンも共通のもの
  })
})
