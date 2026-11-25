/**
 * ボタン [[button:行き先|表示テキスト]](仕様 #spec-button・2026-11-25)。
 * 判定は classifyLink(エディタと公開で同じ)、行き先の解決は WiKi 型と同じ resolver。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor, renderSpecialLinks, unrenderSpecialLinks, readLinkParts } from '../src/editor.js'
import { classifyLink, LINK_TOKEN_RE } from '../src/kuro-links.js'
import { normalizeContentHtml } from '../src/normalize.js'

const groupsOf = (tok) => {
  const re = new RegExp(LINK_TOKEN_RE.source)
  const m = re.exec(tok)
  return { card: m[1], wikiSlug: m[2], wikiLabel: m[3], hyper: m[4] }
}

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('classifyLink: ボタン', () => {
  it('slug の行き先と表示テキスト', () => {
    const d = classifyLink(groupsOf('[[button:grouphome|一覧へ戻る]]'), (s) => `/x/${s}/`)
    expect(d).toEqual({ kind: 'button', slug: 'grouphome', url: '/x/grouphome/', label: '一覧へ戻る', isExternal: false })
  })
  it('外の URL は外部', () => {
    const d = classifyLink(groupsOf('[[button:https://example.com/a|見る]]'))
    expect(d.kind).toBe('button')
    expect(d.isExternal).toBe(true)
    expect(d.url).toBe('https://example.com/a')
  })
  it('表示テキストを省く・空にすると行き先を出す(URL カードにしない)', () => {
    expect(classifyLink(groupsOf('[[button:recruit]]'))).toMatchObject({ kind: 'button', label: 'recruit' })
    expect(classifyLink(groupsOf('[[button:recruit|]]'))).toMatchObject({ kind: 'button', label: 'recruit' })
  })
  it('画像の拡張子でもメディアにしない', () => {
    expect(classifyLink(groupsOf('[[button:img-1|見る]]')).kind).toBe('button')
    expect(classifyLink(groupsOf('[[button:https://e.com/a.png|見る]]')).kind).toBe('button')
  })
  it('行き先が空なら何もしない', () => {
    expect(classifyLink(groupsOf('[[button:|見る]]')).kind).toBe('text')
  })
})

describe('編集用の描画と保存', () => {
  it('書いたトークンが 1 文字も変わらずに戻る', () => {
    for (const tok of ['[[button:grouphome|一覧へ戻る]]', '[[button:recruit]]', '[[button:recruit|]]', '[[button:https://example.com/?a=1&amp;b=2|外へ]]']) {
      const html = `<p>前 ${tok} 後</p>`
      const r = renderSpecialLinks(html)
      expect(r).toContain('class="kuro-button"')
      expect(unrenderSpecialLinks(r)).toBe(html)
    }
  })
  it('外の URL は別タブ', () => {
    expect(renderSpecialLinks('[[button:https://example.com|外へ]]')).toContain('target="_blank" rel="noopener"')
    expect(renderSpecialLinks('[[button:grouphome|戻る]]')).not.toContain('target=')
  })
  it('readLinkParts は行き先と button を返す', () => {
    const div = document.createElement('div')
    div.innerHTML = renderSpecialLinks('[[button:grouphome|戻る]]')
    expect(readLinkParts(div.firstChild)).toEqual({ text: '戻る', url: 'grouphome', button: true })
  })
  it('本文の形は段落の中のボタンを外へ出さない', () => {
    const html = '<p>前 [[button:a.jpg|見る]] 後</p>'
    expect(normalizeContentHtml(html)).toBe(html)
  })
})

describe('リンク編集の「ボタンにする」', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('buttonUi を渡さないホストには出さない(描画と保存は効く)', () => {
    const ed = new KuroEditor(makeMount(), { initialContent: '<p>[[button:grouphome|戻る]]</p>' })
    expect(ed.linkEditPopup._buttonToggle).toBe(null)
    expect(ed.wysiwyg.querySelector('a.kuro-button')).not.toBe(null)
    expect(ed.getContent()).toContain('[[button:grouphome|戻る]]')
  })

  it('開くとチェックが今の形に合う', () => {
    const ed = new KuroEditor(makeMount(), { buttonUi: true, initialContent: '<p>[[button:grouphome|戻る]] [[grouphome|戻る]]</p>' })
    const [btn, link] = ed.wysiwyg.querySelectorAll('a')
    ed.linkEditPopup.open(btn)
    expect(ed.linkEditPopup._buttonToggle.checked).toBe(true)
    expect(ed.linkEditPopup._urlInput.value).toBe('grouphome')
    ed.linkEditPopup.open(link)
    expect(ed.linkEditPopup._buttonToggle.checked).toBe(false)
  })

  it('チェックでボタン、外すとリンクへ戻る', () => {
    const ed = new KuroEditor(makeMount(), { buttonUi: true, initialContent: '<p>[[grouphome|一覧へ戻る]]</p>' })
    const a = ed.wysiwyg.querySelector('a')
    const popup = ed.linkEditPopup
    popup.open(a)
    popup._buttonToggle.checked = true
    popup._buttonToggle.dispatchEvent(new Event('change'))
    expect(a.classList.contains('kuro-button')).toBe(true)
    expect(ed.getContent()).toContain('[[button:grouphome|一覧へ戻る]]')

    popup._buttonToggle.checked = false
    popup._buttonToggle.dispatchEvent(new Event('change'))
    expect(a.classList.contains('kuro-button')).toBe(false)
    expect(ed.getContent()).toContain('[[grouphome|一覧へ戻る]]')
  })

  it('カード表示を選ぶとボタンは外れる', () => {
    const ed = new KuroEditor(makeMount(), { buttonUi: true, initialContent: '<p>[[button:https://example.com|見る]]</p>' })
    const a = ed.wysiwyg.querySelector('a')
    const popup = ed.linkEditPopup
    popup.open(a)
    popup._cardToggle.checked = true
    popup._cardToggle.dispatchEvent(new Event('change'))
    expect(popup._buttonToggle.checked).toBe(false)
    expect(a.classList.contains('kuro-button')).toBe(false)
    expect(a.classList.contains('kuro-url-card')).toBe(true)
  })
})
