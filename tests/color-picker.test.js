/**
 * カラーピッカーの並び。
 *
 * プリセットもカスタムも【3×3 = 9 色を 1 ブロック】として並べ、幅が足りなければ
 * ブロック単位で折り返す（スマホでは行数が増える）。カスタム枠が 3 ブロックだと
 * 右側が大きく空いて「途中で切れた」ように見えるので 4 ブロック（36 色）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ColorPicker } from '../src/editor.js'

const make = () => new ColorPicker({ onPick: () => {} })

describe('カラーピッカー', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* noop */ } })

  it('カスタム枠は 4 ブロック × 9 = 36 スロット', () => {
    const el = make().el
    const custom = el.querySelector('.kuro-color-picker__custom')
    expect(custom.children.length).toBe(4)
    for (const block of custom.children) expect(block.children.length).toBe(9)
  })

  it('プリセットと同じ「1 ブロック = 3 列」で組む', () => {
    const el = make().el
    for (const block of el.querySelectorAll('.kuro-color-group')) {
      expect(block.className).toContain('kuro-color-group')
    }
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'editor.css'), 'utf8')
    expect(css).toMatch(/\.kuro-color-group\s*\{[^}]*grid-template-columns:\s*repeat\(3,/)
    // 幅が足りないときはブロック単位で折り返す（スマホ対応）
    expect(css).toMatch(/\.kuro-color-picker__custom\s*\{[^}]*flex-wrap/)
    expect(css).toMatch(/\.kuro-color-picker__groups\s*\{[^}]*flex-wrap/)
  })

  it('保存済みのカスタム色は先頭から埋まり、残りは空スロット', () => {
    localStorage.setItem('kuro-custom-colors', JSON.stringify(['#ff0000', '#00ff00']))
    const el = make().el
    const custom = el.querySelector('.kuro-color-picker__custom')
    const first = custom.children[0]
    expect(first.children[0].getAttribute('style')).toContain('#ff0000')
    expect(first.children[1].getAttribute('style')).toContain('#00ff00')
    expect(first.children[2].className).toContain('kuro-color-slot--empty')
    // 空スロットは 36 - 2
    expect(el.querySelectorAll('.kuro-color-slot--empty').length).toBe(34)
  })

  it('保存できる色数は枠と同じ 36 色まで', () => {
    const many = Array.from({ length: 50 }, (_, i) => `#0000${(i % 10)}${(i % 10)}`)
    localStorage.setItem('kuro-custom-colors', JSON.stringify(many))
    const el = make().el
    expect(el.querySelectorAll('.kuro-color-picker__custom .kuro-color-swatch').length)
      .toBeLessThanOrEqual(36)
  })
})
