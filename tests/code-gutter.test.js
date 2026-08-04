/**
 * コードブロックの行番号は【公開ページにも出す】（WYSIWYG は絶対）。
 *
 * 公開側の保存形式は <pre><code> の素のテキストなので、行番号を出す手掛かりを
 * 保存時に焼き込む（data-gutter="1\n2\n…"）。content.css がそれを ::before に出す。
 *
 * 見張っているのはこの 3 点:
 *   1. 行数と data-gutter が一致する（保存のたびに数え直される）
 *   2. コード本文は data-gutter に汚染されない＝往復しても壊れない
 *   3. 番号は【疑似要素】で出す ＝ 要素にしない（コピーに番号が付いてこない）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

const CODE = 'function hello(name) {\n  return `こんにちは、${name}`\n}'

describe('コードブロックの行番号', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('保存した HTML の <pre> に行数ぶんの data-gutter が付く', () => {
    const ed = makeEditor(`<pre class="kuro-code"><code>${CODE}</code></pre>`)
    const out = ed.getContent()
    expect(out).toContain('data-gutter="1\n2\n3"')
  })

  it('行を増やせば番号も増える（保存のたびに数え直す）', () => {
    const ed = makeEditor(`<pre class="kuro-code"><code>${CODE}</code></pre>`)
    const ta = ed.wysiwyg.querySelector('.kuro-code__area')
    ta.value = CODE + '\n\nhello("黒兎")'
    expect(ed.getContent()).toContain('data-gutter="1\n2\n3\n4\n5"')
  })

  it('空のコードブロックでも 1 行として付く', () => {
    const ed = makeEditor('<pre class="kuro-code"><code></code></pre>')
    expect(ed.getContent()).toContain('data-gutter="1"')
  })

  it('往復してもコード本文は変わらない（番号は本文に混ざらない）', () => {
    const ed = makeEditor(`<pre class="kuro-code"><code>${CODE}</code></pre>`)
    const once = ed.getContent()
    const ed2 = makeEditor(once)
    expect(ed2.wysiwyg.querySelector('.kuro-code__area').value).toBe(CODE)
    // 2 度目の保存でも増殖しない
    expect(ed2.getContent()).toBe(once)
  })

  it('公開用 HTML（getBuildImage）にも残る', () => {
    const ed = makeEditor(`<pre class="kuro-code"><code>${CODE}</code></pre>`)
    expect(ed.getBuildImage()).toContain('data-gutter=')
  })

  it('content.css は番号を ::before で出す（要素にしない＝コピーに乗らない）', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content.css'), 'utf8')
    expect(css).toMatch(/pre\[data-gutter\]::before\s*\{[^}]*content:\s*attr\(data-gutter\)/)
    expect(css).toMatch(/pre\[data-gutter\]::before\s*\{[^}]*user-select:\s*none/)
    // 横スクロールは <code> 側。<pre> 側で流すと番号まで一緒に流れて消える
    expect(css).toMatch(/pre\[data-gutter\] > code\s*\{[^}]*overflow-x:\s*auto/)
  })
})
