/**
 * Block IDs (data-bid) — opt-in stable block identifiers for external 3-way merge.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor, stripBlockIds } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('KuroEditor blockIds option', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('adds no data-bid when the option is off (default)', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>a</p><p>b</p>' })
    expect(ed.wysiwyg.querySelectorAll('[data-bid]').length).toBe(0)
  })

  it('assigns a unique data-bid to each top-level block on load', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p>a</p><h2>b</h2><p>c</p>',
    })
    const ids = [...ed.wysiwyg.children].map(el => el.getAttribute('data-bid'))
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length) // all unique
  })

  it('keeps an existing data-bid from loaded content', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="keep-1">a</p><p>b</p>',
    })
    expect(ed.wysiwyg.children[0].getAttribute('data-bid')).toBe('keep-1')
    expect(ed.wysiwyg.children[1].getAttribute('data-bid')).toBeTruthy()
  })

  it('re-issues duplicate ids (simulated split that cloned the block)', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="dup">a</p>',
    })
    const clone = ed.wysiwyg.children[0].cloneNode(true)
    ed.wysiwyg.appendChild(clone)
    ed._ensureBlockIds()
    const ids = [...ed.wysiwyg.children].map(el => el.getAttribute('data-bid'))
    expect(ids[0]).toBe('dup')         // first occurrence keeps the original id
    expect(ids[1]).not.toBe('dup')     // later occurrence re-issued
    expect(new Set(ids).size).toBe(2)
  })

  it('preserves data-bid through getContent()', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="x1">hello</p>',
    })
    expect(ed.getContent()).toContain('data-bid="x1"')
  })
})

// MutationObserver delivers asynchronously (microtask) — flush before asserting.
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('KuroEditor blockIds ON — live editing (paste / add)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('tags a newly added block (simulated Enter / single-block paste)', async () => {
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">x</p>' })
    ed.wysiwyg.insertAdjacentHTML('beforeend', '<p>new</p>')
    await flush()
    const blocks = [...ed.wysiwyg.children]
    expect(blocks.length).toBe(2)
    expect(blocks[0].getAttribute('data-bid')).toBe('a')
    expect(blocks[1].getAttribute('data-bid')).toBeTruthy()
    expect(blocks[1].getAttribute('data-bid')).not.toBe('a')
  })

  it('re-issues a pasted copy that carries a colliding id (copy/paste a block below)', async () => {
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">orig</p>' })
    ed.wysiwyg.insertAdjacentHTML('beforeend', '<p data-bid="a">pasted copy</p>')
    await flush()
    const ids = [...ed.wysiwyg.children].map((el) => el.getAttribute('data-bid'))
    expect(ids[0]).toBe('a')           // original kept
    expect(ids[1]).not.toBe('a')       // pasted copy re-issued
    expect(new Set(ids).size).toBe(2)
  })

  it('keeps the original id when the colliding copy is pasted ABOVE it', async () => {
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">orig</p>' })
    ed.wysiwyg.insertAdjacentHTML('afterbegin', '<p data-bid="a">pasted above</p>')
    await flush()
    const blocks = [...ed.wysiwyg.children]
    const orig   = blocks.find((b) => b.textContent === 'orig')
    const pasted = blocks.find((b) => b.textContent === 'pasted above')
    expect(orig.getAttribute('data-bid')).toBe('a')        // pre-existing keeps id
    expect(pasted.getAttribute('data-bid')).not.toBe('a')  // newcomer re-issued
    expect(new Set(blocks.map((b) => b.getAttribute('data-bid'))).size).toBe(2)
  })

  it('pasting multiple mixed blocks tags them all uniquely', async () => {
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">x</p>' })
    ed.wysiwyg.insertAdjacentHTML('beforeend', '<h2>h</h2><p>p1</p><blockquote>q</blockquote>')
    await flush()
    const ids = [...ed.wysiwyg.children].map((el) => el.getAttribute('data-bid'))
    expect(ids.length).toBe(4)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(4)
  })

  it('does not change a block id when its text is edited', async () => {
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: '<p data-bid="a">x</p>' })
    const before = ed.wysiwyg.children[0].getAttribute('data-bid')
    ed.wysiwyg.children[0].textContent = 'edited text'
    await flush()
    expect(ed.wysiwyg.children[0].getAttribute('data-bid')).toBe(before)
  })
})

describe('KuroEditor blockIds OFF — regression (unchanged behaviour)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('never injects data-bid on load / paste / add', async () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>a</p>' })
    ed.wysiwyg.insertAdjacentHTML('beforeend', '<p data-bid="x">b</p><h2>c</h2>')
    await flush()
    // Only the author-provided attribute survives; the editor injects nothing.
    expect(ed.wysiwyg.querySelectorAll('[data-bid]').length).toBe(1)
    expect(ed.wysiwyg.children[ed.wysiwyg.children.length - 1].hasAttribute('data-bid')).toBe(false)
  })

  it('getContent round-trips content without id injection', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>hello</p><h2>world</h2>' })
    const out = ed.getContent()
    expect(out).toContain('hello')
    expect(out).toContain('world')
    expect(out).not.toContain('data-bid')
  })
})

describe('getBuildImage / stripBlockIds — build output without editing ids', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('stripBlockIds removes every data-bid but nothing else', () => {
    const html = '<p data-bid="a1">x</p><h2 data-bid="a2" class="k">y</h2><p>z</p>'
    const out = stripBlockIds(html)
    expect(out).not.toContain('data-bid')
    expect(out).toContain('<p>x</p>')
    expect(out).toContain('class="k"')
    expect(out).toContain('<p>z</p>')
  })

  it('stripBlockIds returns the string untouched when no data-bid present', () => {
    const html = '<p>plain</p>\n<h2>heading</h2>'
    expect(stripBlockIds(html)).toBe(html)   // no DOM round-trip in this case
  })

  it('getBuildImage strips ids while getContent keeps them (blockIds ON)', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="keep-1">hello</p><p>world</p>',
    })
    expect(ed.getContent()).toContain('data-bid')
    const build = ed.getBuildImage()
    expect(build).not.toContain('data-bid')
    expect(build).toContain('hello')
    expect(build).toContain('world')
  })

  it('getBuildImage works in source mode too', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '<p data-bid="s1">src</p>',
    })
    ed.setMode('source')
    expect(ed.getContent()).toContain('data-bid')
    expect(ed.getBuildImage()).not.toContain('data-bid')
  })
})
