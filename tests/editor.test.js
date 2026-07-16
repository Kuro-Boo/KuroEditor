/**
 * Integration tests — KuroEditor class (DOM interaction via happy-dom)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KuroEditor as RealKuroEditor, createTableHtml, linkAtCaret } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  el.id = 'editor-mount'
  document.body.appendChild(el)
  return el
}

// 未destroyのeditorはdirty検知のsetTimeout(_histTimer, 400ms)を残したまま次の
// テスト/ファイル終了後まで生き延びることがあり、happy-domのteardown後に発火
// して `document is not defined` の未処理例外になる(テスト自体はpassしていても
// CI が落ちる、たまにしか起きないflaky挙動)。この最下層のクラス差し替えで
// `new KuroEditor(...)` を書いている全箇所(この共有 editor も、個別の it() 内で
// 作る ed も)を自動追跡し、テストごとに afterEach で確実に destroy() する。
const _createdEditors = []
class KuroEditor extends RealKuroEditor {
  constructor(...args) {
    super(...args)
    _createdEditors.push(this)
  }
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

  // 一部のテストは本文中で document.body.innerHTML = '' して独立した ed を作るため、
  // その時点で root は既に親を失っている — destroy() 内の
  // clearTimeout/_dirtyObserver.disconnect() は先頭で済むので効果はあるが、末尾の
  // root.replaceWith() は親なしだと投げる。ここは後始末目的で結果を問わないので握り潰す。
  afterEach(() => {
    while (_createdEditors.length) {
      try { _createdEditors.pop().destroy() } catch {}
    }
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

    // コードブロックの <textarea> は stopPropagation で wysiwyg へ input を
    // 流さず、value 変更は MutationObserver にも映らない。dirty 検知は
    // _wireCodeBlock 内の専用リスナーが直接駆動する。
    it('code-block textarea input marks dirty (does not rely on bubbling)', () => {
      editor.setContent('<pre class="kuro-code"><code>x</code></pre>')
      const ta = editor.wysiwyg.querySelector('.kuro-code__area')
      expect(ta).not.toBeNull()
      expect(editor.isDirty()).toBe(false)

      // 念のため: textarea の input は wysiwyg までバブルしない（仕様）
      const leaked = vi.fn()
      editor.wysiwyg.addEventListener('input', leaked)
      ta.value = 'edited code'
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      expect(leaked).not.toHaveBeenCalled()

      expect(editor.isDirty()).toBe(true)
      expect(editor.saveBtn.disabled).toBe(false)
    })

    it('setContent (load) with a code block does not mark dirty', async () => {
      editor.setContent('<pre class="kuro-code"><code>loaded</code></pre>')
      await new Promise((r) => setTimeout(r, 0))
      expect(editor.isDirty()).toBe(false)
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

    it('default: version badge is shown in the tab bar', () => {
      expect(editor.root.querySelector('.kuro-tabs__version')).not.toBeNull()
    })

    it('versionUi: false hides the version badge', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { versionUi: false })
      expect(ed.root.querySelector('.kuro-tabs__version')).toBeNull()
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

  // ── clipControl (ポップアップのコピー/切り取り/貼り付けボタン) ─────────────

  describe('clipControl', () => {
    const clipBtn = (ed, cmd) => ed.popm.el.querySelector(`[data-command="${cmd}"]`)

    /** wysiwyg 内の要素全体を選択する（selection をライブにした状態でボタン押下を再現） */
    function selectAll(ed, el) {
      const sel = window.getSelection()
      sel.setBaseAndExtent(el, 0, el, el.childNodes.length)
      return sel
    }

    function tap(btn) {
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    }

    it('default: clipboard buttons are not added to the popup', () => {
      expect(clipBtn(editor, 'clipCopy')).toBeNull()
      expect(clipBtn(editor, 'clipCut')).toBeNull()
      expect(clipBtn(editor, 'clipPaste')).toBeNull()
    })

    it('clipControl: true adds copy / cut / paste buttons', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { clipControl: true })
      expect(clipBtn(ed, 'clipCopy')).not.toBeNull()
      expect(clipBtn(ed, 'clipCut')).not.toBeNull()
      expect(clipBtn(ed, 'clipPaste')).not.toBeNull()
    })

    it('copy button calls onClipCopy with the selection text + html', () => {
      document.body.innerHTML = ''
      const onClipCopy = vi.fn()
      const ed = new KuroEditor(makeMount(), {
        clipControl: true, onClipCopy,
        initialContent: '<p>Hello <b>World</b></p>',
      })
      selectAll(ed, ed.wysiwyg.querySelector('p'))
      tap(clipBtn(ed, 'clipCopy'))
      expect(onClipCopy).toHaveBeenCalledTimes(1)
      const payload = onClipCopy.mock.calls[0][0]
      expect(payload.html).toContain('<b>World</b>')
      expect(payload.text).toContain('Hello')
      // コピーは選択を消さない
      expect(ed.wysiwyg.textContent).toBe('Hello World')
    })

    it('cut button calls onClipCut and removes the selection from the editor', () => {
      document.body.innerHTML = ''
      const onClipCut = vi.fn()
      const ed = new KuroEditor(makeMount(), {
        clipControl: true, onClipCut,
        initialContent: '<p>Hello <b>World</b></p>',
      })
      selectAll(ed, ed.wysiwyg.querySelector('p'))
      tap(clipBtn(ed, 'clipCut'))
      expect(onClipCut).toHaveBeenCalledTimes(1)
      expect(onClipCut.mock.calls[0][0].html).toContain('<b>World</b>')
      expect(ed.wysiwyg.textContent).toBe('')
    })

    it('paste button inserts the string returned by onClipPaste', async () => {
      document.body.innerHTML = ''
      const onClipPaste = vi.fn(() => 'PASTED')
      const ed = new KuroEditor(makeMount(), {
        clipControl: true, onClipPaste,
        initialContent: '<p>Hello</p>',
      })
      selectAll(ed, ed.wysiwyg.querySelector('p'))
      tap(clipBtn(ed, 'clipPaste'))
      await Promise.resolve()  // _clipPaste は async — マイクロタスクを流す
      await Promise.resolve()
      expect(onClipPaste).toHaveBeenCalledTimes(1)
      expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'PASTED')
    })

    it('onClipPaste returning nothing → host handles insertion, editor inserts nothing', async () => {
      document.body.innerHTML = ''
      const onClipPaste = vi.fn(() => undefined)
      const ed = new KuroEditor(makeMount(), {
        clipControl: true, onClipPaste,
        initialContent: '<p>Hello</p>',
      })
      selectAll(ed, ed.wysiwyg.querySelector('p'))
      tap(clipBtn(ed, 'clipPaste'))
      await Promise.resolve()
      await Promise.resolve()
      expect(onClipPaste).toHaveBeenCalledTimes(1)
      expect(document.execCommand).not.toHaveBeenCalledWith('insertText', false, expect.anything())
    })

    it('selection collapsed → copy / cut do nothing', () => {
      document.body.innerHTML = ''
      const onClipCopy = vi.fn()
      const onClipCut  = vi.fn()
      const ed = new KuroEditor(makeMount(), {
        clipControl: true, onClipCopy, onClipCut,
        initialContent: '<p>Hello</p>',
      })
      const sel = window.getSelection()
      const p = ed.wysiwyg.querySelector('p')
      sel.setBaseAndExtent(p, 0, p, 0)  // collapsed
      tap(clipBtn(ed, 'clipCopy'))
      tap(clipBtn(ed, 'clipCut'))
      expect(onClipCopy).not.toHaveBeenCalled()
      expect(onClipCut).not.toHaveBeenCalled()
      expect(ed.wysiwyg.textContent).toBe('Hello')
    })
  })

  // ── URL カード ([[URL|]] — 表題なしを明示するとカード表示) ─────────────────

  describe('URL card', () => {
    it('setContent renders [[URL|]] as a card and getContent round-trips', () => {
      editor.setContent('<p>[[https://example.com/post|]]</p>')
      const card = editor.wysiwyg.querySelector('.kuro-url-card')
      expect(card).not.toBeNull()
      expect(card.getAttribute('contenteditable')).toBe('false')
      expect(card.querySelector('.kuro-url-card__title').textContent).toBe('example.com')
      expect(editor.getContent()).toBe('<p>[[https://example.com/post|]]</p>')
    })

    it('[[URL]] (パイプなし) は従来どおり青いテキストリンクのまま', () => {
      editor.setContent('<p>[[https://example.com/post]]</p>')
      expect(editor.wysiwyg.querySelector('.kuro-url-card')).toBeNull()
      const a = editor.wysiwyg.querySelector('a[data-kuro-link]')
      expect(a).not.toBeNull()
      expect(a.textContent).toBe('https://example.com/post')
    })

    it('link edit popup has the card toggle (説明文は置かず、チェックボックスで示す)', () => {
      const popup = editor.linkEditPopup.el
      expect(popup.querySelector('.kuro-link-edit__card-toggle')).not.toBeNull()
      expect(popup.querySelector('.kuro-link-edit__hint')).toBeNull()
    })

    it('clicking a card inside the editor opens the link edit popup instead of navigating', () => {
      editor.setContent('<p>[[https://example.com/post|]]</p>')
      const card = editor.wysiwyg.querySelector('.kuro-url-card')
      const e = new MouseEvent('click', { bubbles: true, cancelable: true })
      card.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(card)
      // readLinkParts 経由でフィールドが同期される（表示テキストは空）
      expect(editor.linkEditPopup._textInput.value).toBe('')
      expect(editor.linkEditPopup._urlInput.value).toBe('https://example.com/post')
    })
  })

  // ── リンク編集ポップアップ: カード切替 UI と削除ボタン ───────────────────────

  describe('LinkEditPopup — card toggle / delete', () => {
    /** 本文の最初の <a> を掴んでポップアップを開く */
    const openOn = (html) => {
      editor.setContent(html)
      const a = editor.wysiwyg.querySelector('a')
      editor.linkEditPopup.open(a)
      return a
    }
    const popup = () => editor.linkEditPopup
    const check = (on) => {
      popup()._cardToggle.checked = on
      popup()._cardToggle.dispatchEvent(new Event('change', { bubbles: true }))
    }

    it('カード表示 ON → 表示テキスト欄を隠して編集不可にする', () => {
      openOn('<p>[[https://example.com/post|タイトル]]</p>')
      expect(popup()._textRow.hidden).toBe(false)
      expect(popup()._textInput.disabled).toBe(false)

      check(true)
      expect(popup()._textRow.hidden).toBe(true)
      expect(popup()._textInput.disabled).toBe(true)
      expect(editor.wysiwyg.querySelector('.kuro-url-card')).not.toBeNull()
      expect(editor.getContent()).toBe('<p>[[https://example.com/post|]]</p>')
    })

    it('カード表示 OFF → 表示テキスト欄が戻り、URL が既定の表示テキストになる', () => {
      openOn('<p>[[https://example.com/post|]]</p>')
      expect(popup()._textRow.hidden).toBe(true)   // 開いた時点でカード → 隠れている

      check(false)
      expect(popup()._textRow.hidden).toBe(false)
      expect(popup()._textInput.disabled).toBe(false)
      expect(editor.wysiwyg.querySelector('.kuro-url-card')).toBeNull()
      expect(editor.getContent()).toBe('<p>[[https://example.com/post]]</p>')
    })

    it('既存カードを開くと、チェック済み + 表示テキスト欄が隠れた状態で開く', () => {
      openOn('<p>[[https://example.com/post|]]</p>')
      expect(popup()._cardToggle.checked).toBe(true)
      expect(popup()._textRow.hidden).toBe(true)
      expect(popup()._textInput.disabled).toBe(true)
    })

    it('表示テキストを手で空にした場合もチェックと欄の状態が実態に追従する', () => {
      const a = openOn('<p>[[https://example.com/post|タイトル]]</p>')
      // 入力中はフォーカスが飛ばないよう欄は出したまま、チェックだけ追従する
      popup()._textInput.focus()
      popup()._textInput.value = ''
      popup()._textInput.dispatchEvent(new Event('input', { bubbles: true }))
      expect(popup()._cardToggle.checked).toBe(true)
      expect(popup()._textRow.hidden).toBe(false)

      // 欄から抜けたら畳む
      popup()._textInput.blur()
      expect(popup()._textRow.hidden).toBe(true)
      expect(popup()._textInput.disabled).toBe(true)
    })

    it('🗑 → リンクだけの行 (li) は行ごと消える', () => {
      openOn('<ol><li>[[https://example.com/1|出典 1]]</li><li>[[https://example.com/2|出典 2]]</li></ol>')
      popup()._delBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

      const items = editor.wysiwyg.querySelectorAll('li')
      expect(items.length).toBe(1)
      expect(items[0].textContent).toBe('出典 2')
      expect(popup().isVisible).toBe(false)
    })

    it('🗑 → 文中のリンクは周囲のテキストを残してリンクだけ消える', () => {
      openOn('<p>前 [[https://example.com/post|リンク]] 後</p>')
      popup()._delBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

      expect(editor.wysiwyg.querySelector('a')).toBeNull()
      expect(editor.wysiwyg.querySelector('p').textContent).toBe('前  後')
    })

    it('🗑 → 最後の li を消すとリスト自体も片付ける', () => {
      openOn('<ol><li>[[https://example.com/1|出典 1]]</li></ol>')
      popup()._delBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

      expect(editor.wysiwyg.querySelector('ol')).toBeNull()
      expect(editor.wysiwyg.querySelector('li')).toBeNull()
    })

    it('IME 変換確定の Enter ではポップアップを閉じない', () => {
      openOn('<p>[[https://example.com/post|タイトル]]</p>')
      expect(popup().isVisible).toBe(true)

      // 日本語入力で漢字を確定した Enter（composition 中）
      popup()._textInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true, isComposing: true,
      }))
      expect(popup().isVisible).toBe(true)

      // 変換確定ではない素の Enter は従来どおり閉じる
      popup()._textInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true,
      }))
      expect(popup().isVisible).toBe(false)
    })

    it('IME 用の keyCode 229 の Enter でも閉じない（古い Safari / Android IME）', () => {
      openOn('<p>[[https://example.com/post|タイトル]]</p>')
      const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      Object.defineProperty(e, 'keyCode', { value: 229 })
      popup()._textInput.dispatchEvent(e)
      expect(popup().isVisible).toBe(true)
    })

    it('🗑 → カードも同じく削除でき、input イベントで保存が走る', () => {
      openOn('<p>[[https://example.com/post|]]</p>')
      const onInput = vi.fn()
      editor.wysiwyg.addEventListener('input', onInput)
      popup()._delBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

      expect(editor.wysiwyg.querySelector('.kuro-url-card')).toBeNull()
      expect(onInput).toHaveBeenCalled()
    })
  })

  // ── リンクポップアップの出現条件と位置（v2.11.0） ──────────────────────────

  describe('link popup — 出現条件はリンクの直前 / 直後のみ', () => {
    const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    const caretAt = (node, offset) => {
      window.getSelection().setBaseAndExtent(node, offset, node, offset)
      document.dispatchEvent(new Event('selectionchange'))
    }

    it('リンク文字列の【途中】にキャレットがあるだけでは開かない', () => {
      editor.setContent('<p>前 [[https://example.com/xyz|リンクの文字]] 後</p>')
      const a = editor.wysiwyg.querySelector('a')
      caretAt(a.firstChild, 3)   // リンク文字列の途中
      expect(editor.linkEditPopup.isVisible).toBe(false)
    })

    // ブラウザはリンクのすぐ右（左）をクリックすると、キャレットを <a> の外ではなく
    // 【内側テキストの末尾（先頭）】に置く。DOM 上の隣接だけを見ていた v2.11.0/2.11.1 では
    // 「リンクの右にキャレットがあるのにポップアップが出ない」状態だった。
    it('リンク内側テキストの末尾（＝見た目はリンクの右）でも開く', () => {
      editor.setContent('<p>[[https://kuro.boo/|黒兎]]</p>')
      const a = editor.wysiwyg.querySelector('a')
      const t = a.firstChild
      caretAt(t, t.textContent.length)
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(a)
    })

    it('リンクが 2 件並んでいて間にキャレット → 前のリンクを開く', () => {
      editor.setContent('<p>[[https://example.com/a|前のリンク]][[https://example.com/b|後のリンク]]</p>')
      const [first, second] = editor.wysiwyg.querySelectorAll('a')

      // ブラウザは境目のキャレットを「後ろのリンクの内側先頭」に置くことがある
      caretAt(second.firstChild, 0)
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(first)
      expect(editor.linkEditPopup._urlInput.value).toBe('https://example.com/a')

      // 要素境界に立った場合も同じく前のリンク
      const p = first.parentNode
      caretAt(p, 1)
      expect(editor.linkEditPopup.activeLink).toBe(first)

      // 後ろのリンクの末尾なら後ろのリンク
      caretAt(second.firstChild, second.textContent.length)
      expect(editor.linkEditPopup.activeLink).toBe(second)
    })

    it('リンク内側テキストの先頭（＝見た目はリンクの左）でも開く', () => {
      editor.setContent('<p>[[https://kuro.boo/|黒兎]]</p>')
      const a = editor.wysiwyg.querySelector('a')
      caretAt(a.firstChild, 0)
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(a)
    })

    it('リンクの直後にキャレットが来たら開く', () => {
      editor.setContent('<p>前 [[https://example.com/x|リンク]] 後</p>')
      const a = editor.wysiwyg.querySelector('a')
      caretAt(a.nextSibling, 0)  // リンクの直後（後続テキストの先頭）
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(a)
    })

    it('リンクの直前にキャレットが来ても開く', () => {
      editor.setContent('<p>前 [[https://example.com/x|リンク]] 後</p>')
      const a = editor.wysiwyg.querySelector('a')
      const before = a.previousSibling
      caretAt(before, before.textContent.length)
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(a)
    })

    it('リンクをクリックするとキャレットがリンクの直後へ移り、そこで開く', () => {
      editor.setContent('<p>前 [[https://example.com/x|リンク]] 後</p>')
      const a = editor.wysiwyg.querySelector('a')
      const e = new MouseEvent('click', { bubbles: true, cancelable: true })
      a.dispatchEvent(e)

      expect(e.defaultPrevented).toBe(true)   // 遷移させない
      expect(editor.linkEditPopup.isVisible).toBe(true)
      expect(editor.linkEditPopup.activeLink).toBe(a)

      // キャレットはリンクの「中」ではなく「直後」に立っている
      const r = window.getSelection().getRangeAt(0)
      expect(r.collapsed).toBe(true)
      expect(linkAtCaret(r, editor.wysiwyg)).toBe(a)   // 隣接だけが true になる関数
      expect(a.contains(r.startContainer)).toBe(false) // リンクの内部ではない
    })

    it('URL カードをクリックしてもキャレットはカードの直後へ移る', () => {
      editor.setContent('<p>[[https://example.com/post|]]</p>')
      const card = editor.wysiwyg.querySelector('.kuro-url-card')
      click(card)

      expect(editor.linkEditPopup.activeLink).toBe(card)
      const r = window.getSelection().getRangeAt(0)
      expect(linkAtCaret(r, editor.wysiwyg)).toBe(card)
      expect(card.contains(r.startContainer)).toBe(false)
    })

    it('カード型リンク [[[slug]]] は編集対象外（遷移させる）', () => {
      editor.setContent('<p>[[[my-page]]]</p>')
      const a = editor.wysiwyg.querySelector('a.kuro-card-link')
      const e = new MouseEvent('click', { bubbles: true, cancelable: true })
      a.dispatchEvent(e)

      expect(e.defaultPrevented).toBe(false)  // 従来どおりブラウザに任せる
      expect(editor.linkEditPopup.isVisible).toBe(false)
    })

    it('要素境界のキャレット（矩形 0）でも、直前ノードの行末を位置の基準にする', () => {
      // 「本文を一度も触らずにリンクボタンを押した」等では、キャレットが要素の
      // 境界に立つ。ブラウザはこの range に矩形 0 を返すため、素朴に使うと
      // ポップアップが本文の下（フォールバック位置）へ飛んでしまっていた。
      editor.setContent('<p>本文の末尾</p>')
      const p = editor.wysiwyg.querySelector('p')

      const origRect  = Range.prototype.getBoundingClientRect
      const origRects = Range.prototype.getClientRects
      Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 })
      Range.prototype.getClientRects = () => [{ top: 100, bottom: 120, left: 10, right: 60, width: 50, height: 20 }]
      try {
        const range = document.createRange()
        range.selectNodeContents(p)
        range.collapse(false)          // <p> の末尾 = 要素境界
        const rect = editor.linkEditPopup._rectForRange(range)
        // 直前ノード（テキスト）の最終行の【右端】がキャレット位置
        expect(rect.left).toBe(60)
        expect(rect.top).toBe(100)
        expect(rect.bottom).toBe(120)
      } finally {
        Range.prototype.getBoundingClientRect = origRect
        Range.prototype.getClientRects = origRects
      }
    })

    it('位置決めはリンク要素ではなくキャレット基準', () => {
      editor.setContent('<p>前 [[https://example.com/x|リンク]] 後</p>')
      const a = editor.wysiwyg.querySelector('a')
      // リンク要素は遠く（下 500px）、キャレットは近く（上 100px）という状況を作る。
      // getRangeAt() は毎回新しい Range を返すので prototype 側を差し替える
      a.getBoundingClientRect = () => ({ top: 500, bottom: 520, left: 500, right: 700, width: 200, height: 20 })
      const orig = Range.prototype.getBoundingClientRect
      Range.prototype.getBoundingClientRect = () =>
        ({ top: 100, bottom: 120, left: 40, right: 40, width: 0, height: 20 })
      try {
        const sel = window.getSelection()
        sel.setBaseAndExtent(a.nextSibling, 0, a.nextSibling, 0)
        editor.linkEditPopup.open(a)
      } finally {
        Range.prototype.getBoundingClientRect = orig
      }
      // キャレットのすぐ下（bottom + 6）に出る。リンク基準なら 526px になる
      expect(editor.linkEditPopup.el.style.top).toBe('126px')
      expect(editor.linkEditPopup.el.style.left).toBe('40px')
    })
  })

  // ── ツールバーのリンクボタン（新規リンク挿入） ─────────────────────────────

  describe('toolbar link button', () => {
    const popup = () => editor.linkEditPopup
    /** キャレット（またはテキスト選択）を本文に置く */
    const select = (start, end) => {
      const t = editor.wysiwyg.querySelector('p').firstChild
      window.getSelection().setBaseAndExtent(t, start, t, end)
    }
    const type = (input, value) => {
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    it('リンクボタンがツールバー（タブバー / mmenu 両方）にある', () => {
      expect(editor._tabActionBtns.link).toBeDefined()
      expect(editor._mmenuBtns.link).toBeDefined()
      expect(editor._tabActionBtns.link.getAttribute('title')).toContain('リンク')
    })

    it('押すとカーソル位置でリンクポップアップが開く（本文はまだ変わらない）', () => {
      editor.setContent('<p>ここに入れる</p>')
      select(3, 3)
      editor._tabActionBtns.link.click()

      expect(popup().isVisible).toBe(true)
      expect(popup().activeLink).toBeNull()          // <a> はまだ作らない
      expect(popup()._pendingRange).not.toBeNull()
      expect(editor.getContent()).toBe('<p>ここに入れる</p>')
    })

    it('URL を入れた時点でリンクが本文へ挿入される', () => {
      editor.setContent('<p>ここに入れる</p>')
      select(3, 3)
      editor._tabActionBtns.link.click()
      type(popup()._textInput, '公式サイト')
      type(popup()._urlInput, 'https://example.com/post')

      expect(editor.getContent()).toBe('<p>ここに[[https://example.com/post|公式サイト]]入れる</p>')
      expect(popup().activeLink).not.toBeNull()
      expect(popup()._pendingRange).toBeNull()
    })

    it('選択していた文字列が表示テキストの初期値になり、リンクに置き換わる', () => {
      editor.setContent('<p>前 選択語 後</p>')
      select(2, 5)   // 「選択語」
      editor._tabActionBtns.link.click()
      expect(popup()._textInput.value).toBe('選択語')

      type(popup()._urlInput, 'https://example.com/x')
      expect(editor.getContent()).toBe('<p>前 [[https://example.com/x|選択語]] 後</p>')
    })

    it('URL を入れずに閉じると本文には何も残らない', () => {
      editor.setContent('<p>そのまま</p>')
      select(2, 2)
      editor._tabActionBtns.link.click()
      type(popup()._textInput, 'テキストだけ入れた')
      popup().close()

      expect(editor.wysiwyg.querySelector('a')).toBeNull()
      expect(editor.getContent()).toBe('<p>そのまま</p>')
    })

    it('新規リンクで 🗑 はキャンセル（本文を触らずに閉じる）', () => {
      editor.setContent('<p>そのまま</p>')
      select(2, 2)
      editor._tabActionBtns.link.click()
      popup()._delBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

      expect(popup().isVisible).toBe(false)
      expect(editor.getContent()).toBe('<p>そのまま</p>')
    })

    it('新規リンクは表示テキスト空でもカード化しない（URL を表示テキストにする）', () => {
      // 既存リンクの「表示テキストを空にする = カード化」を新規リンクに適用すると、
      // URL を打ち始めた瞬間にカード化し、カード中は隠れる仕様の表示テキスト欄が
      // 消えて題名を入力できなくなる。新規リンクではカードはチェックで明示させる。
      editor.setContent('<p>x</p>')
      select(1, 1)
      editor._tabActionBtns.link.click()
      type(popup()._urlInput, 'https://example.com/post')

      expect(editor.wysiwyg.querySelector('.kuro-url-card')).toBeNull()
      expect(editor.getContent()).toBe('<p>x[[https://example.com/post]]</p>')
      // 題名を入力できる状態が保たれている
      expect(popup()._textRow.hidden).toBe(false)
      expect(popup()._textInput.disabled).toBe(false)

      // 続けて題名を打てば通常のテキストリンクになる
      type(popup()._textInput, '記事')
      expect(editor.getContent()).toBe('<p>x[[https://example.com/post|記事]]</p>')
    })

    it('新規リンクでもカード表示チェックを入れれば URL カードで挿入される', () => {
      editor.setContent('<p>x</p>')
      select(1, 1)
      editor._tabActionBtns.link.click()
      popup()._cardToggle.checked = true
      popup()._cardToggle.dispatchEvent(new Event('change', { bubbles: true }))
      type(popup()._urlInput, 'https://example.com/post')

      expect(editor.wysiwyg.querySelector('.kuro-url-card')).not.toBeNull()
      expect(editor.getContent()).toBe('<p>x[[https://example.com/post|]]</p>')
    })

    it('記法を壊す URL は挿入されない（リンクを作らない）', () => {
      editor.setContent('<p>x</p>')
      select(1, 1)
      editor._tabActionBtns.link.click()
      type(popup()._textInput, 'ラベル')
      type(popup()._urlInput, 'https://example.com/a|b')

      expect(editor.wysiwyg.querySelector('a')).toBeNull()
      expect(editor.getContent()).toBe('<p>x</p>')
    })

    it('挿入したリンクは undo で消せる', () => {
      editor.setContent('<p>ここに入れる</p>')
      select(3, 3)
      editor._tabActionBtns.link.click()
      type(popup()._textInput, 'ラベル')
      type(popup()._urlInput, 'https://example.com/z')
      editor._commitSnapshot()
      expect(editor.getContent()).toContain('[[https://example.com/z|ラベル]]')

      editor._undo()
      expect(editor.getContent()).toBe('<p>ここに入れる</p>')
    })

    it('閲覧モードではリンクボタンが無効', () => {
      editor.setMode('view')
      expect(editor._tabActionBtns.link.disabled).toBe(true)
      editor._handleMMenu('link')
      expect(editor.linkEditPopup.isVisible).toBe(false)
    })
  })

  // ── Undo / Redo (自前スナップショット履歴) ─────────────────────────────────

  describe('undo / redo', () => {
    /** MutationObserver → デバウンス を待たずに履歴へ確定させる */
    const commit = () => editor._commitSnapshot()
    /**
     * DOM 直接操作をシミュレートする。テーブル・水平線などの実際の挿入は
     * execFormat('insertHTML') 経由で、テスト環境では execCommand が stub の
     * ため走らない。履歴が見ているのは「wysiwyg の DOM が変わったか」なので、
     * ここでは同じ土俵（DOM を直接いじる）に置き換えて検証する。
     */
    const domEdit = (html) => { editor.wysiwyg.insertAdjacentHTML('beforeend', html) }

    it('DOM 直接操作 (水平線の挿入) を undo で取り消せる', () => {
      editor.setContent('<p>元の本文</p>')
      domEdit('<hr class="kuro-hr">')
      commit()
      expect(editor.getContent()).toContain('<hr')

      editor._undo()
      expect(editor.getContent()).not.toContain('<hr')
      expect(editor.getContent()).toContain('元の本文')
    })

    it('undo した DOM 直接操作を redo でやり直せる', () => {
      editor.setContent('<p>元の本文</p>')
      domEdit('<hr class="kuro-hr">')
      commit()
      editor._undo()
      expect(editor.getContent()).not.toContain('<hr')

      editor._redo()
      expect(editor.getContent()).toContain('<hr')
    })

    it('🗑 のリンク削除も undo で戻る (ブラウザ内蔵履歴には載らない操作)', () => {
      editor.setContent('<ol><li>[[https://example.com/1|出典 1]]</li><li>[[https://example.com/2|出典 2]]</li></ol>')
      const a = editor.wysiwyg.querySelector('a')
      editor.linkEditPopup.open(a)
      editor.linkEditPopup._delBtn.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      commit()
      expect(editor.getContent()).not.toContain('出典 1')

      editor._undo()
      expect(editor.getContent()).toContain('出典 1')
      expect(editor.getContent()).toContain('出典 2')
    })

    it('テーブル挿入 → undo → テーブルが消え、直前の本文が残る', () => {
      editor.setContent('<p>base</p>')
      domEdit(createTableHtml(2, 2))
      commit()
      expect(editor.getContent()).toContain('<table')

      editor._undo()
      expect(editor.getContent()).not.toContain('<table')
      expect(editor.getContent()).toContain('base')
    })

    it('複数手を積んで 1 手ずつ戻れる', () => {
      editor.setContent('<p>0</p>')
      domEdit('<hr class="kuro-hr">');   commit()
      domEdit(createTableHtml(2, 2));    commit()

      editor._undo()   // テーブルだけ取り消し
      expect(editor.getContent()).not.toContain('<table')
      expect(editor.getContent()).toContain('<hr')

      editor._undo()   // 水平線も取り消し
      expect(editor.getContent()).not.toContain('<hr')
      expect(editor.getContent()).toContain('<p>0</p>')
    })

    it('undo 後に新しい編集をすると redo 分は捨てられる', () => {
      editor.setContent('<p>0</p>')
      domEdit('<hr class="kuro-hr">'); commit()
      editor._undo()
      expect(editor.getContent()).not.toContain('<hr')

      domEdit(createTableHtml(2, 2)); commit()
      editor._redo()   // 捨てられた <hr> は戻らない
      expect(editor.getContent()).toContain('<table')
      expect(editor.getContent()).not.toContain('<hr')
    })

    it('setContent は履歴をリセットする（前の文書へは戻さない）', () => {
      editor.setContent('<p>文書 A</p>')
      editor._insertHR(); commit()
      editor.setContent('<p>文書 B</p>')

      editor._undo()
      expect(editor.getContent()).toBe('<p>文書 B</p>')
    })

    it('最初の状態より前には戻らない / 最新より先には進まない', () => {
      editor.setContent('<p>only</p>')
      editor._undo(); editor._undo()
      expect(editor.getContent()).toBe('<p>only</p>')
      editor._redo(); editor._redo()
      expect(editor.getContent()).toBe('<p>only</p>')
    })

    it('undo すると未保存状態になる（保存ボタンが押せる）', () => {
      editor.setContent('<p>x</p>')
      domEdit('<hr class="kuro-hr">'); commit()
      editor._clearDirty()
      expect(editor.saveBtn.disabled).toBe(true)

      editor._undo()
      expect(editor.saveBtn.disabled).toBe(false)
    })

    it('コードブロック textarea の編集も履歴に載り undo で戻る', () => {
      editor.setContent('<p>base</p><pre class="kuro-code"><code>before</code></pre>')
      const ta = editor.wysiwyg.querySelector('.kuro-code__area')
      ta.value = 'after'
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      commit()
      expect(editor.getContent()).toContain('after')

      editor._undo()
      expect(editor.getContent()).toContain('before')
      expect(editor.getContent()).not.toContain('after')
    })

    it('閲覧モードでは undo / redo が効かない', () => {
      editor.setContent('<p>base</p>')
      domEdit('<hr class="kuro-hr">'); commit()
      editor.setMode('view')

      editor._undo()
      expect(editor.getContent()).toContain('<hr')
    })
  })

  // ── 閲覧モード (view) ───────────────────────────────────────────────────────

  describe('view mode (閲覧・編集不可)', () => {
    const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    it('タブは 編集 / 閲覧 / HTML の 3 つ', () => {
      const tabs = [...editor.root.querySelectorAll('.kuro-tab')].map((t) => t.getAttribute('data-tab'))
      expect(tabs).toEqual(['wysiwyg', 'view', 'source'])
    })

    it('閲覧タブ → contenteditable を切り、編集アクションを無効化する', () => {
      click(editor.tabView)
      expect(editor.getMode()).toBe('view')
      expect(editor.wysiwyg.getAttribute('contenteditable')).toBe('false')
      expect(editor.tabView.classList.contains('kuro-tab--active')).toBe(true)
      expect(editor.tabWysiwyg.classList.contains('kuro-tab--active')).toBe(false)
      expect(editor._tabActionBtns.table.disabled).toBe(true)
      expect(editor._mmenuBtns.media.disabled).toBe(true)
      expect(editor._tabUndoBtn.disabled).toBe(true)

      click(editor.tabWysiwyg)
      expect(editor.wysiwyg.getAttribute('contenteditable')).toBe('true')
      expect(editor._tabActionBtns.table.disabled).toBe(false)
      expect(editor._mmenuBtns.media.disabled).toBe(false)
    })

    it('編集 ⇔ 閲覧 の往復で本文が失われない (sourceArea で上書きしない)', () => {
      editor.setContent('<p>生きている本文</p>')
      click(editor.tabView)
      expect(editor.wysiwyg.textContent).toContain('生きている本文')
      click(editor.tabWysiwyg)
      expect(editor.getContent()).toBe('<p>生きている本文</p>')
    })

    it('閲覧モードのリンククリック → 遷移せず確認ダイアログが出る（編集ポップアップは出ない）', () => {
      editor.setContent('<p>[[https://example.com/post|記事]]</p>')
      click(editor.tabView)

      const a = editor.wysiwyg.querySelector('a')
      const e = new MouseEvent('click', { bubbles: true, cancelable: true })
      a.dispatchEvent(e)

      expect(e.defaultPrevented).toBe(true)
      expect(editor.linkOpenDialog.isVisible).toBe(true)
      expect(editor.linkOpenDialog._url.textContent).toContain('https://example.com/post')
      expect(editor.linkEditPopup.isVisible).toBe(false)
    })

    it('URL カードでもダイアログの表示は URL 1 行だけ（カード内のテキストを連結しない）', () => {
      editor.setContent('<p>[[https://kuro.boo/|]]</p>')
      click(editor.tabView)
      click(editor.wysiwyg.querySelector('.kuro-url-card'))

      const box = editor.linkOpenDialog._box
      expect(editor.linkOpenDialog._url.textContent).toBe('https://kuro.boo/')
      // カードのタイトル / ↗ が混ざった行が残っていないこと
      expect(box.textContent).not.toContain('↗ https')
      expect(box.textContent).not.toContain('kuro.boohttps')
    })

    it('確認ダイアログ: 開く → window.open / キャンセル → 何もしない', () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null)
      editor.setContent('<p>[[https://example.com/post|記事]]</p>')
      click(editor.tabView)

      click(editor.wysiwyg.querySelector('a'))
      click(editor.linkOpenDialog._cancelBtn)
      expect(open).not.toHaveBeenCalled()
      expect(editor.linkOpenDialog.isVisible).toBe(false)

      click(editor.wysiwyg.querySelector('a'))
      click(editor.linkOpenDialog._openBtn)
      expect(open).toHaveBeenCalledWith('https://example.com/post', '_blank', 'noopener')
      expect(editor.linkOpenDialog.isVisible).toBe(false)
      open.mockRestore()
    })

    it('閲覧モードの URL カードも編集ポップアップではなく確認ダイアログ', () => {
      editor.setContent('<p>[[https://example.com/post|]]</p>')
      click(editor.tabView)

      click(editor.wysiwyg.querySelector('.kuro-url-card'))
      expect(editor.linkOpenDialog.isVisible).toBe(true)
      expect(editor.linkEditPopup.isVisible).toBe(false)
    })

    it('閲覧モードでは選択しても書式ポップアップ (popm) が出ない', () => {
      editor.setContent('<p>選択されるテキスト</p>')
      click(editor.tabView)

      const p = editor.wysiwyg.querySelector('p')
      window.getSelection().setBaseAndExtent(p.firstChild, 0, p.firstChild, 5)
      editor.wysiwyg.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      expect(editor.popm.el.classList.contains('kuro-popm--visible')).toBe(false)
    })

    it('閲覧モードではコードブロックの textarea も編集不可 (readOnly)', () => {
      editor.setContent('<pre class="kuro-code"><code>const a = 1</code></pre>')
      const ta = editor.wysiwyg.querySelector('.kuro-code__area')
      expect(ta).not.toBeNull()
      expect(ta.readOnly).toBe(false)

      click(editor.tabView)
      expect(ta.readOnly).toBe(true)
      click(editor.tabWysiwyg)
      expect(ta.readOnly).toBe(false)
    })

    it('閲覧モード中に setContent されたコードブロックも readOnly で張られる', () => {
      click(editor.tabView)
      editor.setContent('<pre class="kuro-code"><code>const a = 1</code></pre>')
      expect(editor.wysiwyg.querySelector('.kuro-code__area').readOnly).toBe(true)
    })

    it('閲覧モードでは挿入 API (_handleMMenu) を呼んでも本文が変わらない', () => {
      editor.setContent('<p>Hello</p>')
      click(editor.tabView)
      editor._handleMMenu('table')
      editor._handleMMenu('hr')
      expect(editor.wysiwyg.querySelector('table')).toBeNull()
      expect(editor.wysiwyg.querySelector('hr')).toBeNull()
    })

    it('閲覧モードではメディアのドロップを受け付けない', () => {
      const onMediaUpload = vi.fn()
      const ed = new KuroEditor(makeMount(), { initialContent: '<p>Hi</p>', onMediaUpload })
      ed.setMode('view')

      const file = new File(['x'], 'a.png', { type: 'image/png' })
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      drop.dataTransfer = { files: [file], types: ['Files'] }
      ed.wysiwyg.dispatchEvent(drop)

      expect(onMediaUpload).not.toHaveBeenCalled()
      expect(ed.wysiwyg.querySelector('figure')).toBeNull()
      expect(drop.defaultPrevented).toBe(true)   // ブラウザにファイルを開かせもしない
    })

    it('閲覧モードでは画像ペーストも挿入しない', () => {
      const onMediaUpload = vi.fn()
      const ed = new KuroEditor(makeMount(), { initialContent: '<p>Hi</p>', onMediaUpload })
      ed.setMode('view')

      const file = new File(['x'], 'a.png', { type: 'image/png' })
      const paste = new Event('paste', { bubbles: true, cancelable: true })
      paste.clipboardData = { items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }] }
      ed.wysiwyg.dispatchEvent(paste)

      expect(onMediaUpload).not.toHaveBeenCalled()
      expect(ed.wysiwyg.querySelector('figure')).toBeNull()
    })

    it('閲覧モードでは列幅ドラッグ (TableResizer) が始まらない', () => {
      click(editor.tabView)
      expect(editor.tableResizer._enabled).toBe(false)
      click(editor.tabWysiwyg)
      expect(editor.tableResizer._enabled).toBe(true)
    })
  })

  // ── URL カードの豪華表示 (onFetchUrlMeta / 2 段階表示) ───────────────────────

  describe('URL card enhancement (onFetchUrlMeta)', () => {
    const flush = () => new Promise((r) => setTimeout(r, 0))

    it('default: no onFetchUrlMeta → card stays as the simple hostname display', async () => {
      editor.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      const card = editor.wysiwyg.querySelector('.kuro-url-card')
      expect(card.classList.contains('kuro-url-card--rich')).toBe(false)
      expect(card.querySelector('.kuro-url-card__favicon')).toBeNull()
      expect(card.querySelector('.kuro-url-card__title').textContent).toBe('example.com')
    })

    it('step 1 is synchronous (simple card) then step 2 upgrades in place', async () => {
      document.body.innerHTML = ''
      const onFetchUrlMeta = vi.fn(async () => ({
        title: '記事タイトル',
        description: '記事の説明文',
        favicon: 'https://example.com/favicon.ico',
        image: 'https://example.com/og.png',
      }))
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      // 同期直後: 簡易表示（ホスト名）でありネットワークを待っていない
      const card = ed.wysiwyg.querySelector('.kuro-url-card')
      expect(card.classList.contains('kuro-url-card--rich')).toBe(false)
      expect(card.querySelector('.kuro-url-card__title').textContent).toBe('example.com')
      // 非同期解決後: 豪華表示に差し替わる
      await flush()
      expect(onFetchUrlMeta).toHaveBeenCalledWith('https://example.com/post')
      expect(card.classList.contains('kuro-url-card--rich')).toBe(true)
      expect(card.querySelector('.kuro-url-card__title').textContent).toBe('記事タイトル')
      expect(card.querySelector('.kuro-url-card__desc').textContent).toBe('記事の説明文')
      expect(card.querySelector('.kuro-url-card__favicon').getAttribute('src')).toBe('https://example.com/favicon.ico')
      expect(card.querySelector('.kuro-url-card__thumb').getAttribute('src')).toBe('https://example.com/og.png')
    })

    it('enhancement is presentational only — getContent still returns [[slug|]]', async () => {
      document.body.innerHTML = ''
      const onFetchUrlMeta = vi.fn(async () => ({ title: 'T', favicon: 'https://x/f.ico' }))
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      expect(ed.wysiwyg.querySelector('.kuro-url-card--rich')).not.toBeNull()
      expect(ed.getContent()).toBe('<p>[[https://example.com/post|]]</p>')
    })

    it('enhancement does not mark the document dirty', async () => {
      document.body.innerHTML = ''
      const onDirty = vi.fn()
      const onFetchUrlMeta = vi.fn(async () => ({ title: 'T' }))
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta, onDirty })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      expect(ed.wysiwyg.querySelector('.kuro-url-card--rich')).not.toBeNull()
      expect(ed.isDirty()).toBe(false)
      expect(onDirty).not.toHaveBeenCalled()
    })

    it('caches per slug — the same URL is fetched only once across re-renders', async () => {
      document.body.innerHTML = ''
      const onFetchUrlMeta = vi.fn(async () => ({ title: 'T' }))
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      ed.setContent('<p>[[https://example.com/post|]]</p>')  // 再描画
      await flush()
      expect(onFetchUrlMeta).toHaveBeenCalledTimes(1)
    })

    it('null / failed fetch keeps the simple card (no crash)', async () => {
      document.body.innerHTML = ''
      const onFetchUrlMeta = vi.fn(async () => { throw new Error('network') })
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      const card = ed.wysiwyg.querySelector('.kuro-url-card')
      expect(card).not.toBeNull()
      expect(card.classList.contains('kuro-url-card--rich')).toBe(false)
      expect(card.querySelector('.kuro-url-card__title').textContent).toBe('example.com')
    })

    it('escapes untrusted fetched title/description (XSS-safe)', async () => {
      document.body.innerHTML = ''
      const onFetchUrlMeta = vi.fn(async () => ({ title: '<img src=x onerror=alert(1)>hi' }))
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      const titleEl = ed.wysiwyg.querySelector('.kuro-url-card__title')
      // タグとして解釈されず、テキストとして入る
      expect(titleEl.querySelector('img')).toBeNull()
      expect(titleEl.textContent).toBe('<img src=x onerror=alert(1)>hi')
    })

    it('drops non-http(s) favicon/image URLs (only safe schemes rendered)', async () => {
      document.body.innerHTML = ''
      const onFetchUrlMeta = vi.fn(async () => ({
        title: 'T', favicon: 'javascript:alert(1)', image: 'ftp://x/y.png',
      }))
      const ed = new KuroEditor(makeMount(), { onFetchUrlMeta })
      ed.setContent('<p>[[https://example.com/post|]]</p>')
      await flush()
      const card = ed.wysiwyg.querySelector('.kuro-url-card')
      expect(card.querySelector('.kuro-url-card__favicon')).toBeNull()  // 不正 → 内蔵 SVG のまま
      expect(card.querySelector('.kuro-url-card__thumb')).toBeNull()
      expect(card.querySelector('.kuro-url-card__icon svg')).not.toBeNull()
    })
  })

  // ── テーブルの結合/分割 (rowspan/colspan を跨いだ論理列マッピング) ──────────────
  // 回帰対象: 既にどこかに rowspan/colspan があるテーブルで ↓結合 を押すと、
  // cellIndex ベースの実装は「隣の行の物理的に同じインデックスのセル」という
  // 無関係なセルを結合してしまい、テーブル全体がズレて壊れていた。

  describe('table merge/split (rowspan/colspan-aware)', () => {
    const putCaretIn = (cell) => {
      window.getSelection().setBaseAndExtent(cell, 0, cell, 0)
    }

    it('↓結合: 既に rowspan があると隣の行は無関係なセルを巻き込んでいた — 正しい行まで正しく結合する', () => {
      editor.wysiwyg.innerHTML =
        '<table class="kuro-table"><tbody>' +
          '<tr><td>1</td><td>Model A</td><td rowspan="2">Anthropic</td><td>クローズド</td><td>80%</td></tr>' +
          '<tr><td>2</td><td>Model B</td><td>クローズド</td><td>77%</td></tr>' +
        '</tbody></table>'
      const row0 = editor.wysiwyg.querySelectorAll('tr')[0]
      putCaretIn(row0.cells[3])   // row0's "クローズド" (physically index 3, logical col 3)
      editor.tableManager._mergeDown()

      const rows = editor.wysiwyg.querySelectorAll('tr')
      // row0's クローズド absorbs row1's own クローズド (same logical column) —
      // NOT row1's score cell, which the old cellIndex-based code would have hit.
      expect(Array.from(rows[0].cells).map(c => c.textContent)).toEqual(['1', 'Model A', 'Anthropic', 'クローズドクローズド', '80%'])
      expect(rows[0].cells[3].getAttribute('rowspan')).toBe('2')
      // row1 keeps its own untouched cells — no column got shifted or eaten.
      expect(Array.from(rows[1].cells).map(c => c.textContent)).toEqual(['2', 'Model B', '77%'])
    })

    it('↓結合: 結合先が無い(表の下端)場合は何もしない', () => {
      editor.wysiwyg.innerHTML =
        '<table class="kuro-table"><tbody><tr><td>A</td></tr></tbody></table>'
      const cell = editor.wysiwyg.querySelector('td')
      putCaretIn(cell)
      editor.tableManager._mergeDown()
      expect(cell.getAttribute('rowspan')).toBeNull()
      expect(cell.textContent).toBe('A')
    })

    it('結合→: 同じ行内の隣接セルを結合する', () => {
      editor.wysiwyg.innerHTML =
        '<table class="kuro-table"><tbody><tr><td>A</td><td>B</td><td>C</td></tr></tbody></table>'
      const cells = editor.wysiwyg.querySelectorAll('td')
      putCaretIn(cells[0])
      editor.tableManager._mergeRight()
      const row = editor.wysiwyg.querySelector('tr')
      expect(Array.from(row.cells).map(c => c.textContent)).toEqual(['AB', 'C'])
      expect(row.cells[0].getAttribute('colspan')).toBe('2')
    })

    it('↓結合 → ↓分割 は元のセル数に戻る（分割で挿入するセルは正しい論理列に入る）', () => {
      editor.wysiwyg.innerHTML =
        '<table class="kuro-table"><tbody>' +
          '<tr><td>A</td><td>B</td><td>C</td></tr>' +
          '<tr><td>D</td><td>E</td><td>F</td></tr>' +
        '</tbody></table>'
      const rows = editor.wysiwyg.querySelectorAll('tr')
      putCaretIn(rows[0].cells[1])   // "B"
      editor.tableManager._mergeDown()
      expect(rows[0].cells[1].textContent).toBe('BE')
      expect(Array.from(rows[1].cells).map(c => c.textContent)).toEqual(['D', 'F'])

      putCaretIn(rows[0].cells[1])
      editor.tableManager._splitDown()
      expect(rows[0].cells[1].getAttribute('rowspan')).toBeNull()
      expect(Array.from(rows[1].cells).map(c => c.textContent)).toEqual(['D', '', 'F'])
    })

    it('マージボタンは矩形にならない相手には無効化される（表の右下角セル）', () => {
      editor.wysiwyg.innerHTML =
        '<table class="kuro-table"><tbody>' +
          '<tr><td>A</td><td>B</td></tr>' +
          '<tr><td>C</td><td>D</td></tr>' +
        '</tbody></table>'
      const cells = editor.wysiwyg.querySelectorAll('td')
      putCaretIn(cells[3])   // "D" — bottom-right corner, nothing below/right
      editor.tableManager._updateMergeSplitBtns()
      expect(editor.tableManager._mergeDownBtn.disabled).toBe(true)
      expect(editor.tableManager._mergeRightBtn.disabled).toBe(true)
    })
  })

  // ── メディアダイアログの accept (mediaAccept) ────────────────────────────────

  describe('mediaAccept', () => {
    it('既定は image/video/audio(従来互換)', () => {
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), { onMediaUpload: async () => '' })
      const input = ed.mediaDialog.el.querySelector('input[type="file"]')
      expect(input.getAttribute('accept')).toBe('image/*,video/*,audio/*')
    })

    it("mediaAccept: 'image/*' でファイル選択の accept が絞られる", () => {
      // 画像しか受け付けないホスト(KuroNote 等)向け。iOS WKWebView は accept に
      // audio 等が混ざると Files ピッカーだけになるため、絞ると写真ライブラリ/撮影が出る。
      document.body.innerHTML = ''
      const ed = new KuroEditor(makeMount(), {
        onMediaUpload: async () => '',
        mediaAccept: 'image/*',
      })
      const input = ed.mediaDialog.el.querySelector('input[type="file"]')
      expect(input.getAttribute('accept')).toBe('image/*')
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

  // ── 文字数カウンター(オドメーター) ──────────────────────────────────────────

  describe('char counter (odometer)', () => {
    const reels = (ed) => [...ed.charCount.querySelectorAll('.kuro-charcount__reel')]
    const shownDigits = (ed) =>
      reels(ed).map((r) => {
        const m = /translateY\((-?\d+)em\)/.exec(r.style.transform)
        return m ? -Number(m[1]) : 0
      }).join('')

    it('counter lives in the tab bar\'s bottom row (right-aligned), digits only, dir=ltr', () => {
      expect(editor.charCount.closest('.kuro-tabs__row--bottom')).not.toBeNull()
      expect(editor.charCount.parentElement.classList.contains('kuro-tabs__group--right')).toBe(true)
      expect(editor.charCount.getAttribute('dir')).toBe('ltr')
      expect(editor.charCount.textContent).not.toContain('文字数')
    })

    it('setContent rolls reels to the character count', () => {
      editor.setContent('<p>abcde</p>')
      expect(shownDigits(editor)).toBe('5')
    })

    it('thousands use a separator column and one reel per digit', () => {
      editor.setContent(`<p>${'あ'.repeat(1234)}</p>`)
      expect(shownDigits(editor)).toBe('1234')
      expect(editor.charCount.querySelector('.kuro-charcount__sep').textContent).toBe(',')
    })

    it('same digit shape reuses columns (reels roll in place)', () => {
      editor.setContent('<p>abcde</p>')
      const before = reels(editor)
      editor.setContent('<p>abcdefgh</p>')   // 5 → 8: 1 桁のまま
      expect(reels(editor)).toEqual(before)
      expect(shownDigits(editor)).toBe('8')
    })

    it('toolbar no longer shows a text char-count label', () => {
      expect(document.querySelector('.kuro-tabs__char-count')).toBeNull()
      expect(document.querySelector('.kuro-mmenu__char-count')).toBeNull()
    })
  })
})
