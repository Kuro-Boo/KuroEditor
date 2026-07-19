/**
 * Block events (W2) — onBlockChange emits OpBatch (update/insert/delete/move)
 * from the post-hoc block differ, debounced, gated on onBlockChange + blockIds,
 * suppressed for programmatic (setContent / remote-origin) changes.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('onBlockChange (W2)', () => {
  let batches
  const onBlockChange = (b) => batches.push(b)

  beforeEach(() => {
    document.body.innerHTML = ''
    batches = []
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  const make = (content) =>
    new KuroEditor(makeMount(), { blockIds: true, onBlockChange, initialContent: content })

  it('does NOT emit on setContent / load (baseline only)', () => {
    const e = make('<p data-bid="a">x</p>')
    vi.advanceTimersByTime(450)
    expect(batches).toEqual([])
    e.setContent('<p data-bid="b">y</p>')
    vi.advanceTimersByTime(450)
    expect(batches).toEqual([])
  })

  it('emits an update op for a local block API edit (origin local)', () => {
    const e = make('<p data-bid="a">x</p>')
    e.updateBlock('a', '<p data-bid="a">edited</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.length).toBe(1)
    expect(batches[0].origin).toBe('local')
    expect(batches[0].ops).toEqual([{ op: 'update', bid: 'a', html: '<p data-bid="a">edited</p>' }])
    expect(typeof batches[0].opId).toBe('string')
  })

  it('emits insert / delete / move ops with anchors', () => {
    const e = make('<p data-bid="a">a</p><p data-bid="b">b</p>')
    e.insertBlock({ bid: 'c', html: '<p data-bid="c">c</p>' }, { afterBid: 'a', origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.pop().ops).toEqual([{ op: 'insert', bid: 'c', html: '<p data-bid="c">c</p>', afterBid: 'a' }])

    e.deleteBlock('b', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.pop().ops).toEqual([{ op: 'delete', bid: 'b' }])

    e.moveBlock('c', { beforeBid: 'a', origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.pop().ops).toEqual([{ op: 'move', bid: 'c', afterBid: null }])
  })

  it('does NOT emit for remote/program-origin changes (but tracks them)', () => {
    const e = make('<p data-bid="a">x</p>')
    e.updateBlock('a', '<p data-bid="a">remote</p>', { origin: 'remote' })
    vi.advanceTimersByTime(450)
    expect(batches).toEqual([])
    // and a subsequent LOCAL edit diffs against the remote value, not the original
    e.updateBlock('a', '<p data-bid="a">mine</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.length).toBe(1)
    expect(batches[0].ops).toEqual([{ op: 'update', bid: 'a', html: '<p data-bid="a">mine</p>' }])
  })

  it('coalesces rapid edits within the debounce window into ONE batch', () => {
    const e = make('<p data-bid="a">x</p><p data-bid="b">y</p>')
    e.updateBlock('a', '<p data-bid="a">a2</p>', { origin: 'local' })
    e.updateBlock('b', '<p data-bid="b">b2</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(batches.length).toBe(1)
    expect(batches[0].ops).toEqual([
      { op: 'update', bid: 'a', html: '<p data-bid="a">a2</p>' },
      { op: 'update', bid: 'b', html: '<p data-bid="b">b2</p>' },
    ])
  })

  it('does nothing when onBlockChange is not set (default behaviour unchanged)', () => {
    const e = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">x</p>' })
    // no throw, no batches to observe — the machinery is inert
    e.updateBlock('a', '<p data-bid="a">z</p>', { origin: 'local' })
    vi.advanceTimersByTime(450)
    expect(e.getBlock('a').html).toContain('z')
  })

  it('requires blockIds — off means no emission', () => {
    const e = new KuroEditor(makeMount(), { onBlockChange, initialContent: '<p>x</p>' })
    e.wysiwyg.querySelector('p').textContent = 'y'
    vi.advanceTimersByTime(450)
    expect(batches).toEqual([])
  })
})
