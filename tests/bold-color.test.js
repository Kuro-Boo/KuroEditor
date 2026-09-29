/**
 * 太字は周りの色を継ぐ（content.css）。
 *
 * 公開ページのテンプレート（Tailwind Typography）は `.prose :where(strong)` に
 * `color: var(--tw-prose-bold)` を当てるので、放っておくと色付きの枠・文字の中で
 * 太字にした所だけ黒くなる（編集画面では継いで見える＝WYSIWYG が崩れる）。
 *
 * ⚠ 勝ち負け（詳細度）は happy-dom では測れない。ここではルールが消えていないことを
 *   見張り、`.prose` に勝つことは実ブラウザで確かめる。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '..', 'src', 'content.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** セレクタに `sel` を含むルールの宣言部をすべて返す */
function declsFor(sel) {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').map((s) => s.trim()).includes(sel))
    .map(([, , body]) => body)
}

describe('太字の色', () => {
  for (const sel of ['.kuro-content strong', '.kuro-content b']) {
    it(`${sel} は color: inherit（テンプレートの太字色に塗り替えさせない）`, () => {
      expect(declsFor(sel).some((d) => /color\s*:\s*inherit/.test(d))).toBe(true)
    })
  }
})
