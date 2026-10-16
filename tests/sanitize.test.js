/**
 * R0 — 本文の守り（sanitizeContentHtml）。
 *
 * 貼り付け・API・保存・公開ページ・エディタへの読み込みが、すべてこの 1 つを通る。
 * ⚠ ここが落ちるのは「本文に書ける人が、読む人・管理画面の人のブラウザで
 *   スクリプトを動かせる」ということ。緩める変更は必ず理由を仕様書に書く。
 */
import { describe, it, expect } from 'vitest'
import { sanitizeContentHtml, normalizeContentHtml, inspectContentHtml } from '../src/normalize.js'
import { isSafeUrl } from '../src/kuro-links.js'
import { KuroEditor } from '../src/editor.js'

const S = sanitizeContentHtml
const ACTIVE = /<script|<style|<iframe(?![^>]*youtube)|\son\w+\s*=|javascript:|<link|<meta|<base|<object|<embed|<svg|<math|srcdoc/i

describe('要素', () => {
  it.each([
    ['<p>a</p><script>alert(1)</script>', '<p>a</p>'],
    ['<style>body{display:none}</style><p>a</p>', '<p>a</p>'],
    ['<p>a</p><SCRIPT SRC="https://x/a.js"></SCRIPT>', '<p>a</p>'],
    ['<noscript><p>n</p></noscript><p>a</p>', '<p>a</p>'],
    ['<template><img src=x onerror=alert(1)></template><p>a</p>', '<p>a</p>'],
    ['<object data="x"><p>o</p></object><p>a</p>', '<p>a</p>'],
    ['<svg onload="alert(1)"><circle r="1"/></svg><p>a</p>', '<p>a</p>'],
    ['<math><mi>x</mi></math><p>a</p>', '<p>a</p>'],
    ['<link rel="stylesheet" href="https://x/a.css"><meta http-equiv="refresh" content="0;url=https://x"><base href="https://x/"><p>a</p>', '<p>a</p>'],
    ['<embed src="x"><p>a</p>', '<p>a</p>'],
  ])('%s', (input, want) => expect(S(input)).toBe(want))

  it('form は包みだけ外す（中の文字は残す）', () => {
    expect(S('<form action="https://evil/"><p>名前</p><input name="pw"></form>')).toBe('<p>名前</p><input name="pw">')
  })

  it('plaintext 以降は捨てる（ブラウザは以降をすべて文字として見せる）', () => {
    expect(S('<p>a</p><plaintext><p>b</p>')).toBe('<p>a</p>')
  })

  it('閉じない script は文書の終わりまで捨てる', () => {
    expect(S('<p>a</p><script>alert(1)<p>b</p>')).toBe('<p>a</p>')
  })

  it('script の中の </script> 以外の「閉じタグもどき」で抜けられない', () => {
    expect(S('<script>var s="</scr"+"ipt>";alert(1)</script><p>a</p>')).toBe('<p>a</p>')
  })
})

describe('iframe', () => {
  it('KuroEditor の埋め込みと同じ行き先は残す', () => {
    for (const src of [
      'https://www.youtube.com/embed/abc',
      'https://www.youtube-nocookie.com/embed/abc',
      'https://player.vimeo.com/video/1',
      'https://maps.google.com/maps?q=Tokyo&amp;output=embed',
      'https://www.google.com/maps/embed?pb=x',
    ]) {
      expect(S(`<iframe src="${src}" allowfullscreen></iframe>`)).toBe(`<iframe src="${src}" allowfullscreen></iframe>`)
    }
  })

  it('それ以外は落とす（http・別のホスト・srcdoc・javascript:）', () => {
    for (const html of [
      '<iframe src="https://evil.example/"></iframe>',
      '<iframe src="http://www.youtube.com/embed/abc"></iframe>',
      '<iframe src="https://www.youtube.com.evil.example/embed/abc"></iframe>',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<iframe></iframe>',
    ]) expect(S(`<p>a</p>${html}`)).toBe('<p>a</p>')
  })

  it('残す iframe からも srcdoc / on* は落とす', () => {
    expect(S('<iframe src="https://www.youtube.com/embed/a" srcdoc="x" onload="y()"></iframe>'))
      .toBe('<iframe src="https://www.youtube.com/embed/a"></iframe>')
  })
})

describe('属性', () => {
  it('on* はどの要素からも落とす（区切りが / でも・大文字でも）', () => {
    expect(S('<img src="a.png" onerror="alert(1)">')).toBe('<img src="a.png">')
    expect(S('<img/src="a.png"/onerror=alert(1)>')).toBe('<img src="a.png">')
    expect(S('<p ONCLICK="x()">a</p>')).toBe('<p>a</p>')
    expect(S('<details open ontoggle=alert(1)>a</details>')).toBe('<details open>a</details>')
  })

  it.each([
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)',
    'jav&#x09;ascript:alert(1)', '&#106;avascript:alert(1)', 'javascript&colon;alert(1)',
    'vbscript:x', 'data:text/html,<script>alert(1)</script>',
  ])('危ない href を落とす: %s', (u) => {
    expect(S(`<a href="${u}">a</a>`)).toBe('<a>a</a>')
  })

  it('src 系も枠組みで縛る（data: は画像・動画・音声だけ）', () => {
    expect(S('<img src="javascript:alert(1)">')).toBe('<img>')
    expect(S('<img src="data:image/png;base64,AA">')).toBe('<img src="data:image/png;base64,AA">')
    expect(S('<video poster="javascript:x"></video>')).toBe('<video></video>')
    expect(S('<img srcset="a.png 1x, javascript:x 2x">')).toBe('<img>')
  })

  it('安全な行き先と、ふつうの属性はそのまま（綴りも変えない）', () => {
    const html = '<p class="kuro-x" style="text-align: center"><a href="https://example.com/?a=1&amp;b=2" target="_blank">a</a>' +
      '<a href="mailto:a@example.com">m</a><a href="/post/x">r</a><a href="#h">h</a></p>'
    expect(S(html)).toBe(html)
  })

  it('古いブラウザで動く style は落とす', () => {
    expect(S('<p style="width: expression(alert(1))">a</p>')).toBe('<p>a</p>')
    expect(S('<p style="background: url(javascript:alert(1))">a</p>')).toBe('<p>a</p>')
  })

  it('引用符の効かない所の > はタグの終わり（ブラウザと同じ区切り）', () => {
    // ブラウザは <a "x> を 1 つのタグと読み、続く onclick… は文字になる
    expect(S('<a "x>onclick=alert(1)</a>')).toBe('<a "x>onclick=alert(1)</a>')
    expect(S('<a title="x>y" onclick="z()">a</a>')).toBe('<a title="x>y">a</a>')
  })
})

describe('壊れた HTML・繋がりで抜けられない', () => {
  it('閉じない <a> を混ぜても守りは掛かる（normalize の「無変換で返す」を通らない）', () => {
    const out = normalizeContentHtml('<p><a href="https://x">a<script>alert(1)</script></p>')
    expect(out).not.toMatch(ACTIVE)
  })

  it('消した跡で < と文字が繋がってタグにならない', () => {
    expect(S('<<link>script>alert(1)<<link>/script>')).toBe('&lt;script>alert(1)&lt;/script>')
    expect(S('<<!x>img src=x onerror=alert(1)>')).not.toMatch(/<img/)
  })

  it('normalize が要素を外した跡でも繋がらない（R0 は最後に掛かる）', () => {
    const out = normalizeContentHtml('<p><<div></div>script>alert(1)<<div></div>/script></p>')
    expect(out).not.toMatch(/<script/i)
  })

  it('コメントはブラウザと同じ所で終わる（--!> でも）', () => {
    expect(S('<!-- a --!><img src=x onerror=alert(1)>')).toBe('<!-- a --!><img src=x>')
    expect(S('<!--><img src=x onerror=alert(1)>')).toBe('<!--><img src=x>')
  })

  it('文書の終わりで切れたタグは捨てる（ブラウザも捨てる）', () => {
    expect(S('<p>a</p><img src=x onerror="alert(1)')).toBe('<p>a</p>')
  })

  it('textarea の中は文字のまま（コードブロックの中身を消さない）', () => {
    const html = '<textarea>&lt;script&gt; <script>x</script></textarea>'
    expect(S(html)).toBe(html)
  })

  it('ふつうの文中の < はそのまま（a < b）', () => {
    expect(S('<p>a < b, 1<2</p>')).toBe('<p>a < b, 1<2</p>')
  })
})

describe('性質', () => {
  const samples = [
    '<p>a</p><script>x</script>', '<img/src=x/onerror=y>', '<<link>script>', '<a href="javascript:x">a</a>',
    '<svg><style><img src=x onerror=y></style></svg><p>b</p>', '<iframe src="https://www.youtube.com/embed/a">x</iframe>',
    '<textarea>a', '<!-- c', '<form><p>f</p></form>', '<p>ok</p>',
  ]
  it.each(samples)('冪等: %s', (h) => expect(S(S(h))).toBe(S(h)))
  it.each(samples)('動くものが残らない: %s', (h) => expect(S(h)).not.toMatch(ACTIVE))

  it('URL の判定は kuro-links の isSafeUrl と同じ（写しがずれていない）', () => {
    const urls = [
      'https://a', 'http://a', 'mailto:a', 'tel:1', 'javascript:x', 'JAVASCRIPT:x', 'vbscript:x',
      'data:image/png,x', 'data:text/html,x', 'blob:https://a', 'ftp://a', '/p', '#h', '?q', '',
      'jav&#x09;ascript:x', '&#106;avascript:x', 'javascript&colon;x', '\u0000javascript:x',
    ]
    for (const kind of ['href', 'src']) {
      for (const u of urls) {
        const attr = kind === 'href' ? 'href' : 'src'
        const kept = S(`<a ${attr}="${u}">`).includes(`${attr}=`)
        expect([kind, u, kept]).toEqual([kind, u, isSafeUrl(u, kind)])
      }
    }
  })

  it('inspectContentHtml が数える（保守画面の予告）', () => {
    const s = inspectContentHtml('<p onclick="x">a</p><script>y</script>')
    expect(s.unsafe).toBe(2)
    expect(s.changed).toBe(true)
    expect(inspectContentHtml('<p>a</p>').unsafe).toBe(0)
  })
})

describe('エディタへ入れる口', () => {
  const mk = (opts = {}) => {
    document.body.innerHTML = ''
    const mount = document.createElement('div')
    document.body.appendChild(mount)
    return new KuroEditor(mount, opts)
  }

  it('setContent は守りを通してから DOM に入れる（保存済みの古い本文）', () => {
    const ed = mk()
    ed.setContent('<p>a<img src="x.png" onerror="alert(1)"></p><style>body{display:none}</style>')
    expect(ed.wysiwyg.innerHTML).not.toMatch(/onerror|<style/)
    expect(ed.wysiwyg.textContent).toContain('a')
  })

  it('HTML タブから戻るときも守りを通す', () => {
    const ed = mk()
    ed.setContent('<p>a</p>')
    ed.setMode('source')
    ed.sourceArea.value = '<p>b</p><script>alert(1)</script><a href="javascript:x">c</a>'
    ed.setMode('wysiwyg')
    expect(ed.wysiwyg.innerHTML).not.toMatch(/<script|javascript:/)
    expect(ed.wysiwyg.textContent).toContain('b')
  })

  it('getContent も守りを通る（保存される本文に残らない）', () => {
    const ed = mk()
    ed.setContent('<p>a</p>')
    ed.wysiwyg.insertAdjacentHTML('beforeend', '<p onclick="x()">b</p>')
    expect(ed.getContent()).not.toMatch(/onclick/)
  })
})
