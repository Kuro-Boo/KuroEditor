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
    // 変更が無いと保存ボタンは disabled なので、入力を模擬してから押す
    ed2.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
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

  // ── Dirty tracking (保存ボタンの活性制御) ──────────────────────────────────

  describe('dirty tracking / save button state', () => {
    it('save buttons start disabled (no unsaved changes)', () => {
      expect(editor.saveBtn.disabled).toBe(true)
      expect(editor.tabSaveBtn.disabled).toBe(true)
      expect(editor.isDirty()).toBe(false)
    })

    it('input enables the save buttons', () => {
      editor.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
      expect(editor.saveBtn.disabled).toBe(false)
      expect(editor.tabSaveBtn.disabled).toBe(false)
      expect(editor.isDirty()).toBe(true)
    })

    it('DOM mutation without an input event also marks dirty (popup/table ops)', async () => {
      const p = editor.wysiwyg.querySelector('p')
      p.appendChild(document.createTextNode('!'))
      await new Promise((r) => setTimeout(r, 0))  // MutationObserver は非同期配信
      expect(editor.isDirty()).toBe(true)
      expect(editor.saveBtn.disabled).toBe(false)
    })

    it('clicking save disables the buttons again', () => {
      const onSave = vi.fn()
      editor.options.onSave = onSave
      editor.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
      editor.saveBtn.click()
      expect(onSave).toHaveBeenCalledOnce()
      expect(editor.saveBtn.disabled).toBe(true)
      expect(editor.isDirty()).toBe(false)
    })

    it('disabled save button does not fire onSave', () => {
      const onSave = vi.fn()
      editor.options.onSave = onSave
      editor.saveBtn.click()  // clean 状態 → disabled → click は無効
      expect(onSave).not.toHaveBeenCalled()
    })

    it('setContent resets dirty state', async () => {
      editor.wysiwyg.dispatchEvent(new Event('input', { bubbles: true }))
      expect(editor.isDirty()).toBe(true)
      editor.setContent('<p>Fresh</p>')
      await new Promise((r) => setTimeout(r, 0))
      expect(editor.isDirty()).toBe(false)
      expect(editor.saveBtn.disabled).toBe(true)
    })

    it('editing in source mode marks dirty', () => {
      editor.setMode('source')
      editor.sourceArea.value = '<p>edited</p>'
      editor.sourceArea.dispatchEvent(new Event('input', { bubbles: true }))
      expect(editor.isDirty()).toBe(true)
    })

    it('mode switching alone does not mark dirty', async () => {
      editor.setMode('source')
      editor.setMode('wysiwyg')
      await new Promise((r) => setTimeout(r, 0))
      expect(editor.isDirty()).toBe(false)
      expect(editor.saveBtn.disabled).toBe(true)
    })
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

  // ── ホスト設定オプション (modalMenu / saveUi / canvasDark) ─────────────────

  describe('host options', () => {
    it('default: mmenu is mounted to document.body', () => {
      expect(document.body.contains(editor.mmenu)).toBe(true)
    })

    it('modalMenu: false keeps mmenu out of the DOM but the reference alive', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { modalMenu: false })
      expect(ed.mmenu).toBeDefined()
      expect(document.body.contains(ed.mmenu)).toBe(false)
    })

    it('modalMenu: false wins over modalToolbar slot', () => {
      document.body.innerHTML = ''
      const slot = document.createElement('div')
      document.body.appendChild(slot)
      const ed = new KuroEditor(makeMount(), { modalMenu: false, modalToolbar: slot })
      expect(slot.contains(ed.mmenu)).toBe(false)
    })

    it('default: save UI (autosave check + save buttons) is visible', () => {
      expect(editor.root.contains(editor.tabSaveBtn)).toBe(true)
      expect(editor.root.contains(editor.tabAutoSaveCheck)).toBe(true)
      expect(editor.mmenu.contains(editor.saveBtn)).toBe(true)
    })

    it('saveUi: false hides save button + autosave check in tabs and mmenu', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { saveUi: false })
      expect(ed.root.contains(ed.tabSaveBtn)).toBe(false)
      expect(ed.root.contains(ed.tabAutoSaveCheck)).toBe(false)
      expect(ed.mmenu.contains(ed.saveBtn)).toBe(false)
    })

    it('saveUi: false disables the built-in auto-save timer', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { saveUi: false })
      expect(ed._autoSaveTimer).toBeNull()
      ed._startAutoSave()           // 明示的に呼ばれても起動しない
      expect(ed._autoSaveTimer).toBeNull()
    })

    it('default: canvas follows the persisted preference (light when unset)', () => {
      expect(editor.isCanvasDark()).toBe(false)
    })

    it('default: dark-mode toggle checkbox is hidden', () => {
      expect(editor.root.contains(editor.tabCanvasDarkCheck)).toBe(false)
    })

    it('canvasDarkUi: true shows the dark-mode toggle checkbox', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDarkUi: true })
      expect(ed.root.contains(ed.tabCanvasDarkCheck)).toBe(true)
    })

    it('toggle hidden → setCanvasDark still switches the canvas', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDark: false })
      ed.setCanvasDark(true)
      expect(ed.isCanvasDark()).toBe(true)
      expect(ed.tabCanvasDarkCheck.checked).toBe(true)  // 生成済み要素は同期される
    })

    it('canvasDark: true forces initial dark mode and syncs the checkbox', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDark: true })
      expect(ed.isCanvasDark()).toBe(true)
      expect(ed.tabCanvasDarkCheck.checked).toBe(true)
    })

    it('canvasDark: false overrides a persisted dark preference', () => {
      window.localStorage.setItem('kuro-editor-canvas-dark', '1')
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDark: false })
      expect(ed.isCanvasDark()).toBe(false)
      window.localStorage.removeItem('kuro-editor-canvas-dark')
    })

    it('canvasDark specified → toggling does not write localStorage', () => {
      window.localStorage.removeItem('kuro-editor-canvas-dark')
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDark: true })
      ed.setCanvasDark(false)
      expect(window.localStorage.getItem('kuro-editor-canvas-dark')).toBeNull()
    })

    it('canvasDark unspecified → toggling persists to localStorage (現状動作)', () => {
      editor.setCanvasDark(true)
      expect(window.localStorage.getItem('kuro-editor-canvas-dark')).toBe('1')
      editor.setCanvasDark(false)
      expect(window.localStorage.getItem('kuro-editor-canvas-dark')).toBe('0')
      window.localStorage.removeItem('kuro-editor-canvas-dark')
    })
  })

  // ── キャンバス配色 (canvasColors / canvasDarkColors) ────────────────────────

  describe('canvas colors', () => {
    it('canvasColors applies inline --kuro-canvas-* vars in light mode', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), {
        canvasDark: false,
        canvasColors: { bg: '#fafaf0', text: '#333333' },
      })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#fafaf0')
      expect(ed.root.style.getPropertyValue('--kuro-canvas-text')).toBe('#333333')
    })

    it('canvasDarkColors applies inline vars in dark mode; unset keys fall back', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), {
        canvasDark: true,
        canvasDarkColors: { bg: '#101418' },
      })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#101418')
      // text は未指定 → inline なし（スタイルシートのダーク既定にフォールバック）
      expect(ed.root.style.getPropertyValue('--kuro-canvas-text')).toBe('')
    })

    it('only the active mode\'s palette is inlined (canvasColors not leaked into dark)', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), {
        canvasDark: true,
        canvasColors: { bg: '#fafaf0' },
        canvasDarkColors: { bg: '#101418' },
      })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#101418')
    })

    it('toggling the mode swaps which palette is inlined', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), {
        canvasDark: false,
        canvasColors: { bg: '#fafaf0' },
        canvasDarkColors: { bg: '#101418' },
      })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#fafaf0')
      ed.setCanvasDark(true)
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#101418')
      ed.setCanvasDark(false)
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#fafaf0')
    })

    it('canvasDarkColors unset → dark mode keeps stylesheet defaults (初期値)', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), {
        canvasDark: true,
        canvasColors: { bg: '#fafaf0' },
      })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('')
    })

    it('setCanvasDarkColors() updates at runtime and null restores defaults', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDark: true })
      ed.setCanvasDarkColors({ bg: '#101418', caret: '#facc15' })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#101418')
      expect(ed.root.style.getPropertyValue('--kuro-canvas-caret')).toBe('#facc15')
      ed.setCanvasDarkColors(null)
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('')
      expect(ed.root.style.getPropertyValue('--kuro-canvas-caret')).toBe('')
    })

    it('setCanvasColors() while dark does not inline anything until back in light', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { canvasDark: true })
      ed.setCanvasColors({ bg: '#fafaf0' })
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('')
      ed.setCanvasDark(false)
      expect(ed.root.style.getPropertyValue('--kuro-canvas-bg')).toBe('#fafaf0')
    })
  })
})
