/**
 * Shared block utilities (src/blocks.js) — DOM-independent pure functions used
 * by the editor, KuroCMS Worker, KuroNotes sync, and the Plan B sync server.
 */
import { describe, it, expect } from 'vitest'
import {
  isValidBid,
  stripInternalIds,
  stripBlockIds,
  parseBlocks,
  normalizeBlockIds,
  mergeBlocks,
  resolveConflictsAsDuplicates,
  reconcileOrder,
} from '../src/blocks.js'

describe('stripInternalIds (tokenizer, DOM-free)', () => {
  const cases = [
    ['普通', '<p data-bid="blk-1">x</p>', '<p>x</p>'],
    ['前属性に > (F0-2 の核)', '<p title="1 > 0" data-bid="k">x</p>', '<p title="1 > 0">x</p>'],
    ['前属性に < と >', '<a data-x="a<b>c" data-bid="k">t</a>', '<a data-x="a<b>c">t</a>'],
    ['単引用符', "<p data-bid='k'>x</p>", '<p>x</p>'],
    ['属性順 (bid 先頭)', '<div data-bid="k" class="c">y</div>', '<div class="c">y</div>'],
    ['data-cbid も除去', '<td data-cbid="c1">v</td>', '<td>v</td>'],
    ['入れ子 bid', '<div data-bid="a"><p data-bid="b">x</p></div>', '<div><p>x</p></div>'],
    ['コード内エスケープ済みは保持', '<pre><code>&lt;p data-bid="keep"&gt;</code></pre>', '<pre><code>&lt;p data-bid="keep"&gt;</code></pre>'],
    ['別属性値の data-bid= 文字列', '<p alt="data-bid=fake" data-bid="real">x</p>', '<p alt="data-bid=fake">x</p>'],
    ['bid なしは素通し (同一参照)', '<p>plain</p>', '<p>plain</p>'],
    ['コメント内の > と bid は保持', '<!-- a > b data-bid="x" --><p data-bid="k">t</p>', '<!-- a > b data-bid="x" --><p>t</p>'],
  ]
  for (const [name, input, want] of cases) {
    it(name, () => expect(stripInternalIds(input)).toBe(want))
  }
  it('no internal attr → returns the SAME string untouched', () => {
    const s = '<p>plain</p>\n<h2>x</h2>'
    expect(stripInternalIds(s)).toBe(s)
  })
  it('stripBlockIds is an alias that also drops data-cbid', () => {
    expect(stripBlockIds('<td data-bid="a" data-cbid="b">v</td>')).toBe('<td>v</td>')
  })
})

describe('parseBlocks', () => {
  it('splits top-level blocks and reads bids, dropping whitespace runs', () => {
    const blocks = parseBlocks('<p data-bid="a">x</p>\n  \n<h2>y</h2>')
    expect(blocks.map((b) => b.bid)).toEqual(['a', null])
    expect(blocks.map((b) => b.html)).toEqual(['<p data-bid="a">x</p>', '<h2>y</h2>'])
  })
  it('returns [] on malformed HTML', () => {
    expect(parseBlocks('<p>unclosed')).toEqual([])
  })
})

describe('normalizeBlockIds', () => {
  const seq = () => { let i = 0; return () => `mint-${++i}` }
  it('mints for missing ids, keeps valid ones', () => {
    const out = normalizeBlockIds('<p data-bid="keep-1">a</p><p>b</p>', seq())
    const blocks = parseBlocks(out)
    expect(blocks[0].bid).toBe('keep-1')
    expect(blocks[1].bid).toBe('mint-1')
  })
  it('re-mints malformed and duplicate ids', () => {
    const out = normalizeBlockIds('<p data-bid="bad id!">a</p><p data-bid="dup">b</p><p data-bid="dup">c</p>', seq())
    const bids = parseBlocks(out).map((b) => b.bid)
    expect(bids.every(isValidBid)).toBe(true)
    expect(new Set(bids).size).toBe(3)          // all unique
    expect(bids[1]).toBe('dup')                 // first dup kept
    expect(bids[2]).not.toBe('dup')             // second re-minted
  })
  it('preserves other attributes when tagging', () => {
    const out = normalizeBlockIds('<div class="kuro-roundbox">x</div>', seq())
    expect(out).toContain('class="kuro-roundbox"')
    expect(out).toContain('data-bid="mint-1"')
  })
  it('refuses (returns input) on malformed HTML', () => {
    expect(normalizeBlockIds('<p>unclosed', seq())).toBe('<p>unclosed')
  })
})

describe('resolveConflictsAsDuplicates (KuroNotes 案C / オフライン復帰)', () => {
  it('keeps local and re-inserts each remote conflict as a new block (no loss)', () => {
    const base = '<p data-bid="1">original</p>'
    const local = '<p data-bid="1">mine</p>'
    const remote = '<p data-bid="1">theirs</p>'
    const merged = mergeBlocks(base, local, remote)
    expect(merged.conflicts.length).toBe(1)
    const resolved = resolveConflictsAsDuplicates(merged, () => 'dup-1')
    const blocks = parseBlocks(resolved)
    expect(blocks.map((b) => b.html.replace(/ data-bid="[^"]*"/, ''))).toEqual(['<p>mine</p>', '<p>theirs</p>'])
    expect(blocks[1].bid).toBe('dup-1')         // remote value survives under a fresh bid
  })
  it('returns html unchanged when there are no conflicts', () => {
    const merged = mergeBlocks('<p data-bid="1">a</p>', '<p data-bid="1">a</p>', '<p data-bid="1">a</p>')
    expect(resolveConflictsAsDuplicates(merged)).toBe(merged.html)
  })
})

describe('reconcileOrder (Plan B / Adapter 修復・決定的)', () => {
  it('drops duplicates (first wins) and orphans, appends missing in bid order', () => {
    const order = ['b', 'a', 'b', 'x']          // b duplicated, x is orphan (not known)
    const known = ['a', 'b', 'c']               // c missing from order
    expect(reconcileOrder(order, known)).toEqual(['b', 'a', 'c'])
  })
  it('is deterministic (same input → same output)', () => {
    const order = ['z', 'q', 'z']
    const known = new Set(['q', 'z', 'a'])
    expect(reconcileOrder(order, known)).toEqual(reconcileOrder(order, known))
    expect(reconcileOrder(order, known)).toEqual(['z', 'q', 'a'])
  })
})
