import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html, options = {}) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html, ...options })
}

function caretAtEnd(node) {
  const sel = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

describe('caret landing slots for terminal/frame blocks', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it.each([
    ['horizontal rule', '<hr class="kuro-hr">'],
    ['table', '<table><tbody><tr><td>A</td></tr></tbody></table>'],
    ['callout', '<div class="kuro-callout kuro-callout--tip"><p>A</p></div>'],
    ['roundbox', '<div class="kuro-roundbox"><p>A</p></div>'],
    ['figure', '<figure><img src="x"></figure>'],
  ])('adds an editing-only slot after a terminal %s', (_name, html) => {
    const ed = makeEditor(html)
    const slot = ed.wysiwyg.lastElementChild
    expect(slot.tagName).toBe('P')
    expect(slot.hasAttribute('data-kuro-caret-slot')).toBe(true)
    expect(ed.getContent()).not.toContain('data-kuro-caret-slot')
    expect(ed.getContent()).not.toMatch(/<p><br><\/p>$/)
  })

  it('adds a waypoint between adjacent barriers and after the terminal one', () => {
    const ed = makeEditor('<hr><table><tbody><tr><td>A</td></tr></tbody></table>')
    expect([...ed.wysiwyg.children].map((el) =>
      el.hasAttribute('data-kuro-caret-slot') ? 'slot' : el.tagName.toLowerCase(),
    )).toEqual(['hr', 'slot', 'table', 'slot'])
  })

  it('does not add a slot when a normal following paragraph already exists', () => {
    const ed = makeEditor('<table><tbody><tr><td>A</td></tr></tbody></table><p>after</p>')
    expect(ed.wysiwyg.querySelector('[data-kuro-caret-slot]')).toBeNull()
  })

  it('promotes a slot to a persisted block when typing starts', () => {
    const ed = makeEditor('<hr>', { blockIds: true })
    const slot = ed.wysiwyg.querySelector('[data-kuro-caret-slot]')
    caretAtEnd(slot)
    ed.wysiwyg.dispatchEvent(new InputEvent('beforeinput', {
      inputType: 'insertText', data: 'x', bubbles: true, cancelable: true,
    }))
    slot.textContent = 'x'
    ed.wysiwyg.dispatchEvent(new InputEvent('input', {
      inputType: 'insertText', data: 'x', bubbles: true,
    }))
    expect(slot.hasAttribute('data-kuro-caret-slot')).toBe(false)
    expect(slot.getAttribute('data-bid')).toBeTruthy()
    expect(ed.getContent()).toContain('>x</p>')
  })

  it.each([
    ['last table cell', '<table><tbody><tr><td>A</td></tr></tbody></table>', 'td'],
    ['last callout line', '<div class="kuro-callout"><p>A</p></div>', 'p'],
  ])('ArrowDown leaves the %s for the following slot', (_name, html, selector) => {
    const ed = makeEditor(html)
    caretAtEnd(ed.wysiwyg.querySelector(selector))
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    ed.wysiwyg.dispatchEvent(event)
    const slot = ed.wysiwyg.querySelector('[data-kuro-caret-slot]')
    expect(event.defaultPrevented).toBe(true)
    expect(slot.contains(window.getSelection().anchorNode) || window.getSelection().anchorNode === slot).toBe(true)
  })

  it('creates an authored paragraph when blank canvas below the content is tapped', () => {
    const ed = makeEditor('<p>A</p>', { blockIds: true })
    const first = ed.wysiwyg.firstElementChild
    first.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 0, right: 100, width: 100, height: 20 })
    expect(ed._insertParagraphAtBlankPoint(80)).toBe(true)
    const added = ed.wysiwyg.lastElementChild
    expect(added).not.toBe(first)
    expect(added.hasAttribute('data-kuro-caret-slot')).toBe(false)
    expect(added.getAttribute('data-bid')).toBeTruthy()
    expect(added.innerHTML).toBe('<br>')
  })

  it('turns a tapped terminal slot into an authored paragraph and places the caret', () => {
    const ed = makeEditor('<hr>', { blockIds: true })
    const slot = ed.wysiwyg.querySelector('[data-kuro-caret-slot]')
    const event = new Event('pointerdown', { bubbles: true, cancelable: true })
    slot.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(slot.hasAttribute('data-kuro-caret-slot')).toBe(false)
    expect(slot.getAttribute('data-bid')).toBeTruthy()
    expect(slot.contains(window.getSelection().anchorNode) || window.getSelection().anchorNode === slot).toBe(true)
  })

  it('creates a paragraph in a genuine gap, not beside a block in its vertical band', () => {
    const ed = makeEditor('<p>A</p><p>B</p>')
    const [a, b] = ed.wysiwyg.children
    a.getBoundingClientRect = () => ({ top: 10, bottom: 30 })
    b.getBoundingClientRect = () => ({ top: 70, bottom: 90 })
    expect(ed._insertParagraphAtBlankPoint(50)).toBe(true)
    expect(ed.wysiwyg.children[1].innerHTML).toBe('<br>')
    expect(ed._insertParagraphAtBlankPoint(80)).toBe(false)
    expect(ed.wysiwyg.children.length).toBe(3)
  })

  it('rebuilds the terminal slot after the following paragraph is deleted', async () => {
    const ed = makeEditor('<hr><p>after</p>')
    ed.wysiwyg.lastElementChild.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(ed.wysiwyg.lastElementChild.hasAttribute('data-kuro-caret-slot')).toBe(true)
  })
})
