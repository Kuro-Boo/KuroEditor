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
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KuroEditor } from '../src/editor.js'

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

  it('マニュアルは通常カラー（ライト）で、ロゴは公式の 2 色構成', () => {
    expect(guide).toContain('color-scheme: light')
    expect(guide).toContain('kuroeditor_logo_plus_mark.png')  // 黒兎マーク + Kuro/Editor
    expect(guide).toContain('assets/favicon.svg')             // タブのアイコンも共通のもの
  })
})
