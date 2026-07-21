/**
 * 対応メディア種別(mediaKinds オプション)と接頭辞ベースの種別判定。
 *
 * - 種別(image/video/audio)は【スラッグ接頭辞】で確定する(vid-/aud-/img-/mid-)。
 *   解決後 URL の拡張子はフォールバック(裸 http URL)のみ。blob: の様に拡張子が
 *   無い URL でも接頭辞から正しく判定される。
 * - ホストが対応しない種別のトークンは再生要素でなく【リンクカード】に落とす。
 *   data-kuro-media を保持するので getContent で往復し、対応ホストでは再生される。
 *   URL 指定(解決後が http)ならクリックできるカード、内部 ID なら href なしカード。
 *   保存フォーマット(トークン)は不変なのでホスト接続部に影響しない。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'
import {
  mediaKindFromSlug,
  normalizeMediaKinds,
  classifyLink,
  renderSpecialLinks,
} from '../src/kuro-links.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('mediaKindFromSlug — 接頭辞で種別を確定(拡張子はフォールバック)', () => {
  it('typed prefix が拡張子より優先(blob: URL でも正しい)', () => {
    expect(mediaKindFromSlug('vid-1', 'blob:xyz')).toBe('video')
    expect(mediaKindFromSlug('aud-1', 'blob:xyz')).toBe('audio')
    expect(mediaKindFromSlug('img-1', 'blob:xyz')).toBe('image')
    expect(mediaKindFromSlug('mid-1', 'blob:xyz')).toBe('image')
  })
  it('typed prefix は拡張子の食い違いに惑わされない', () => {
    // slug が動画なのに URL が .png でも video のまま(接頭辞優先)
    expect(mediaKindFromSlug('vid-1', 'https://x/y.png')).toBe('video')
  })
  it('untyped(http URL)は拡張子でフォールバック', () => {
    expect(mediaKindFromSlug('https://x/y.mp4', 'https://x/y.mp4')).toBe('video')
    expect(mediaKindFromSlug('https://x/y.mp3', 'https://x/y.mp3')).toBe('audio')
    expect(mediaKindFromSlug('https://x/y.png', 'https://x/y.png')).toBe('image')
    expect(mediaKindFromSlug('https://x/y', 'https://x/y')).toBe('image') // 既定は image
  })
})

describe('classifyLink — supportedKinds で unsupported を立てる', () => {
  const R = (s) => (s.startsWith('http') ? s : `blob:${s}`)
  it('全対応(null)なら unsupported は false', () => {
    const d = classifyLink({ hyper: 'vid-1' }, R, null)
    expect(d.kind).toBe('media')
    expect(d.mediaKind).toBe('video')
    expect(d.unsupported).toBe(false)
  })
  it("['image'] のみ対応なら vid-/aud- は unsupported=true・image は false", () => {
    const only = normalizeMediaKinds(['image'])
    expect(classifyLink({ hyper: 'vid-1' }, R, only).unsupported).toBe(true)
    expect(classifyLink({ hyper: 'aud-1' }, R, only).unsupported).toBe(true)
    expect(classifyLink({ hyper: 'mid-1' }, R, only).unsupported).toBe(false)
    expect(classifyLink({ hyper: 'img-1' }, R, only).unsupported).toBe(false)
  })
})

describe('renderSpecialLinks — 非対応はリンクカード + トークン往復', () => {
  const R = (s) => (s.startsWith('http') ? s : `blob:${s}`)
  it("['image'] で [[vid-1]](内部 ID・URL 無し)は href なしカード・data-kuro-media 保持", () => {
    const html = renderSpecialLinks('[[vid-1]]', R, normalizeMediaKinds(['image']))
    expect(html).toContain('kuro-media-fallback-card')
    expect(html).toContain('data-kuro-media="vid-1"')
    expect(html).not.toContain('<video')
    expect(html).not.toContain('href=') // blob: は http でないので href は付かない
    // ⚠ url-card クラスは付けない(URL カード用 UI がトークンを書き換えるため)
    expect(html).not.toContain('class="kuro-url-card"')
    expect(html).not.toContain('data-kuro-wiki')
  })
  it("['image'] で URL 指定の動画 [[https://x/y.mp4]] はクリックできるカード", () => {
    const html = renderSpecialLinks('[[https://x/y.mp4]]', R, normalizeMediaKinds(['image']))
    expect(html).toContain('kuro-media-fallback-card')
    expect(html).toContain('href="https://x/y.mp4"')
    // data-kuro-media は URL エンコードされて往復する(unrenderSpecialLinks が復号)
    expect(html).toContain(`data-kuro-media="${encodeURIComponent('https://x/y.mp4')}"`)
    expect(html).not.toContain('<video')
  })
  it("['image'] で [[img-1]] は通常の <img> のまま", () => {
    const html = renderSpecialLinks('[[img-1]]', R, normalizeMediaKinds(['image']))
    expect(html).toContain('<img')
    expect(html).not.toContain('fallback-card')
  })
  it('全対応(null)なら [[vid-1]] は通常の <video>', () => {
    const html = renderSpecialLinks('[[vid-1]]', R, null)
    expect(html).toContain('<video')
    expect(html).not.toContain('fallback-card')
  })
})

describe('KuroEditor 統合 — mediaKinds:["image"] のホスト', () => {
  beforeEach(() => { document.body.innerHTML = '' })
  const resolver = (s) => (s.startsWith('http') ? s : `blob:${s}`)

  it('非対応メディアはリンクカードで描画され、getContent はトークンを失わない', () => {
    const ed = new KuroEditor(makeMount(), { urlResolver: resolver, mediaKinds: ['image'] })
    ed.setContent('<p>[[vid-1]]</p>')
    // 画面にはリンクカード(壊れた <video> ではない)
    expect(ed.wysiwyg.querySelector('a.kuro-media-fallback-card')).toBeTruthy()
    expect(ed.wysiwyg.querySelector('video')).toBeNull()
    // getContent はトークンへ往復(データを失わない=同期で保全され、対応ホストでは再生)
    expect(ed.getContent()).toContain('[[vid-1]]')
  })

  it('画像は通常表示(カードに落ちない)', () => {
    const ed = new KuroEditor(makeMount(), { urlResolver: resolver, mediaKinds: ['image'] })
    ed.setContent('<p>[[mid-1]]</p>')
    expect(ed.wysiwyg.querySelector('a.kuro-media-fallback-card')).toBeNull()
    expect(ed.wysiwyg.querySelector('img')).toBeTruthy()
  })
})
