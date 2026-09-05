/**
 * **浮いている画像の下へ、囲みを潜らせない**（v2.39.3）。
 *
 * ふつうのブロックは float の下に敷かれ、縮むのは行だけなので、囲みの背景と
 * 枠線が画像と重なる。コード(`overflow-x:auto`)と角丸ボックス(`overflow:hidden`)は
 * **たまたま** BFC になっていたから縮んでいた —— コールアウトと引用にだけ無く、
 * そこだけ重なっていた。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/content.css'), 'utf8')

/** セレクタの宣言ブロックを取り出す。 */
function block(selector) {
  const at = css.indexOf(selector + ' {')
  expect(at, `${selector} が無い`).toBeGreaterThan(-1)
  return css.slice(at, css.indexOf('}', at))
}

describe('枠は float の隣で縮む', () => {
  for (const sel of ['.kuro-content .kuro-callout', '.kuro-content blockquote']) {
    it(`${sel} は自前の整形文脈を持つ`, () => {
      const b = block(sel)
      // BFC を作る書き方はいくつかあるが、**切り取らない** flow-root を使う。
      expect(b).toMatch(/display:\s*flow-root/)
    })
  }

  it('コードと角丸ボックスは今までどおり（既にBFC）', () => {
    expect(block('.kuro-content pre')).toMatch(/overflow-x:\s*auto/)
    expect(css).toMatch(/overflow:\s*hidden;\s*\/\* clearfix for floated children \*\//)
  })
})
