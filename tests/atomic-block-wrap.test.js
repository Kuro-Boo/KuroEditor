/**
 * Top-level inline cards (URL card / media-fallback card) are boxed in
 * <div data-kuro-block> in the LIVE editor DOM so the caret can navigate around
 * them; getContent() strips the wrappers so the stored/published form is
 * unchanged. See editor.js _wrapAtomicBlocks / _unwrapAtomicBlocks.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('atomic-block wrapping (caret navigation for top-level cards)', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('boxes a top-level URL card in <div data-kuro-block>', () => {
    const ed = new KuroEditor(makeMount(), {
      initialContent: '<p>text</p>[[https://a.example|]]',
    })
    const card = ed.wysiwyg.querySelector('a.kuro-url-card')
    expect(card).toBeTruthy()
    expect(card.parentElement.tagName).toBe('DIV')
    expect(card.parentElement.hasAttribute('data-kuro-block')).toBe(true)
    // the wrapper is top-level and a real block
    expect(card.parentElement.parentElement).toBe(ed.wysiwyg)
  })

  it('boxes a bare top-level <br> (the blank line between cards)', () => {
    const ed = new KuroEditor(makeMount(), {
      initialContent: '[[https://a.example|]]<br>[[https://b.example|]]',
    })
    const boxes = ed.wysiwyg.querySelectorAll('div[data-kuro-block]')
    // two cards + one blank line = three wrappers
    expect(boxes.length).toBe(3)
    expect(ed.wysiwyg.querySelectorAll('a.kuro-url-card').length).toBe(2)
    // the middle wrapper is the blank line
    expect(boxes[1].innerHTML).toBe('<br>')
  })

  it('also boxes a media-fallback card (same inline-atomic problem)', () => {
    // a video token in an image-only host degrades to a fallback card
    const ed = new KuroEditor(makeMount(), {
      initialContent: '[[vid-1|]]',
      mediaKinds: ['image'],
    })
    const fb = ed.wysiwyg.querySelector('a.kuro-media-fallback-card')
    if (fb) {
      expect(fb.parentElement.hasAttribute('data-kuro-block')).toBe(true)
    }
  })

  it('does NOT box a media <figure> (already a block) or an inline card-link', () => {
    const ed = new KuroEditor(makeMount(), {
      initialContent: '[[img-1|]]<p>see [[[https://x.example]]] inline</p>',
    })
    const fig = ed.wysiwyg.querySelector('figure')
    if (fig) expect(fig.parentElement).toBe(ed.wysiwyg)   // not wrapped
    const chip = ed.wysiwyg.querySelector('a.kuro-card-link')
    if (chip) expect(chip.closest('[data-kuro-block]')).toBe(null)  // stays inline
  })

  it('wrappers never carry a data-bid (not persisted)', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '[[https://a.example|]]<br>[[https://b.example|]]',
    })
    for (const box of ed.wysiwyg.querySelectorAll('div[data-kuro-block]')) {
      expect(box.hasAttribute('data-bid')).toBe(false)
    }
  })

  it('getContent() strips the wrappers — stored form is token-based, unchanged', () => {
    const src = '<h2>【出典】</h2>[[https://www.kantou.gr.jp/|]]<br>[[https://ja.wikipedia.org/wiki/x|]]'
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: src })
    const out = ed.getContent()
    expect(out).not.toContain('data-kuro-block')
    expect(out).toContain('[[https://www.kantou.gr.jp/|]]')
    expect(out).toContain('[[https://ja.wikipedia.org/wiki/x|]]')
    // no <a class="kuro-url-card"> leaked into storage (tokens only)
    expect(out).not.toContain('kuro-url-card')
  })

  it('load → save is STABLE (round-trips without drift)', () => {
    const src = '<h2 data-bid="h">t</h2>[[https://a.example|]]<br data-bid="b">[[https://c.example|]]'
    const ed = new KuroEditor(makeMount(), { blockIds: true, initialContent: src })
    const once = ed.getContent()
    // feed it back — a second load/save must produce the same thing
    ed.setContent(once)
    const twice = ed.getContent()
    expect(twice).toBe(once)
  })

  it('Delete on the blank line between two boxed cards keeps both cards', () => {
    const ed = new KuroEditor(makeMount(), {
      blockIds: true,
      initialContent: '[[https://a.example|]]<br>[[https://b.example|]]',
    })
    const blank = ed.wysiwyg.querySelectorAll('div[data-kuro-block]')[1]
    const sel = window.getSelection()
    const r = document.createRange()
    r.setStart(blank, 0); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)
    const e = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })
    ed.wysiwyg.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(ed.wysiwyg.querySelectorAll('a.kuro-url-card').length).toBe(2)
    // the blank-line wrapper is gone
    expect(ed.wysiwyg.querySelectorAll('div[data-kuro-block]').length).toBe(2)
  })
})
