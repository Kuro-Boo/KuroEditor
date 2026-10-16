/**
 * 貼り付けの掃除は【許可リスト】で行う。
 *
 * 外部の HTML が持ち込む装飾は無数にある（letter-spacing / word-spacing /
 * text-indent / white-space / box-shadow / transform …）。KuroEditor の UI には
 * それらを直す手段が無いので、一度入ると【HTML タブでしか消せない】＝書き手には
 * 手の出しようがない。「このエディタが自分で書けるものだけ残す」なら、残った
 * ものは必ず UI で直せる、という保証になる。
 *
 * ⚠ 禁止リスト方式に戻さないこと（新しい CSS プロパティが出るたびに漏れる）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor } from '../src/editor.js'

function makeEditor() {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, {})
}

describe('貼り付けの掃除（許可リスト）', () => {
  let ed
  beforeEach(() => { document.body.innerHTML = ''; ed = makeEditor() })

  it('字間・行間まわりの指定は落とす（UI から直せないため）', () => {
    const out = ed._sanitizePastedHTML(
      '<p style="letter-spacing: 3px; word-spacing: 5px; text-indent: 2em; white-space: pre">文</p>')
    expect(out).not.toMatch(/letter-spacing|word-spacing|text-indent|white-space/)
    expect(out).toContain('文')
  })

  it('KuroEditor が自分で書ける指定は残す（寄せ・行間・字下げ）', () => {
    const out = ed._sanitizePastedHTML(
      '<p style="text-align: center; line-height: 1.8; padding-left: 2em">文</p>')
    expect(out).toContain('text-align')
    expect(out).toContain('line-height')
    expect(out).toContain('padding-left')
  })

  it('文字サイズは span なら残す（書き手が UI で付けられる唯一の形）', () => {
    const out = ed._sanitizePastedHTML('<p><span style="font-size: 120%">大きく</span></p>')
    expect(out).toContain('font-size')
  })

  it('ブロックに付いた font-size / font-weight は落とす（Chrome のコピーの焼き込み）', () => {
    // _applyFontSize は選択範囲を <span style="font-size"> で包む形しか書かない。
    // ブロックに付いていたら混入と断定でき、しかも UI からは直せない。
    expect(ed._sanitizePastedHTML('<p style="font-size: 15px; font-weight: 400">文</p>'))
      .toBe('<p>文</p>')
  })

  it('見出しが飲み込んだブロックは解く（文字は落とさない）', () => {
    // 選択が見出しの内側から始まると Chrome は全体をその見出しで包む。
    expect(ed._sanitizePastedHTML(
      '<h1>見出し<p style="font-size: 15px; font-weight: 400">本文</p></h1>'))
      .toBe('<h1>見出し</h1><p>本文</p>')
  })

  it('太字 / 斜体の意味は残す（span でコピーされた強調を失わない）', () => {
    const out = ed._sanitizePastedHTML('<span style="font-weight: 700; font-style: italic">強調</span>')
    expect(out).toMatch(/font-weight/)
    expect(out).toMatch(/font-style/)
  })

  it('色・背景は残さない（暗いテーマからのコピーが明るいページで読めなくなる）', () => {
    const out = ed._sanitizePastedHTML(
      '<p style="color: #fff; background-color: #000; text-align: center">文</p>')
    expect(out).not.toMatch(/color:/)
    expect(out).not.toMatch(/background/)
    expect(out).toContain('text-align')
  })

  it('見た目まわりのその他の指定も落とす', () => {
    const out = ed._sanitizePastedHTML(
      '<p style="box-shadow: 0 0 4px #000; transform: rotate(2deg); float: left; position: absolute; opacity: .5">文</p>')
    expect(out).not.toMatch(/box-shadow|transform|float|position|opacity/)
  })

  it('許可リストに無い属性は落とす（外部サイトの id / 独自 data-*）', () => {
    const out = ed._sanitizePastedHTML(
      '<p id="theirs" data-block-id="x" aria-hidden="true" onclick="alert(1)">文</p>')
    expect(out).not.toMatch(/id=|data-block-id|aria-hidden|onclick/)
  })

  it('class は kuro-* だけ残す（他所の CSS 前提のクラスは効かないうえ衝突する）', () => {
    const out = ed._sanitizePastedHTML(
      '<div class="notion-callout kuro-callout kuro-callout--tip prose-lg"><p>文</p></div>')
    expect(out).toContain('kuro-callout')
    expect(out).not.toMatch(/notion-callout|prose-lg/)
  })

  it('KuroEditor の意味を持つ属性は残す（往復できる形を壊さない）', () => {
    const out = ed._sanitizePastedHTML(
      '<ol start="3"><li data-checked="1">項目</li></ol>' +
      '<figure data-kuro-media="mid-1"><img src="/x.png" alt=""></figure>')
    expect(out).toContain('start="3"')
    expect(out).toContain('data-checked="1"')
    expect(out).toContain('data-kuro-media')
    expect(out).toContain('src="/x.png"')
  })

  it('リンクは行き先を保つ（kuro のリンク記法へ正規化される）', () => {
    const out = ed._sanitizePastedHTML('<a href="https://example.com" class="theirs">リンク</a>')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('data-kuro-wiki')   // 記法へ正規化＝以後は編集ポップアップで直せる
    expect(out).not.toContain('theirs')
  })
  it('本文に置けない要素は中身ごと落とす（<style> はページ全体に効く）', () => {
    const out = ed._sanitizePastedHTML(
      '<style>body{display:none}</style><meta charset="utf-8"><link rel="stylesheet" href="https://x/a.css">' +
      '<p>文</p><script>alert(1)</script><noscript>n</noscript><object data="x"></object><embed src="x">')
    expect(out).toBe('<p>文</p>')
  })

  it('StartFragment の印が無いクリップボードでも <head> の <style> を持ち込まない', () => {
    const out = ed._sanitizePastedHTML(
      '<html><head><style>.a{color:red}</style><title>t</title></head><body><p>文</p></body></html>')
    expect(out).toBe('<p>文</p>')
  })

  it('iframe は KuroEditor の埋め込みの中だけ残す', () => {
    const out = ed._sanitizePastedHTML(
      '<iframe src="https://evil.example/"></iframe>' +
      '<figure data-kuro-media="https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dx"><div class="kuro-iframe-wrap">' +
      '<iframe src="https://www.youtube.com/embed/x"></iframe></div></figure>')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('youtube.com/embed/x')
  })

  it('危ない枠組みの href / src は落とす（javascript: など）', () => {
    const out = ed._sanitizePastedHTML(
      '<p><a href="javascript:alert(1)">a</a><a href="jav&#x09;ascript:alert(1)">b</a>' +
      '<img src="javascript:alert(1)" alt=""><a href="data:text/html,x">c</a></p>')
    expect(out).not.toMatch(/javascript|data:text/i)
    expect(out).toContain('>a</a>')   // 文字は落とさない
  })

  it('安全な href / src はそのまま（mailto・相対パス・data:image）', () => {
    const out = ed._sanitizePastedHTML(
      '<p><a href="mailto:a@example.com">m</a><a href="/post/x">r</a>' +
      '<img src="data:image/png;base64,AAAA" alt=""></p>')
    expect(out).toContain('href="mailto:a@example.com"')
    expect(out).toContain('href="/post/x"')
    expect(out).toContain('src="data:image/png;base64,AAAA"')
  })

  it('Google ドキュメントの <b style="font-weight:normal"> の包みは外す（太字ではない）', () => {
    const out = ed._sanitizePastedHTML(
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">' +
      '<p dir="ltr"><span style="font-size:11pt;color:#000">一</span></p>' +
      '<p dir="ltr"><span style="font-size:11pt;font-weight:700">二</span></p></b>')
    expect(out).not.toMatch(/<strong[^>]*>\s*<p/)
    expect(out).not.toContain('font-weight: normal')
    expect(out).toContain('一')
    expect(out).toMatch(/<strong>二<\/strong>|font-weight: 700/)   // 中の本物の太字は残る
  })

  it('本物の太字の <b> は <strong> になる（包みの判定に巻き込まない）', () => {
    expect(ed._sanitizePastedHTML('<p><b>太</b></p>')).toBe('<p><strong>太</strong></p>')
  })
})
