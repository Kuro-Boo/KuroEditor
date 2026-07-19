/**
 * applyOps (W3 受信側) — remote ops を DOM へ適用。onBlockChange にエコー返さず
 * dirty も点けず shadow を更新。IME 変換中 / キャレット載車 block は保留し、
 * 解放時に版ベース 3-way マージ（§4.5）。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}
const bids = (e) => [...e.wysiwyg.children].map((el) => el.getAttribute('data-bid'))

describe('applyOps — immediate apply (no held block)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  const make = (content, extra = {}) =>
    new KuroEditor(makeMount(), { blockIds: true, initialContent: content, ...extra })

  it('applies update/insert/delete/move to the DOM', () => {
    const e = make('<p data-bid="a">a</p><p data-bid="b">b</p>')
    e.applyOps({ ops: [{ op: 'update', bid: 'a', html: '<p data-bid="a">A2</p>' }] })
    expect(e.getBlock('a').html).toContain('A2')

    e.applyOps({ ops: [{ op: 'insert', bid: 'c', html: '<p data-bid="c">c</p>', afterBid: 'a' }] })
    expect(bids(e)).toEqual(['a', 'c', 'b'])

    e.applyOps({ ops: [{ op: 'insert', bid: 'z', html: '<p data-bid="z">z</p>', afterBid: null }] })
    expect(bids(e)).toEqual(['z', 'a', 'c', 'b'])

    e.applyOps({ ops: [{ op: 'move', bid: 'b', afterBid: null }] })
    expect(bids(e)).toEqual(['b', 'z', 'a', 'c'])

    e.applyOps({ ops: [{ op: 'delete', bid: 'c' }] })
    expect(bids(e)).toEqual(['b', 'z', 'a'])
  })

  it('does NOT mark dirty and does NOT echo via onBlockChange', () => {
    vi.useFakeTimers()
    const batches = []
    const e = make('<p data-bid="a">a</p>', { onBlockChange: (b) => batches.push(b) })
    e.clearDirty()
    e.applyOps({ ops: [{ op: 'update', bid: 'a', html: '<p data-bid="a">remote</p>' }] })
    vi.advanceTimersByTime(450)
    expect(e.isDirty()).toBe(false)
    expect(batches).toEqual([])
    vi.useRealTimers()
  })

  it('advances the shadow so a later LOCAL edit diffs against the remote value', () => {
    vi.useFakeTimers()
    const batches = []
    const e = make('<p data-bid="a">a</p>', { onBlockChange: (b) => batches.push(b) })
    e.applyOps({ ops: [{ op: 'update', bid: 'a', html: '<p data-bid="a">remote</p>' }] })
    e.updateBlock('a', '<p data-bid="a">mine</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.length).toBe(1)
    expect(batches[0].ops).toEqual([{ op: 'update', bid: 'a', html: '<p data-bid="a">mine</p>' }])
    vi.useRealTimers()
  })
})

describe('applyOps — held block (caret-parked) confirm-time merge', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  function caretIn(e, bid) {
    const el = e.wysiwyg.querySelector(`[data-bid="${bid}"]`)
    const node = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : el
    const off = node.nodeType === 3 ? node.textContent.length : 0
    const r = document.createRange()
    r.setStart(node, off)
    r.collapse(true)
    const s = window.getSelection()
    s.removeAllRanges()
    s.addRange(r)
    document.dispatchEvent(new Event('selectionchange'))
  }

  it('holds a remote update on the caret block, merges on caret leave (remote-only → applied)', () => {
    const e = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">a</p><p data-bid="b">b</p>' })
    caretIn(e, 'a')
    // remote edits block 'a' while the caret is parked in it → held, DOM unchanged
    e.applyOps({ ops: [{ op: 'update', bid: 'a', html: '<p data-bid="a">remote-a</p>' }] })
    expect(e.getBlock('a').html).toContain('>a<')        // not applied yet
    // caret leaves 'a' → held update released; local never changed 'a' so remote wins
    caretIn(e, 'b')
    document.dispatchEvent(new Event('selectionchange'))
    expect(e.getBlock('a').html).toContain('remote-a')
  })

  it('diverged block → keeps local, reports via onBlockDiverged (no silent loss)', () => {
    const diverged = []
    const e = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="a">base</p><p data-bid="b">b</p>',
      onBlockDiverged: (bid, c) => diverged.push({ bid, c }),
    })
    caretIn(e, 'a')
    // local edits 'a' (origin local, program-style via API for determinism)
    e.updateBlock('a', '<p data-bid="a">mine</p>', { origin: 'local' })
    caretIn(e, 'a')
    // remote also edits 'a' while caret parked → held
    e.applyOps({ ops: [{ op: 'update', bid: 'a', html: '<p data-bid="a">theirs</p>' }] })
    expect(e.getBlock('a').html).toContain('mine')       // still local, held
    // caret leaves → merge: base=shadow(base) local=mine remote=theirs → diverge, keep local, report
    caretIn(e, 'b')
    document.dispatchEvent(new Event('selectionchange'))
    expect(e.getBlock('a').html).toContain('mine')
    expect(diverged.length).toBe(1)
    expect(diverged[0].bid).toBe('a')
    expect(diverged[0].c.remote).toContain('theirs')
  })
})
