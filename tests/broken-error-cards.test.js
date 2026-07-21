// 共有失敗表示ビルダ（editor と公開ページが同一マークアップを出す単一の正）。
import { describe, it, expect } from 'vitest'
import { buildBrokenMedia, _urlCardErrorInner } from '../src/kuro-links.js'

describe('buildBrokenMedia — メディア読込失敗プレースホルダ', () => {
  it('.kuro-media-broken 一式（アイコン/ラベル/URL）を出す', () => {
    const h = buildBrokenMedia('https://ex.com/a.png')
    expect(h).toContain('class="kuro-media-broken"')
    expect(h).toContain('contenteditable="false"')
    expect(h).toContain('kuro-media-broken__icon')
    expect(h).toContain('メディアを読込できません')
    expect(h).toContain('kuro-media-broken__url')
    expect(h).toContain('https://ex.com/a.png')
  })
  it('src を HTML エスケープする（XSS-safe）', () => {
    const h = buildBrokenMedia('https://ex.com/"><img onerror=alert(1)>')
    expect(h).not.toContain('<img onerror')
    expect(h).toContain('&lt;img onerror')
    expect(h).toContain('&quot;&gt;')
  })
})

describe('_urlCardErrorInner — URL カード読込みエラー内側', () => {
  it('タイトルは「読込みエラー」固定、骨格は url-card と同じ', () => {
    const h = _urlCardErrorInner('https://ex.com/x', 'https://ex.com/x')
    expect(h).toContain('kuro-url-card__icon')
    expect(h).toContain('<span class="kuro-url-card__title">読込みエラー</span>')
    expect(h).toContain('kuro-url-card__url')
    expect(h).toContain('kuro-url-card__arrow')
  })
  it('http は slug を、内部 slug は解決 url をサブに出す', () => {
    expect(_urlCardErrorInner('https://ex.com/x', 'resolved')).toContain('https://ex.com/x')
    expect(_urlCardErrorInner('about', '/about/')).toContain('/about/')
  })
  it('サブテキストを HTML エスケープする', () => {
    const h = _urlCardErrorInner('about', '/a"><b>')
    expect(h).toContain('/a&quot;&gt;&lt;b&gt;')
    expect(h).not.toContain('<b>')
  })
})
