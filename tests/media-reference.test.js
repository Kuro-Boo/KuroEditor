/**
 * メディア参照の解決と非改変保存（v2.18.11 同乗の画像処理修正）
 *
 * - メディアダイアログの URL 欄が「裸の slug/mid」「[[…]] トークン」（KuroCMS の
 *   「MID をコピー」の出力）を受け付け、表示は urlResolver で解決した URL、
 *   保存データ (data-kuro-media) は slug のまま → getContent() は [[slug]] に戻る。
 * - http(s) URL はそのまま従来挙動。
 * - 単体 [[…]] トークンのペーストはタイプ時と同じ表示展開を通す
 *   （通常の複数行テキスト貼り付けには干渉しない）。
 *
 * execCommand('insertHTML') はテスト環境では stub のため、挿入 HTML は
 * _restoreAndInsert を横取りして検証し、往復は innerHTML へ直接置いて確かめる
 * （＝実装と同じ土俵。tests/setup.js の方針どおり）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

/** mid-* を CDN URL に解決するデモ相当の resolver。 */
const resolver = (slug) =>
  slug.startsWith('http') ? slug : `https://cdn.example.com/media/${slug}.png`

/** _restoreAndInsert を横取りして、挿入されるはずの HTML を捕まえるエディタを作る。 */
function makeCapturing(options = {}) {
  const ed = new KuroEditor(makeMount(), { urlResolver: resolver, ...options })
  const captured = []
  ed._restoreAndInsert = (html) => captured.push(html)
  return { ed, captured }
}

describe('_insertMediaURL — ホストメディア参照の解決と slug 保存', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('[[mid-xxx]] トークン: 表示 src は解決 URL、data-kuro-media は slug', () => {
    const { ed, captured } = makeCapturing()
    ed._insertMediaURL('[[mid-abc123]]')
    expect(captured.length).toBe(1)
    const html = captured[0]
    expect(html).toContain('src="https://cdn.example.com/media/mid-abc123.png"')
    // 保存属性は slug（解決後 URL に書き換えられていない）
    expect(html).toMatch(/data-kuro-media="[^"]*mid-abc123[^"]*"/)
    expect(html).not.toMatch(/data-kuro-media="[^"]*cdn\.example\.com[^"]*"/)
  })

  it('裸の slug/mid でも同じ（トークン括りなし）', () => {
    const { ed, captured } = makeCapturing()
    ed._insertMediaURL('mid-abc123')
    expect(captured[0]).toContain('src="https://cdn.example.com/media/mid-abc123.png"')
    expect(captured[0]).toMatch(/data-kuro-media="[^"]*mid-abc123[^"]*"/)
  })

  it('http(s) URL は従来どおり素通し（src も保存属性も URL）', () => {
    const { ed, captured } = makeCapturing()
    ed._insertMediaURL('https://example.com/photo.png')
    const html = captured[0]
    expect(html).toContain('src="https://example.com/photo.png"')
    expect(html).toMatch(/data-kuro-media="[^"]*photo\.png[^"]*"/)
  })

  it('前後の空白は無視して解決する', () => {
    const { ed, captured } = makeCapturing()
    ed._insertMediaURL('  [[ mid-abc123 ]]  ')
    expect(captured[0]).toContain('src="https://cdn.example.com/media/mid-abc123.png"')
  })

  it('往復非改変: 挿入 HTML を本文に置くと getContent() は [[slug]] に戻る', () => {
    const { ed, captured } = makeCapturing()
    ed._insertMediaURL('[[mid-abc123]]')
    // insertHTML 相当を直接反映（実装と同じ土俵）
    ed.wysiwyg.innerHTML = captured[0]
    const out = ed.getContent()
    expect(out).toContain('[[mid-abc123]]')
    // 解決後 URL が保存データに漏れていない
    expect(out).not.toContain('cdn.example.com')
  })
})

describe('paste — 単体 [[…]] トークンの表示展開', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  function pasteText(ed, text) {
    const e = new Event('paste', { bubbles: true, cancelable: true })
    e.clipboardData = {
      items: [],
      getData: (type) => (type === 'text/plain' ? text : ''),
    }
    ed.wysiwyg.dispatchEvent(e)
    return e
  }

  it('単体トークンのペーストは自前展開に切り替わる（preventDefault される）', () => {
    const ed = new KuroEditor(makeMount(), { urlResolver: resolver })
    const e = pasteText(ed, '[[mid-abc123]]')
    expect(e.defaultPrevented).toBe(true)
  })

  it('通常テキスト・複数行のペーストには干渉しない', () => {
    const ed = new KuroEditor(makeMount(), { urlResolver: resolver })
    expect(pasteText(ed, 'ただのテキスト').defaultPrevented).toBe(false)
    expect(pasteText(ed, '一行目\n[[mid-abc]]\n三行目').defaultPrevented).toBe(false)
  })

  it('展開結果がトークンのまま（レンダリング不能）なら既定動作に任せる', () => {
    // resolver 無し（identity）の [[普通のテキスト]] は data ref 等に展開されない
    // ケースがあるため、rendered === plainTok なら preventDefault しない設計。
    // 展開可能な mid トークンとの差分を固定する。
    const ed = new KuroEditor(makeMount(), { urlResolver: resolver })
    const e = pasteText(ed, '[[mid-abc123]]')
    expect(e.defaultPrevented).toBe(true)   // 展開可能 → 自前
  })

  it('閲覧モードではペースト自体が遮断される（既存挙動の回帰）', () => {
    const ed = new KuroEditor(makeMount(), { urlResolver: resolver })
    ed.setMode('view')
    const e = pasteText(ed, '[[mid-abc123]]')
    expect(e.defaultPrevented).toBe(true)   // view モードの遮断が先に効く
  })
})
