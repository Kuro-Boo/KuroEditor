import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor() {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, {})
}

function paste(ed, { text = '', html = '' }) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  event.clipboardData = {
    items: [],
    getData: (type) => type === 'text/plain' ? text : type === 'text/html' ? html : '',
  }
  ed.wysiwyg.dispatchEvent(event)
  return event
}

describe('paste — 複数行テキストと CSV / TSV の判定', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('callout 内の構造付き複数行コピーを表に変換しない', () => {
    const ed = makeEditor()
    const pasteHtml = vi.spyOn(ed, '_pasteSanitizedHTML').mockImplementation(() => {})
    const pasteTable = vi.spyOn(ed, '_pasteTabularData').mockImplementation(() => {})
    const html = '<div class="kuro-callout kuro-callout--tip"><p>一行目, 注意</p><p>二行目</p></div>'

    const event = paste(ed, { text: '一行目, 注意\n二行目', html })

    expect(event.defaultPrevented).toBe(true)
    expect(pasteHtml).toHaveBeenCalledWith(html)
    expect(pasteTable).not.toHaveBeenCalled()
  })

  it('列数が揃わない純テキストは通常の複数行本文として扱う', () => {
    const ed = makeEditor()
    const pasteTable = vi.spyOn(ed, '_pasteTabularData').mockImplementation(() => {})

    const event = paste(ed, { text: '一行目, 注意\n二行目' })

    expect(event.defaultPrevented).toBe(false)
    expect(pasteTable).not.toHaveBeenCalled()
  })

  it('全行の列数が揃った純 CSV / TSV は引き続き表に変換する', () => {
    const ed = makeEditor()
    const pasteTable = vi.spyOn(ed, '_pasteTabularData').mockImplementation(() => {})

    const csv = paste(ed, { text: '名前,年齢\nクロ,3' })
    const tsv = paste(ed, { text: '名前\t年齢\nクロ\t3' })

    expect(csv.defaultPrevented).toBe(true)
    expect(tsv.defaultPrevented).toBe(true)
    expect(pasteTable).toHaveBeenNthCalledWith(1, '名前,年齢\nクロ,3')
    expect(pasteTable).toHaveBeenNthCalledWith(2, '名前\t年齢\nクロ\t3')
  })
})
