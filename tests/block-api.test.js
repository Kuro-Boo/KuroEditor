/**
 * Block API (W1) — getBlocks / getBlock / updateBlock / insertBlock /
 * deleteBlock / moveBlock / ensureBlockIds, with ApplyOptions.origin dirty rules.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}
function ed(content) {
  return new KuroEditor(makeMount(), { blockIds: true, initialContent: content })
}
const bids = (e) => [...e.wysiwyg.children].map((el) => el.getAttribute('data-bid'))

describe('getBlocks / getBlock', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('returns { bid, type, html } per top-level block', () => {
    const e = ed('<p data-bid="a">x</p><h2 data-bid="b">y</h2>')
    const blocks = e.getBlocks()
    expect(blocks.map((b) => b.bid)).toEqual(['a', 'b'])
    expect(blocks.map((b) => b.type)).toEqual(['p', 'h2'])
    expect(blocks[0].html).toContain('>x<')
  })

  it('getBlock finds by id, null for missing/invalid', () => {
    const e = ed('<p data-bid="a">x</p>')
    expect(e.getBlock('a').type).toBe('p')
    expect(e.getBlock('nope')).toBeNull()
    expect(e.getBlock('bad id!')).toBeNull()
  })

  it('blockIds OFF → bids are null', () => {
    const e = new KuroEditor(makeMount(), { initialContent: '<p>x</p>' })
    expect(e.getBlocks()[0].bid).toBeNull()
  })
})

describe('updateBlock', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('replaces content and preserves the bid', () => {
    const e = ed('<p data-bid="a">old</p><p data-bid="b">keep</p>')
    expect(e.updateBlock('a', '<p>new</p>')).toBe(true)
    expect(e.getBlock('a').html).toContain('new')
    expect(bids(e)).toEqual(['a', 'b'])            // identity + order preserved
  })

  it('returns false for a missing bid', () => {
    const e = ed('<p data-bid="a">x</p>')
    expect(e.updateBlock('nope', '<p>y</p>')).toBe(false)
  })

  it('origin "program"/"remote" does NOT mark dirty; "local" does', () => {
    const e = ed('<p data-bid="a">x</p>')
    e.clearDirty()
    e.updateBlock('a', '<p>r</p>', { origin: 'remote' })
    expect(e.isDirty()).toBe(false)
    e.updateBlock('a', '<p>l</p>', { origin: 'local' })
    expect(e.isDirty()).toBe(true)
  })

  it('a stored code block round-trips its bid through updateBlock', () => {
    const e = ed('<p data-bid="a">x</p>')
    e.updateBlock('a', '<pre class="kuro-code"><code>const z = 1</code></pre>', { origin: 'program' })
    // becomes a wired wrap that still carries the bid, and serializes back with it
    const wrap = e.wysiwyg.querySelector('.kuro-code-wrap')
    expect(wrap?.getAttribute('data-bid')).toBe('a')
    expect(e.getContent()).toContain('data-bid="a"')
    expect(e.getContent()).toContain('const z = 1')
  })
})

describe('insertBlock (anchor positions)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('append when no anchor, and mints a bid', () => {
    const e = ed('<p data-bid="a">a</p>')
    e.insertBlock({ html: '<p>tail</p>' })
    const bs = e.getBlocks()
    expect(bs.length).toBe(2)
    expect(bs[1].html).toContain('tail')
    expect(bs[1].bid).toBeTruthy()
  })

  it('beforeBid inserts before, afterBid inserts after', () => {
    const e = ed('<p data-bid="a">a</p><p data-bid="c">c</p>')
    e.insertBlock({ bid: 'b', html: '<p data-bid="b">b</p>' }, { afterBid: 'a' })
    expect(bids(e)).toEqual(['a', 'b', 'c'])
    e.insertBlock({ bid: 'z', html: '<p data-bid="z">z</p>' }, { beforeBid: 'a' })
    expect(bids(e)).toEqual(['z', 'a', 'b', 'c'])
  })
})

describe('deleteBlock / moveBlock', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('deleteBlock removes the block', () => {
    const e = ed('<p data-bid="a">a</p><p data-bid="b">b</p>')
    expect(e.deleteBlock('a')).toBe(true)
    expect(bids(e)).toEqual(['b'])
    expect(e.deleteBlock('nope')).toBe(false)
  })

  it('moveBlock reorders via anchor', () => {
    const e = ed('<p data-bid="a">a</p><p data-bid="b">b</p><p data-bid="c">c</p>')
    e.moveBlock('c', { beforeBid: 'a' })
    expect(bids(e)).toEqual(['c', 'a', 'b'])
    e.moveBlock('c', { afterBid: 'b' })
    expect(bids(e)).toEqual(['a', 'b', 'c'])
  })
})

describe('ensureBlockIds', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('mints ids for blocks that lack them', () => {
    const e = ed('<p data-bid="a">a</p>')
    // inject a raw block without a bid, bypassing the API
    const p = document.createElement('p')
    p.textContent = 'raw'
    e.wysiwyg.appendChild(p)
    e.ensureBlockIds()
    const all = bids(e)
    expect(all.length).toBe(2)
    expect(all.every(Boolean)).toBe(true)
    expect(new Set(all).size).toBe(2)
  })
})
