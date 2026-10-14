/**
 * アップロード失敗の印(uploadErrorText オプション)。
 *
 * - エディタは言語を持たないので、印の文はホストが渡せる(既定は日本語)。
 * - ファイル名は利用者が付けた任意の文字列 —— タグとして動かさない(v2.39 までは innerHTML に混ぜていた)。
 */
import { describe, it, expect } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function mount(options) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const ed = new KuroEditor(el, options)
  // 試験環境の execCommand は何もしない(tests/setup.js)。差し込みだけ肩代わりする。
  ed._restoreAndInsert = (html) => ed.wysiwyg.insertAdjacentHTML('beforeend', html)
  return ed
}

const failing = () => Promise.reject(new Error('quota'))
const file = (name) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })

describe('アップロード失敗の印', () => {
  it('既定は「アップロード失敗: ファイル名」', async () => {
    const ed = mount({ onMediaUpload: failing })
    await ed._insertMediaFile(file('a.png'))
    expect(ed.wysiwyg.querySelector('.kuro-media-error__msg').textContent).toBe('アップロード失敗: a.png')
  })

  it('ホストが渡した文を出す(ファイルと理由を受け取る)', async () => {
    const seen = []
    const ed = mount({
      onMediaUpload: failing,
      uploadErrorText: (f, err) => { seen.push(err.message); return `Upload failed: ${f.name}` },
    })
    await ed._insertMediaFile(file('b.png'))
    expect(ed.wysiwyg.querySelector('.kuro-media-error__msg').textContent).toBe('Upload failed: b.png')
    expect(seen).toEqual(['quota'])
  })

  it('ホストの関数が投げても既定の文に戻る', async () => {
    const ed = mount({ onMediaUpload: failing, uploadErrorText: () => { throw new Error('x') } })
    await ed._insertMediaFile(file('c.png'))
    expect(ed.wysiwyg.querySelector('.kuro-media-error__msg').textContent).toBe('アップロード失敗: c.png')
  })

  it('ファイル名のタグは動かさない(読み込み中の印も、失敗の印も)', async () => {
    let seenDuringUpload = null
    const ed = mount({
      onMediaUpload: () => {
        seenDuringUpload = ed.wysiwyg.querySelector('.kuro-media-placeholder__label')
        return Promise.reject(new Error('x'))
      },
    })
    await ed._insertMediaFile(file('<img src=x onerror=alert(1)>.png'))
    expect(seenDuringUpload.querySelector('img')).toBeNull()
    expect(seenDuringUpload.textContent).toBe('<img src=x onerror=alert(1)>.png')
    const msg = ed.wysiwyg.querySelector('.kuro-media-error__msg')
    expect(msg.querySelector('img')).toBeNull()
    expect(msg.textContent).toContain('<img src=x onerror=alert(1)>.png')
  })
})
