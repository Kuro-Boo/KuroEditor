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

  it('code button calls execCommand with pre/code', () => {
    const codeBtn = document.querySelector('[data-mmenu="code"]')
    codeBtn.click()
    // Match '<pre' (with or without class attribute)
    expect(document.execCommand).toHaveBeenCalledWith('insertHTML', false, expect.stringContaining('<pre'))
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
})
