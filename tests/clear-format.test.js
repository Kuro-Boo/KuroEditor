/**
 * popm の左端の「弾けて消える」ボタン — 選択した文字の装飾をすべて外す（v2.45.0〜）。
 * 外から貼った文字を「文字だけ」にして、装飾をやり直すためのもの。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor, isInlineFormatEl } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const ed = new KuroEditor(mount, {})
  ed.wysiwyg.innerHTML = html
  return ed
}

/** 文字 `from` から `to` までを選ぶ（同じテキストノードの中でも、別のノードでも）。 */
function select(ed, from, to) {
  const w = document.createTreeWalker(ed.wysiwyg, NodeFilter.SHOW_TEXT)
  let s = null, e = null
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    if (!s && t.data.includes(from)) s = [t, t.data.indexOf(from)]
    if (t.data.includes(to)) e = [t, t.data.indexOf(to) + to.length]
  }
  window.getSelection().setBaseAndExtent(s[0], s[1], e[0], e[1])
}

describe('装飾を消すボタン（文字装飾をすべて外す）', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('popm の一番左（つまみの次）にある', () => {
    const ed = makeEditor('<p>a</p>')
    const btns = [...ed.popm._mainRow.querySelectorAll('button.kuro-popm__btn')]
    expect(btns[0].dataset.command).toBe('clearFormat')
    expect(btns[0].getAttribute('title')).toContain('文字装飾をすべて外す')
  })

  it('太字・斜体・下線・色・大きさ・書体を外し、文字は残す', () => {
    const ed = makeEditor('<p><strong><em><u><span style="color: #e11d48; font-size: 150%; font-family: serif">装飾</span></u></em></strong></p>')
    select(ed, '装飾', '装飾')
    ed._clearInlineFormat()
    expect(ed.wysiwyg.innerHTML).toBe('<p>装飾</p>')
  })

  it('選択の外の装飾は残す（境目で要素を割る）', () => {
    const ed = makeEditor('<p><strong>前の中の後</strong></p>')
    select(ed, '中', '中')
    ed._clearInlineFormat()
    expect(ed.wysiwyg.innerHTML).toBe('<p><strong>前の</strong>中<strong>の後</strong></p>')
    expect(window.getSelection().toString()).toBe('中')   // 選択はそのまま
  })

  it('複数の行にまたがって外せる', () => {
    const ed = makeEditor('<p><s>一行目</s></p><h2><span style="color: #2563eb">二行目</span></h2>')
    select(ed, '一行目', '二行目')
    ed._clearInlineFormat()
    expect(ed.wysiwyg.innerHTML).toBe('<p>一行目</p><h2>二行目</h2>')   // 行の形（見出し）は触らない
  })

  it('リンクとルビは残す（行き先・読みは文字の内容）', () => {
    const ed = makeEditor('<p><strong><a href="https://a.example/">リンク</a><ruby>漢字<rt>かんじ</rt></ruby></strong></p>')
    select(ed, 'リンク', 'かんじ')
    ed._clearInlineFormat()
    expect(ed.wysiwyg.innerHTML).toBe('<p><a href="https://a.example/">リンク</a><ruby>漢字<rt>かんじ</rt></ruby></p>')
  })

  it('エディタの部品・機能の記法を持つ <span> とコードブロックは外さない', () => {
    const span = (attrs) => Object.assign(document.createElement('span'), attrs)
    expect(isInlineFormatEl(span({}))).toBe(true)
    const s1 = document.createElement('span'); s1.setAttribute('style', 'color: red')
    expect(isInlineFormatEl(s1)).toBe(true)
    const s2 = document.createElement('span'); s2.setAttribute('data-x', '1')
    expect(isInlineFormatEl(s2)).toBe(false)
    const s3 = document.createElement('span'); s3.className = 'kuro-emoji'
    expect(isInlineFormatEl(s3)).toBe(false)
    const pre = document.createElement('pre'); pre.innerHTML = '<code>x</code>'
    expect(isInlineFormatEl(pre.firstChild)).toBe(false)
  })

  it('選択が無ければ何もしない', () => {
    const ed = makeEditor('<p><strong>a</strong></p>')
    const t = ed.wysiwyg.querySelector('strong').firstChild
    window.getSelection().setBaseAndExtent(t, 0, t, 0)
    ed._clearInlineFormat()
    expect(ed.wysiwyg.innerHTML).toBe('<p><strong>a</strong></p>')
  })
})
