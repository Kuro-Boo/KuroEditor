/**
 * Integration tests — KuroEditor class (DOM interaction via happy-dom)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  el.id = 'editor-mount'
  document.body.appendChild(el)
  return el
}

describe('KuroEditor', () => {
  let mount
  let editor

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()  // reset execCommand spy between tests
    mount  = makeMount()
    editor = new KuroEditor(mount, { initialContent: '<p>Hello</p>' })
  })

  // ── Construction ────────────────────────────────────────────────────────────

  it('replaces mount element with editor root', () => {
    expect(document.getElementById('editor-mount')).toBeNull()
    expect(document.querySelector('[data-kuro-editor]')).not.toBeNull()
  })

  it('has data-kuro-editor attribute with version', () => {
    const root = document.querySelector('[data-kuro-editor]')
    expect(root.getAttribute('data-kuro-editor')).toMatch(/^\d+\.\d+\.\d+$/)
  })

  // ── Content API ─────────────────────────────────────────────────────────────

  it('setContent / getContent round-trip', () => {
    editor.setContent('<p>World</p>')
    expect(editor.getContent()).toBe('<p>World</p>')
  })

  it('initialContent is rendered', () => {
    expect(editor.getContent()).toContain('Hello')
  })

  it('getContent returns empty string when cleared', () => {
    editor.setContent('')
    expect(editor.getContent()).toBe('')
  })

  // ── Mode switching ──────────────────────────────────────────────────────────

  it('default mode is wysiwyg', () => {
    expect(editor.getMode()).toBe('wysiwyg')
  })

  it('setMode("source") switches to source mode', () => {
    editor.setMode('source')
    expect(editor.getMode()).toBe('source')
  })

  it('setMode("wysiwyg") switches back', () => {
    editor.setMode('source')
    editor.setMode('wysiwyg')
    expect(editor.getMode()).toBe('wysiwyg')
  })

  it('source textarea content mirrors wysiwyg after switch', () => {
    editor.setContent('<p>Test content</p>')
    editor.setMode('source')
    expect(editor.sourceArea.value).toContain('Test content')
  })

  it('wysiwyg content updates when switching back from source', () => {
    editor.setMode('source')
    editor.sourceArea.value = '<p>Edited in source</p>'
    editor.setMode('wysiwyg')
    expect(editor.getContent()).toContain('Edited in source')
  })

  // ── getContent in source mode ──────────────────────────────────────────────

  it('getContent() returns source textarea value in source mode', () => {
    editor.setMode('source')
    editor.sourceArea.value = '<h1>Source mode</h1>'
    expect(editor.getContent()).toBe('<h1>Source mode</h1>')
  })

  // ── Save callback ───────────────────────────────────────────────────────────

  it('calls onSave with current content when save button clicked', () => {
    const onSave = vi.fn()
    const m2 = makeMount()
    const ed2 = new KuroEditor(m2, { initialContent: '<p>Save me</p>', onSave })
    ed2.saveBtn.click()
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(expect.stringContaining('Save me'))
  })

  it('does not throw if no onSave option provided', () => {
    expect(() => editor.saveBtn.click()).not.toThrow()
  })

  // ── Tab bar ─────────────────────────────────────────────────────────────────

  it('tab buttons exist', () => {
    expect(editor.tabWysiwyg).toBeDefined()
    expect(editor.tabSource).toBeDefined()
  })

  it('clicking source tab changes mode', () => {
    editor.tabSource.click()
    expect(editor.getMode()).toBe('source')
  })

  it('clicking wysiwyg tab changes mode back', () => {
    editor.tabSource.click()
    editor.tabWysiwyg.click()
    expect(editor.getMode()).toBe('wysiwyg')
  })

  // ── Modal menu ──────────────────────────────────────────────────────────────

  it('modal menu buttons are present', () => {
    const btns = document.querySelectorAll('[data-mmenu]')
    const ids  = Array.from(btns).map(b => b.getAttribute('data-mmenu'))
    expect(ids).toContain('emoji')
    expect(ids).toContain('table')
    expect(ids).toContain('media')
    expect(ids).toContain('code')
  })

  it('table button calls execCommand', () => {
    const tableBtn = document.querySelector('[data-mmenu="table"]')
    tableBtn.click()
    // Match '<table' (with or without class attribute)
    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('<table'))
  })

  it('code button calls execCommand with the code-block wrap', () => {
    const codeBtn = document.querySelector('[data-mmenu="code"]')
    codeBtn.click()
    // textarea-based code block uses .kuro-code-wrap
    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('kuro-code-wrap'))
  })

  // ── Popup menu ──────────────────────────────────────────────────────────────

  it('popup menu is attached to the editor root', () => {
    expect(editor.popm).toBeDefined()
    expect(editor.popm.el).toBeDefined()
    expect(editor.root.contains(editor.popm.el)).toBe(true)
  })

  // ── Destroy ─────────────────────────────────────────────────────────────────

  it('destroy() removes editor from DOM', () => {
    editor.destroy()
    expect(document.querySelector('[data-kuro-editor]')).toBeNull()
  })

  // ── Heading-safe block merge (Backspace / Delete) ──────────────────────────
  // ブラウザ標準の結合は <h2> を <p><strong style="font-size:…"> に化けさせる
  // ため、見出しが絡む結合は _handleHeadingMerge が DOM 直接操作で行う。

  describe('heading-safe block merge', () => {
    function setCaret(node, offset) {
      const sel = window.getSelection()
      const r = document.createRange()
      r.setStart(node, offset)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    }

    function pressKey(key) {
      const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      editor.wysiwyg.dispatchEvent(e)
      return e
    }

    it('Delete on the empty line before a heading keeps the <h2> intact', () => {
      editor.setContent('<p><br></p><h2>Title</h2>')
      const p = editor.wysiwyg.querySelector('p')
      setCaret(p, 0)
      const e = pressKey('Delete')
      expect(e.defaultPrevented).toBe(true)
      // ToC が id を付けるので tag/text だけ検証
      expect(editor.wysiwyg.innerHTML).toMatch(/^<h2[^>]*>Title<\/h2>$/)
    })

    it('Backspace at heading start removes the empty line above, heading survives', () => {
      editor.setContent('<p><br></p><h2>Title</h2>')
      const h2 = editor.wysiwyg.querySelector('h2')
      setCaret(h2.firstChild, 0)
      const e = pressKey('Backspace')
      expect(e.defaultPrevented).toBe(true)
      expect(editor.wysiwyg.innerHTML).toMatch(/^<h2[^>]*>Title<\/h2>$/)
    })

    it('Backspace at heading start merges into the previous paragraph without inline garbage', () => {
      editor.setContent('<p>Intro</p><h2>Title</h2>')
      const h2 = editor.wysiwyg.querySelector('h2')
      setCaret(h2.firstChild, 0)
      const e = pressKey('Backspace')
      expect(e.defaultPrevented).toBe(true)
      expect(editor.wysiwyg.innerHTML).not.toContain('<strong')
      expect(editor.wysiwyg.innerHTML).not.toContain('font-size')
      expect(editor.wysiwyg.textContent).toBe('IntroTitle')
      expect(editor.wysiwyg.querySelectorAll('p').length).toBe(1)
    })

    it('Delete at end of a paragraph pulls the heading text up without inline garbage', () => {
      editor.setContent('<p>Intro</p><h2>Title</h2>')
      const p = editor.wysiwyg.querySelector('p')
      setCaret(p.firstChild, p.firstChild.length)
      const e = pressKey('Delete')
      expect(e.defaultPrevented).toBe(true)
      expect(editor.wysiwyg.innerHTML).not.toContain('<strong')
      expect(editor.wysiwyg.innerHTML).not.toContain('font-size')
      expect(editor.wysiwyg.textContent).toBe('IntroTitle')
    })

    it('Backspace in an empty heading removes it, previous paragraph untouched', () => {
      editor.setContent('<p>Intro</p><h2><br></h2>')
      const h2 = editor.wysiwyg.querySelector('h2')
      setCaret(h2, 0)
      const e = pressKey('Backspace')
      expect(e.defaultPrevented).toBe(true)
      expect(editor.wysiwyg.innerHTML).toBe('<p>Intro</p>')
    })

    it('paragraph-to-paragraph merge is left to the browser', () => {
      editor.setContent('<p>one</p><p>two</p>')
      const p2 = editor.wysiwyg.querySelectorAll('p')[1]
      setCaret(p2.firstChild, 0)
      const e = pressKey('Backspace')
      expect(e.defaultPrevented).toBe(false)
    })
  })
})
