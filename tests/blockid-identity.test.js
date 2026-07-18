/**
 * Block identity round-trip + id-safety (F0-1 / F0-5).
 *
 * F0-1: a code block's data-bid must survive save → reload → save. The serialize
 *       path (wrap → <pre>) and the load path (<pre> → wrap) both used to drop it,
 *       so the block got a fresh id every round-trip and a per-block 3-way merge
 *       would see it as delete+insert (spurious duplication).
 * F0-5: a malformed/adversarial data-bid (from pasted / external / MCP content)
 *       must not break the `[data-bid="…"]` selector, and must be re-minted to a
 *       safe id at the tagging boundary.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor, isValidBid } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

/** bid of each top-level block, in document order. */
function topBids(ed) {
  return [...ed.wysiwyg.children].map((el) => el.getAttribute('data-bid'))
}

describe('isValidBid', () => {
  it('accepts UUIDs and simple tokens', () => {
    expect(isValidBid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidBid('keep-1')).toBe(true)
    expect(isValidBid('b_2xYz')).toBe(true)
  })
  it('rejects selector/wire-breaking or over-long ids', () => {
    expect(isValidBid('a"b')).toBe(false)          // quote
    expect(isValidBid('a]b')).toBe(false)          // bracket
    expect(isValidBid('a b')).toBe(false)          // space
    expect(isValidBid('a<b>')).toBe(false)         // angle
    expect(isValidBid('x'.repeat(65))).toBe(false) // over-long
    expect(isValidBid('')).toBe(false)
    expect(isValidBid(null)).toBe(false)
    expect(isValidBid(undefined)).toBe(false)
  })
})

describe('block id identity round-trip (F0-1)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('a code block keeps its data-bid across getContent → setContent → getContent', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p>intro</p><pre class="kuro-code"><code>const a = 1</code></pre><p>outro</p>',
    })
    const first = topBids(ed)
    // the code block is the 2nd top-level block; it must have a bid
    expect(first.every(Boolean)).toBe(true)
    const codeBid = first[1]
    expect(isValidBid(codeBid)).toBe(true)

    // save → reload → the same bids must come back (esp. the code block's)
    const saved = ed.getContent()
    expect(saved).toContain(`data-bid="${codeBid}"`) // serialize kept it on <pre>

    ed.setContent(saved)
    const second = topBids(ed)
    expect(second).toEqual(first)

    // one more round to be sure it is a fixpoint, not a lucky first pass
    ed.setContent(ed.getContent())
    expect(topBids(ed)).toEqual(first)
  })

  it('the code block bid is stable even when its code text is edited', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<pre class="kuro-code"><code>old</code></pre>',
    })
    const bid = topBids(ed)[0]
    // edit the live textarea value (what the user types), then serialize
    const ta = ed.wysiwyg.querySelector('.kuro-code__area')
    ta.value = 'new code'
    const out = ed.getContent()
    expect(out).toContain(`data-bid="${bid}"`)
    expect(out).toContain('new code')
  })

  it('mixed document: every top-level bid is a fixpoint across a round-trip', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent:
        '<h2>title</h2>' +
        '<p>para</p>' +
        '<pre class="kuro-code"><code>x()</code></pre>' +
        '<ul><li>a</li><li>b</li></ul>',
    })
    const before = topBids(ed)
    expect(before.every(isValidBid)).toBe(true)
    ed.setContent(ed.getContent())
    expect(topBids(ed)).toEqual(before)
  })
})

describe('malformed block id is canonicalized, never crashes selectors (F0-5)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('does not throw and re-mints an unsafe data-bid on load', () => {
    let ed
    expect(() => {
      ed = new KuroEditor(makeMount(), {
        blockIds: true,
        // a quote + bracket that would break `[data-bid="${id}"]`
        initialContent: '<p data-bid="a&quot;]b">x</p><p>y</p>',
      })
    }).not.toThrow()
    const bids = topBids(ed)
    expect(bids.every(isValidBid)).toBe(true)   // unsafe one was replaced
    expect(new Set(bids).size).toBe(bids.length) // still unique
  })

  it('keeps a valid supplied bid but replaces an invalid sibling', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="keep-1">a</p><p data-bid="bad id!">b</p>',
    })
    const bids = topBids(ed)
    expect(bids[0]).toBe('keep-1')       // valid one preserved
    expect(isValidBid(bids[1])).toBe(true)
    expect(bids[1]).not.toBe('bad id!')  // invalid one re-minted
  })

  it('still de-duplicates colliding valid ids (regression)', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="dup">a</p><p data-bid="dup">b</p>',
    })
    const bids = topBids(ed)
    expect(bids[0]).toBe('dup')          // first occurrence kept
    expect(bids[1]).not.toBe('dup')      // duplicate re-issued
    expect(new Set(bids).size).toBe(2)
  })
})
