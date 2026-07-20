/**
 * 共同編集の非消失・収束の性質テスト（実 blocks.js に対する）。
 *
 * 由来: G0 spike（旧 docs/g0-spike/planB-do-sequenced.mjs）は「DO 順序付け版付き
 * OpBatch」を独立モデルで再実装し、3 端末が同一ブロックを並行編集しても
 * 「非消失・収束・冪等・再構築一致」が成り立つことを実測して Plan B を選んだ
 * （ADR = 共同編集システム実装仕様書 §11.4）。
 *
 * そのうち KuroEditor の領分（＝エディタのブロック契約）で検証できる性質は
 * 「同一ブロックへの N 者並行編集を、配信順に依らず、全編集を保持したまま
 * 収束させる」こと。ここではその性質を spike の独立モデルではなく実際の
 * blocks.js（mergeBlocks + resolveConflictsAsDuplicates）に対して確かめる。
 * これにより「KuroEditor の merge は編集を無音で失わない」が回帰で守られる
 * （Plan A = Yjs の LWW は敗者を無音で失う。その対比が本テストの主張の裏返し）。
 *
 * サーバーの版採番・changeId 冪等・ログからの再構築は同期層（ホスト = KuroCMS /
 * KuroNotes）の責務でありエディタ契約の外なので、ここでは扱わない。
 */
import { describe, it, expect } from 'vitest'
import {
  mergeBlocks,
  resolveConflictsAsDuplicates,
  parseBlocks,
} from '../src/blocks.js'

const P = (bid, text) => `<p data-bid="${bid}">${text}</p>`

/** ブロック内容（タグ除去）の集合。順序を捨てて「到達可能集合」で収束を見る。 */
const reachSet = (html) =>
  parseBlocks(html)
    .map((b) => b.html.replace(/<[^>]+>/g, ''))
    .sort()

/**
 * サーバー相当の畳み込み: base を共通祖先に、各 actor の版を 1 つずつ
 * mergeBlocks（base, 現行, incoming）で取り込み、分岐は複製で両方残す。
 * idFactory は決定的な連番にして順序間で bid がぶれないようにする。
 */
const foldEdits = (base, remoteOf, order) => {
  let n = 0
  const idFactory = () => `dup-${++n}`
  let doc = base
  for (const who of order) {
    const merged = mergeBlocks(base, doc, remoteOf(who))
    doc = resolveConflictsAsDuplicates(merged, idFactory)
  }
  return doc
}

describe('同一ブロックへの N 者並行編集（planB 由来の非消失・収束）', () => {
  const base = P('blk-1', 'original')
  const edits = { A: 'Aの重要段落', B: 'Bの別段落', C: 'Cの編集' }
  const remoteOf = (who) => P('blk-1', edits[who])
  const orders = [
    ['A', 'B', 'C'],
    ['C', 'B', 'A'],
    ['B', 'A', 'C'],
  ]

  it('非消失: どの配信順でも全 actor の編集が最終文書に残る', () => {
    for (const order of orders) {
      const doc = foldEdits(base, remoteOf, order)
      for (const who of Object.keys(edits)) {
        expect(doc).toContain(edits[who])
      }
    }
  })

  it('収束: 配信順が違っても到達可能集合は一致する', () => {
    const sets = orders.map((o) => reachSet(foldEdits(base, remoteOf, o)).join('|'))
    expect(new Set(sets).size).toBe(1)
    // 元ブロック 1 つ + 分岐 2 つ = 3 ブロックへ落ち着く
    expect(reachSet(foldEdits(base, remoteOf, orders[0]))).toEqual(
      [edits.A, edits.B, edits.C].sort(),
    )
  })

  // 冪等（同じ版の二重取り込みを弾く）は changeId によるサーバー側の責務であって
  // blocks.js の契約ではない（実際、同じ incoming を再度畳み込むと分岐が再度
  // 複製される）。同期層の性質なのでここ（エディタ契約テスト）では検証しない。
})

describe('別ブロックの同時編集は複製せず両立して収束する', () => {
  const base = P('a', 'A0') + P('b', 'B0')
  const local = P('a', 'A1') + P('b', 'B0') // 手元は a だけ編集
  const remote = P('a', 'A0') + P('b', 'B1') // 相手は b だけ編集

  it('両者の編集がそのまま合流し、分岐ゼロ（複製ゼロ）', () => {
    const merged = mergeBlocks(base, local, remote)
    expect(merged.conflicts).toHaveLength(0)
    const doc = resolveConflictsAsDuplicates(merged)
    expect(doc).toContain('A1')
    expect(doc).toContain('B1')
    expect(parseBlocks(doc)).toHaveLength(2) // 複製されていない
  })
})
