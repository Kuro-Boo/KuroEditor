/**
 * **OS の選択メニューと重ならない**（v2.39.0 / v2.39.3）。
 *
 * Android の floating toolbar も iOS の編集メニューも「選択のすぐ上」に出る。
 * popm はその帯ぶん上へ逃げるが、**上に入らないときは下へ回る** ——
 * 上に入らないということは OS 側も下へ回っているということで、
 * 下でも帯ぶん空けないと逃げた先で正面から重なる。
 *
 * 位置そのものは happy-dom では測れない（offsetHeight が 0）。だから
 * **計算に帯が入っていること**と、**背が変わったら置き直すこと**を見張る。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { nativeSelectionBarClearance } from '../src/editor.js'

const src = readFileSync(join(process.cwd(), 'src/editor.js'), 'utf8')

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120'

describe('OS の選択メニューを避ける幅', () => {
  it('Android は 64', () => expect(nativeSelectionBarClearance(ANDROID)).toBe(64))
  it('iOS は 58 —— 0 に戻さない（iOS 16 以降は上に出るのが既定）', () => {
    expect(nativeSelectionBarClearance(IOS)).toBe(58)
  })
  it('マウスのデスクトップは 0（OS のメニューが出ない）', () => {
    expect(nativeSelectionBarClearance(MAC)).toBe(0)
  })
})

describe('下へ回すときも帯ぶん空ける', () => {
  it('下側にも帯を足している', () => {
    expect(src).toContain('top = rect.bottom + 6 + BAR')
  })

  it('追加枠の開け閉めで置き直す（背が変わるため）', () => {
    const missing = []
    for (const name of ['_showColors', '_hideColors', '_showSizes', '_hideSizes',
                        '_showRubyPanel', '_hideRubyPanel', '_showCalloutPanel',
                        '_showFontFamily', '_hideFontFamily',
                        '_showListStyles', '_hideListStyles',
                        '_showULStyles', '_hideULStyles',
                        '_showLineHeights', '_hideLineHeights']) {
      const at = src.indexOf(`  ${name}()`)
      if (at < 0) { missing.push(`${name} が無い`); continue }
      // 定義の直後 900 文字に置き直しの呼び出しがあること。
      if (!src.slice(at, at + 900).includes('_reflow()')) missing.push(name)
    }
    expect(missing, '背が変わるのに置き直していない').toEqual([])
  })

  it('置き直しは、控えた選択でも効く（読みの欄へ焦点が移っている）', () => {
    const at = src.indexOf('  _reflow() {')
    expect(at).toBeGreaterThan(0)
    expect(src.slice(at, at + 800)).toContain('_activeRange')
  })
})
