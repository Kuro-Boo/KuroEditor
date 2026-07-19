/**
 * 相互接続テスト（W2×W3 統合） — 2 つの KuroEditor を同一ドキュメントに置き、
 * A.onBlockChange → B.applyOps / B.onBlockChange → A.applyOps と直結して、
 * サーバー無しでエディタ側の共同編集契約を end-to-end で検証する
 * （仕様書 §8「H4 前の受け入れテスト」）。
 *
 * 検証する性質:
 *   1. 伝播: 片方のローカル編集（update/insert/delete/move）が相手に現れる
 *   2. エコー抑制: remote 適用は再 emit されない（無限往復が起きない）
 *   3. 収束: 一連の編集後、両エディタの本文・ブロック順序が一致する
 *   4. 非消失: 未送信のローカル変更は、リモート適用に飲み込まれず必ず emit される
 *   ※ 同一ブロックの真の同時編集の「収束」はサーバー（Plan B の DO sequencer）の
 *     責務であり、直結配線では検証対象外（G0 の結論どおり）。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}
const bids = (e) => [...e.wysiwyg.children].map((el) => el.getAttribute('data-bid'))

/** 2 エディタを相互接続して返す。emitted に各エディタが発火した batch を記録。 */
function makePair(content) {
  const emitted = { A: [], B: [] }
  const eds = {}
  eds.A = new KuroEditor(makeMount(), {
    blockIds: true,
    initialContent: content,
    onBlockChange: (batch) => { emitted.A.push(batch); eds.B.applyOps(batch) },
  })
  eds.B = new KuroEditor(makeMount(), {
    blockIds: true,
    initialContent: content,
    onBlockChange: (batch) => { emitted.B.push(batch); eds.A.applyOps(batch) },
  })
  return { ...eds, emitted }
}

describe('相互接続（2 エディタ直結）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('A のローカル編集が B に現れ、エコー往復しない', () => {
    const { A, B, emitted } = makePair('<p data-bid="a">hello</p>')
    A.updateBlock('a', '<p data-bid="a">hello world</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(B.getBlock('a').html).toContain('hello world')
    // A が 1 batch、B は 0（remote 適用は emit されない）
    expect(emitted.A.length).toBe(1)
    expect(emitted.B.length).toBe(0)
    // さらに時間を進めても何も増えない（無限往復なし）
    vi.advanceTimersByTime(5000)
    expect(emitted.A.length).toBe(1)
    expect(emitted.B.length).toBe(0)
  })

  it('insert / delete / move が伝播し、両者のブロック順序が一致する', () => {
    const { A, B } = makePair('<p data-bid="a">a</p><p data-bid="b">b</p>')
    A.insertBlock({ bid: 'c', html: '<p data-bid="c">c</p>' }, { afterBid: 'a', origin: 'local' })
    vi.advanceTimersByTime(450)
    B.moveBlock('b', { beforeBid: 'a', origin: 'local' })
    vi.advanceTimersByTime(450)
    A.deleteBlock('a', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(bids(A)).toEqual(bids(B))
    expect(A.getContent()).toBe(B.getContent())
  })

  it('双方向: B の編集も A に現れる', () => {
    const { A, B } = makePair('<p data-bid="a">x</p>')
    B.updateBlock('a', '<p data-bid="a">from B</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(A.getBlock('a').html).toContain('from B')
    expect(A.getContent()).toBe(B.getContent())
  })

  it('別ブロックの同時編集は両方が両者に反映され収束する', () => {
    const { A, B } = makePair('<p data-bid="a">a</p><p data-bid="b">b</p>')
    // 同じ debounce 窓内に A は block a、B は block b を編集（キャレットは無い）
    A.updateBlock('a', '<p data-bid="a">A版</p>', { origin: 'local' })
    B.updateBlock('b', '<p data-bid="b">B版</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(A.getBlock('a').html).toContain('A版')
    expect(A.getBlock('b').html).toContain('B版')
    expect(B.getBlock('a').html).toContain('A版')
    expect(B.getBlock('b').html).toContain('B版')
    expect(A.getContent()).toBe(B.getContent())
  })

  it('DOM 直接変異（タイピング相当）も相手に伝播する', async () => {
    const { A, B } = makePair('<p data-bid="a">typed</p>')
    A.wysiwyg.querySelector('[data-bid="a"]').textContent = 'typed!!!'
    // MutationObserver の配送（microtask）を挟みながらタイマーを進める
    await vi.advanceTimersByTimeAsync(450)
    await vi.advanceTimersByTimeAsync(450)
    expect(B.getBlock('a').html).toContain('typed!!!')
  })

  it('非消失: 未送信のローカル変更はリモート適用時に必ず先に emit される', () => {
    const { A, B, emitted } = makePair('<p data-bid="a">base</p><p data-bid="b">b</p>')
    // A に未送信の編集（debounce 待ち）を作る
    A.updateBlock('a', '<p data-bid="a">A編集</p>', { origin: 'local' })
    // flush 前に B の編集が届く（別ブロック）→ A の pending が飲み込まれてはならない
    B.updateBlock('b', '<p data-bid="b">B編集</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    // A の編集は emit 済み（無音で消えていない）
    const aOps = emitted.A.flatMap((x) => x.ops)
    expect(aOps).toContainEqual({ op: 'update', bid: 'a', html: '<p data-bid="a">A編集</p>' })
    // 双方に両編集が反映され収束
    expect(A.getContent()).toBe(B.getContent())
    expect(A.getBlock('a').html).toContain('A編集')
    expect(A.getBlock('b').html).toContain('B編集')
  })

  it('同一ブロックの同時編集でも「どちらの編集も emit される」（順序決定はサーバーの責務）', () => {
    const { A, B, emitted } = makePair('<p data-bid="x">base</p>')
    A.updateBlock('x', '<p data-bid="x">A版</p>', { origin: 'local' })
    B.updateBlock('x', '<p data-bid="x">B版</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    const aOps = emitted.A.flatMap((x) => x.ops)
    const bOps = emitted.B.flatMap((x) => x.ops)
    expect(aOps).toContainEqual({ op: 'update', bid: 'x', html: '<p data-bid="x">A版</p>' })
    expect(bOps).toContainEqual({ op: 'update', bid: 'x', html: '<p data-bid="x">B版</p>' })
    // 直結（sequencer 無し）では最終値の全順序は決まらないが、暴走しないこと
    vi.advanceTimersByTime(5000)
    expect(emitted.A.length + emitted.B.length).toBeLessThan(10)
  })
})
