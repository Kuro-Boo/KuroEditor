/**
 * 公開ページ用のコピーボタン（src/kuro-code-copy.js）。
 *
 * 編集画面のコードブロックには 📋 があるので、公開ページにも同じものが要る
 * （見たままが公開される、が原則）。ただしコピーはクリック＝ JS が要るため、
 * 保存 HTML には入れず【ホストが読み込んだときだけ】後付けする。
 *
 * 見張っているのはこの 4 点:
 *   1. <pre data-gutter> にだけ付く（保存形式は変えない）
 *   2. 何度呼んでも二重に付かない（本文を差し替えるホストが呼び直せる）
 *   3. コピーされるのは <code> のテキスト＝行番号は混ざらない
 *   4. clipboard が使えない環境ではボタンを出さない（押せないボタンを見せない）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const SAVED = '<div class="kuro-content"><pre data-gutter="1\n2"><code>a\nb</code></pre></div>'

/** スクリプトは IIFE なので、毎回モジュールを読み直して実行させる */
async function loadScript() {
  vi.resetModules()
  await import('../src/kuro-code-copy.js?t=' + Math.random())
}

function setClipboard(impl) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: impl, configurable: true, writable: true,
  })
}

describe('公開ページのコピーボタン', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('<pre data-gutter> にボタンを後付けする', async () => {
    setClipboard({ writeText: () => Promise.resolve() })
    document.body.innerHTML = SAVED
    await loadScript()
    const btn = document.querySelector('.kuro-code-copybtn')
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-label')).toBe('コードをコピー')
    // 付ける先はコードブロックだけ
    expect(document.querySelectorAll('.kuro-code-copybtn').length).toBe(1)
  })

  it('コピーするのは <code> のテキスト（行番号は入らない）', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    setClipboard({ writeText })
    document.body.innerHTML = SAVED
    await loadScript()
    document.querySelector('.kuro-code-copybtn').click()
    expect(writeText).toHaveBeenCalledWith('a\nb')   // "1 2" は混ざらない
  })

  it('呼び直しても二重に付かない', async () => {
    setClipboard({ writeText: () => Promise.resolve() })
    document.body.innerHTML = SAVED
    await loadScript()
    window.kuroCodeCopy()
    window.kuroCodeCopy(document)
    expect(document.querySelectorAll('.kuro-code-copybtn').length).toBe(1)
  })

  it('あとから足したコードブロックにも付けられる（ホストの再描画用）', async () => {
    setClipboard({ writeText: () => Promise.resolve() })
    document.body.innerHTML = ''
    await loadScript()
    document.body.innerHTML = SAVED
    window.kuroCodeCopy()
    expect(document.querySelectorAll('.kuro-code-copybtn').length).toBe(1)
  })

  it('clipboard が無い環境ではボタンを出さない', async () => {
    setClipboard(undefined)
    document.body.innerHTML = SAVED
    await loadScript()
    expect(document.querySelector('.kuro-code-copybtn')).toBeNull()
  })

  it('data-gutter の無い <pre>（他所の本文）には触らない', async () => {
    setClipboard({ writeText: () => Promise.resolve() })
    document.body.innerHTML = '<div class="kuro-content"><pre><code>x</code></pre></div>'
    await loadScript()
    expect(document.querySelector('.kuro-code-copybtn')).toBeNull()
  })
})
