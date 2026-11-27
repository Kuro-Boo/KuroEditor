/**
 * ルビ（ふりがな）— popm のルビボタンとそのパネル。
 *
 * 保存形式は【標準の <ruby>】なので、見張るのは「独自記法に化けていないか」と
 * 「UI から必ず外せるか」の 2 点が中心:
 *   1. 選択にルビが振れる（<ruby>親文字<rt>よみ</rt></ruby>）
 *   2. 大きさは <ruby> のクラス 3 段階。標準はクラスを持たない（素の <ruby>）
 *   3. 同じ親文字に二重にルビを作らない（既にあるなら読みと大きさを差し替え）
 *   4. 「解除」で親文字だけに戻る（＝一度入れたら UI から外せない、を防ぐ）
 *   5. 行をまたぐ選択には振らない（<ruby> の中にブロックは置けない）
 *   6. 貼り付けの掃除でルビが落ちない（class は kuro- 始まりなので残る）
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KuroEditor } from '../src/editor.js'

function makeEditor(html) {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  return new KuroEditor(mount, { initialContent: html })
}

/** テキストノードの [start,end) を選択する */
function select(ed, node, start, end) {
  const sel = window.getSelection()
  sel.setBaseAndExtent(node, start, node, end)
  ed.wysiwyg.focus()
}

/** 選択（複数ノードにまたがる範囲）を作る */
function selectAcross(ed, sNode, sOff, eNode, eOff) {
  window.getSelection().setBaseAndExtent(sNode, sOff, eNode, eOff)
  ed.wysiwyg.focus()
}

/** ルビの親文字（読みを除く） */
const rubyBase = (ruby) => {
  const c = ruby.cloneNode(true)
  for (const x of c.querySelectorAll('rt, rp')) x.remove()
  return c.textContent
}

const mousedown = (el) =>
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

describe('ルビ（ふりがな）', () => {
  let ed
  beforeEach(() => {
    document.body.innerHTML = ''
    ed = makeEditor('<p>難読漢字のテスト</p>')
  })

  it('選択した文字を <ruby> で包み、読みを <rt> に入れる', () => {
    const t = ed.wysiwyg.querySelector('p').firstChild
    select(ed, t, 0, 4)
    ed._applyRuby('なんどくかんじ', '')

    const ruby = ed.wysiwyg.querySelector('ruby')
    expect(ruby).not.toBeNull()
    expect(ruby.querySelector('rt').textContent).toBe('なんどくかんじ')
    // 親文字は残る（読みは rt の中だけ）
    expect(ruby.textContent.startsWith('難読漢字')).toBe(true)
    // 標準はクラスを持たない＝素の <ruby>
    expect(ruby.hasAttribute('class')).toBe(false)
  })

  it('大きさは <ruby> のクラス 3 段階。標準に戻すと class 属性ごと消える', () => {
    const t = ed.wysiwyg.querySelector('p').firstChild
    select(ed, t, 0, 4)
    ed._applyRuby('よみ', 'kuro-ruby--lg')

    const ruby = ed.wysiwyg.querySelector('ruby')
    expect(ruby.classList.contains('kuro-ruby--lg')).toBe(true)

    ed._setRubySize(ruby, 'kuro-ruby--sm')
    expect(ruby.classList.contains('kuro-ruby--lg')).toBe(false)
    expect(ruby.classList.contains('kuro-ruby--sm')).toBe(true)

    ed._setRubySize(ruby, '')
    expect(ruby.hasAttribute('class')).toBe(false)
  })

  it('既にルビがある選択では二重に作らず、読みと大きさを差し替える', () => {
    const t = ed.wysiwyg.querySelector('p').firstChild
    select(ed, t, 0, 4)
    ed._applyRuby('あああ', '')

    // _applyRuby は適用後に親文字を選び直す（popm を出したままにするため）ので、
    // そのまま 2 回目を適用すれば「同じルビの編集」になる
    ed._applyRuby('いいい', 'kuro-ruby--sm')

    const rubies = ed.wysiwyg.querySelectorAll('ruby')
    expect(rubies.length).toBe(1)
    expect(rubies[0].querySelectorAll('rt').length).toBe(1)
    expect(rubies[0].querySelector('rt').textContent).toBe('いいい')
    expect(rubies[0].classList.contains('kuro-ruby--sm')).toBe(true)
  })

  it('読みを空にして適用するとルビが外れる（親文字は残る）', () => {
    const t = ed.wysiwyg.querySelector('p').firstChild
    select(ed, t, 0, 4)
    ed._applyRuby('よみ', '')
    expect(ed.wysiwyg.querySelector('ruby')).not.toBeNull()

    ed._applyRuby('   ', '')
    expect(ed.wysiwyg.querySelector('ruby')).toBeNull()
    expect(ed.wysiwyg.textContent).toBe('難読漢字のテスト')
  })

  it('「解除」は選択にかかっているルビをすべて外す', () => {
    ed.setContent('<p><ruby>山<rt>やま</rt></ruby>と<ruby class="kuro-ruby--lg">川<rt>かわ</rt></ruby></p>')
    const p = ed.wysiwyg.querySelector('p')
    selectAcross(ed, p, 0, p, p.childNodes.length)
    ed._clearRuby()

    expect(ed.wysiwyg.querySelectorAll('ruby').length).toBe(0)
    expect(ed.wysiwyg.querySelectorAll('rt').length).toBe(0)
    expect(ed.wysiwyg.textContent).toBe('山と川')
  })

  it('行をまたぐ選択には振らない（<ruby> の中にブロックは置けない）', () => {
    ed.setContent('<p>まえの行</p><p>つぎの行</p>')
    const [p1, p2] = ed.wysiwyg.querySelectorAll('p')
    selectAcross(ed, p1.firstChild, 0, p2.firstChild, 2)
    ed._applyRuby('よみ', '')

    expect(ed.wysiwyg.querySelector('ruby')).toBeNull()
  })

  it('選択の中にあった既存のルビは入れ子にせず、親文字だけ残す', () => {
    ed.setContent('<p>その<ruby>山<rt>やま</rt></ruby>道</p>')
    const p = ed.wysiwyg.querySelector('p')
    // p の子をまるごと（既存ルビを含めて）選ぶ → 既存ルビは _rubyAtSelection が拾う
    selectAcross(ed, p, 0, p, p.childNodes.length)
    ed._applyRuby('やまみち', '')

    const rubies = ed.wysiwyg.querySelectorAll('ruby')
    expect(rubies.length).toBe(1)
    // 入れ子の <ruby> は残っていない
    expect(rubies[0].querySelector('ruby')).toBeNull()
    expect(ed.wysiwyg.querySelectorAll('rt').length).toBe(1)
    // 新しいルビは【選択全体】に乗る（既存の「山」の読みだけを書き換えるのではない）
    expect(rubyBase(rubies[0])).toBe('その山道')
    expect(rubies[0].querySelector('rt').textContent).toBe('やまみち')
  })

  it('保存 HTML には標準の <ruby> がそのまま出る（独自記法にしない）', () => {
    ed.setContent('<p><ruby class="kuro-ruby--sm">漢字<rt>かんじ</rt></ruby></p>')
    const html = ed.getContent()
    expect(html).toContain('<ruby class="kuro-ruby--sm">')
    expect(html).toContain('<rt>かんじ</rt>')
  })

  it('貼り付けの掃除でルビと大きさクラスが落ちない', () => {
    const clean = ed._sanitizePastedHTML(
      '<p><ruby class="kuro-ruby--lg other">漢字<rt>かんじ</rt></ruby></p>')
    expect(clean).toContain('<ruby')
    expect(clean).toContain('<rt>かんじ</rt>')
    expect(clean).toContain('kuro-ruby--lg')
    expect(clean).not.toContain('other')
  })

  describe('popm のルビパネル', () => {
    it('ルビボタンでパネルが開き、読み入力とサイズ 3 種と解除がある', () => {
      const btn = ed.popm._rubyBtn
      expect(btn).not.toBeNull()

      mousedown(btn)
      expect(ed.popm._rubyPanel.classList.contains('kuro-popm__sizes--visible')).toBe(true)
      expect(ed.popm._rubyInput).not.toBeNull()
      expect(ed.popm._rubySizeBtns.length).toBe(3)
      expect(ed.popm._rubyRemoveBtn.textContent).toBe('解除')

      // もう一度押すと畳む
      mousedown(btn)
      expect(ed.popm._rubyPanel.classList.contains('kuro-popm__sizes--visible')).toBe(false)
    })

    it('ルビの上にキャレットがあると読みが入力欄に入り、大きさが点灯する', () => {
      ed.setContent('<p><ruby class="kuro-ruby--lg">川<rt>かわ</rt></ruby></p>')
      const rt = ed.wysiwyg.querySelector('rt')
      const base = ed.wysiwyg.querySelector('ruby').firstChild
      select(ed, base, 0, 1)
      ed.popm._updateRubyState()

      expect(ed.popm._rubyInput.value).toBe(rt.textContent)
      expect(ed.popm._rubyBtn.classList.contains('kuro-popm__btn--active')).toBe(true)
      const active = ed.popm._rubySizeBtns.find(b => b.el.classList.contains('kuro-size-btn--active'))
      expect(active.value).toBe('kuro-ruby--lg')
    })

    it('ルビの無い選択では入力欄が空になり、ボタンも消灯する', () => {
      const t = ed.wysiwyg.querySelector('p').firstChild
      select(ed, t, 0, 2)
      ed.popm._updateRubyState()

      expect(ed.popm._rubyInput.value).toBe('')
      expect(ed.popm._rubyBtn.classList.contains('kuro-popm__btn--active')).toBe(false)
      expect(ed.popm._rubySizeBtns.some(b => b.el.classList.contains('kuro-size-btn--active')))
        .toBe(false)
    })

    it('サイズボタンを押すと、その時点の読みでルビが付く', () => {
      const t = ed.wysiwyg.querySelector('p').firstChild
      select(ed, t, 0, 4)
      ed.popm._activeRange = window.getSelection().getRangeAt(0).cloneRange()
      ed.popm._rubyInput.value = 'なんどくかんじ'

      const small = ed.popm._rubySizeBtns.find(b => b.value === 'kuro-ruby--sm')
      mousedown(small.el)

      const ruby = ed.wysiwyg.querySelector('ruby')
      expect(ruby).not.toBeNull()
      expect(ruby.querySelector('rt').textContent).toBe('なんどくかんじ')
      expect(ruby.classList.contains('kuro-ruby--sm')).toBe(true)
    })

    it('読みが空のままサイズを押したら、黙って何もせず入力欄へ戻す', () => {
      const t = ed.wysiwyg.querySelector('p').firstChild
      select(ed, t, 0, 4)
      ed.popm._activeRange = window.getSelection().getRangeAt(0).cloneRange()
      ed.popm._rubyInput.value = '   '

      mousedown(ed.popm._rubySizeBtns[0].el)

      expect(ed.wysiwyg.querySelector('ruby')).toBeNull()
      expect(document.activeElement).toBe(ed.popm._rubyInput)
    })

    it('入力欄の Enter で適用する（IME の変換確定は素通し）', () => {
      const t = ed.wysiwyg.querySelector('p').firstChild
      select(ed, t, 0, 4)
      ed.popm._activeRange = window.getSelection().getRangeAt(0).cloneRange()
      ed.popm._rubyInput.value = 'よみ'

      // 変換確定の Enter では適用しない
      ed.popm._rubyInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', isComposing: true, bubbles: true, cancelable: true,
      }))
      expect(ed.wysiwyg.querySelector('ruby')).toBeNull()

      ed.popm._rubyInput.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true,
      }))
      expect(ed.wysiwyg.querySelector('rt').textContent).toBe('よみ')
    })

    it('打っている最中の読みを横から書き換えない', () => {
      const t = ed.wysiwyg.querySelector('p').firstChild
      select(ed, t, 0, 4)
      ed.popm._rubyInput.focus()
      ed.popm._rubyInput.value = '打ちかけ'
      ed.popm._updateRubyState()

      expect(ed.popm._rubyInput.value).toBe('打ちかけ')
    })

    it('popm を畳むとルビパネルも畳まれる', () => {
      mousedown(ed.popm._rubyBtn)
      expect(ed.popm._rubyPanel.classList.contains('kuro-popm__sizes--visible')).toBe(true)
      ed.popm.hide()
      expect(ed.popm._rubyPanel.classList.contains('kuro-popm__sizes--visible')).toBe(false)
    })

    it('他のサブパネルを開くとルビパネルは畳まれる', () => {
      mousedown(ed.popm._rubyBtn)
      mousedown(ed.popm._calloutBtn)
      expect(ed.popm._rubyPanel.classList.contains('kuro-popm__sizes--visible')).toBe(false)
      expect(ed.popm._calloutPanel.classList.contains('kuro-popm__sizes--visible')).toBe(true)
    })
  })

  // ── ルビの付いた文字を本文の上で直す（2026-11-27）──────────────────────────
  // 実ブラウザ（Chromium）で、ルビの直後の打鍵が読みに入る・Backspace が読みを
  // 1 字ずつ消す・親文字を消すと読みだけが浮く・Enter でルビが割れる、を見た。
  // ⚠ happy-dom はキャレットの正規化も contenteditable の既定の編集も持たないので、
  //   ここで見るのは「守りがどの点で何をするか」まで。ブラウザが読みへ字を入れる
  //   ところは CSS（下の 1 件）で止めている。
  describe('ルビの付いた文字を本文の上で直す', () => {
    const P = '<p>前の<ruby>漢字<rt>かんじ</rt></ruby>後ろ</p>'
    const caretAt = (node, off) => {
      ed.wysiwyg.focus()
      window.getSelection().setBaseAndExtent(node, off, node, off)
    }
    const beforeinput = (inputType, data) => {
      const ev = new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true })
      ed.wysiwyg.dispatchEvent(ev)
      return ev
    }
    const els = () => {
      const p = ed.wysiwyg.querySelector('p')
      const ruby = p.querySelector('ruby')
      return { p, ruby, base: ruby?.firstChild, after: ruby?.nextSibling, before: p.firstChild }
    }
    const html = () => ed.wysiwyg.innerHTML.replace(/ data-bid="[^"]*"/g, '')

    beforeEach(() => { ed.setContent(P) })

    it('編集画面では読み（<rt>）を編集できない島にする（CSS）', () => {
      const here = dirname(fileURLToPath(import.meta.url))
      const css = readFileSync(join(here, '../src/editor-core.css'), 'utf8')
      const rule = css.match(/\.kuro-pane__wysiwyg\[contenteditable="true"\] rt\s*\{([^}]*)\}/)
      expect(rule).not.toBeNull()
      expect(rule[1]).toMatch(/-webkit-user-modify:\s*read-only/)
    })

    it('ルビの直後から Backspace → 読みではなく親文字の末尾が 1 字消える', () => {
      caretAt(els().after, 0)
      const ev = beforeinput('deleteContentBackward')
      expect(ev.defaultPrevented).toBe(true)
      expect(html()).toBe('<p>前の<ruby>漢<rt>かんじ</rt></ruby>後ろ</p>')
    })

    it('親文字を消し切ったらルビごと消える（読みだけを残さない）', () => {
      caretAt(els().after, 0)
      beforeinput('deleteContentBackward')
      beforeinput('deleteContentBackward')
      expect(html()).toBe('<p>前の後ろ</p>')
      // 続けて押すとルビの手前の文字が消える（＝キャレットはルビのあった場所）
      const sel = window.getSelection()
      expect(sel.anchorNode.textContent).toBe('前の')
      expect(sel.anchorOffset).toBe(2)
    })

    it('読みの中・読みの後ろにキャレットがあっても、Backspace は親文字を消す', () => {
      caretAt(ed.wysiwyg.querySelector('rt').firstChild, 3)
      beforeinput('deleteContentBackward')
      expect(html()).toBe('<p>前の<ruby>漢<rt>かんじ</rt></ruby>後ろ</p>')
    })

    it('ルビの直前から Delete → 親文字の先頭が 1 字消える', () => {
      caretAt(els().before, 2)
      const ev = beforeinput('deleteContentForward')
      expect(ev.defaultPrevented).toBe(true)
      expect(html()).toBe('<p>前の<ruby>字<rt>かんじ</rt></ruby>後ろ</p>')
    })

    it('親文字の末尾で Delete → 読みではなくルビの後ろの文字が消える', () => {
      caretAt(els().base, 2)
      const ev = beforeinput('deleteContentForward')
      expect(ev.defaultPrevented).toBe(true)
      expect(html()).toBe('<p>前の<ruby>漢字<rt>かんじ</rt></ruby>ろ</p>')
    })

    it('親文字の途中の Backspace / Delete はブラウザに任せる', () => {
      caretAt(els().base, 1)
      expect(beforeinput('deleteContentBackward').defaultPrevented).toBe(false)
      expect(beforeinput('deleteContentForward').defaultPrevented).toBe(false)
    })

    it('親文字の消去は絵文字の合成を割らない', () => {
      ed.setContent('<p><ruby>家族👨‍👩‍👧<rt>かぞく</rt></ruby>!</p>')
      caretAt(ed.wysiwyg.querySelector('ruby').nextSibling, 0)
      beforeinput('deleteContentBackward')
      expect(rubyBase(ed.wysiwyg.querySelector('ruby'))).toBe('家族')
    })

    it('ルビが並ぶ: 後ろの親文字の先頭から Backspace → 前のルビの親文字が消える', () => {
      ed.setContent('<p><ruby>山<rt>やま</rt></ruby><ruby>川<rt>かわ</rt></ruby></p>')
      caretAt(ed.wysiwyg.querySelectorAll('ruby')[1].firstChild, 0)
      beforeinput('deleteContentBackward')
      expect(html()).toBe('<p><ruby>川<rt>かわ</rt></ruby></p>')
    })

    it('ルビが並ぶ: 間で打った字はどちらのルビにも入らない', () => {
      ed.setContent('<p><ruby>山<rt>やま</rt></ruby><ruby>川<rt>かわ</rt></ruby></p>')
      caretAt(ed.wysiwyg.querySelector('p'), 1)
      const ev = beforeinput('insertText', 'と')
      expect(ev.defaultPrevented).toBe(true)
      expect(html()).toBe('<p><ruby>山<rt>やま</rt></ruby>と<ruby>川<rt>かわ</rt></ruby></p>')
    })

    it('親文字の先頭で打った字はルビの手前へ（途中はブラウザに任せる）', () => {
      caretAt(els().base, 0)
      expect(beforeinput('insertText', 'ア').defaultPrevented).toBe(true)
      expect(html()).toBe('<p>前のア<ruby>漢字<rt>かんじ</rt></ruby>後ろ</p>')
      caretAt(els().base, 1)
      expect(beforeinput('insertText', 'イ').defaultPrevented).toBe(false)
    })

    it('キャレットが読みの中に入ったら、ルビの直後へ出す', () => {
      caretAt(ed.wysiwyg.querySelector('rt').firstChild, 1)
      ed._guardRubyCaret()
      const sel = window.getSelection()
      expect(sel.anchorNode).toBe(els().after)
      expect(sel.anchorOffset).toBe(0)
    })

    it('キャレットが <ruby> の中の読みの後ろに入ったら、ルビの直後へ出す', () => {
      const { ruby } = els()
      caretAt(ruby, ruby.childNodes.length)
      ed._guardRubyCaret()
      expect(window.getSelection().anchorNode).toBe(els().after)
    })

    it('親文字の中のキャレットは動かさない', () => {
      caretAt(els().base, 1)
      ed._guardRubyCaret()
      expect(window.getSelection().anchorNode).toBe(els().base)
      expect(window.getSelection().anchorOffset).toBe(1)
    })

    it('親文字の途中の Enter は、改行をルビの直後へ寄せる（ルビを割らない）', () => {
      caretAt(els().base, 1)
      ed.wysiwyg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      expect(window.getSelection().anchorNode).toBe(els().after)
      expect(window.getSelection().anchorOffset).toBe(0)
    })

    it('親文字の先頭の Enter は、改行をルビの手前へ寄せる', () => {
      caretAt(els().base, 0)
      ed.wysiwyg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      expect(window.getSelection().anchorNode).toBe(els().before)
      expect(window.getSelection().anchorOffset).toBe(2)
    })

    it('読みを押すと、親文字を選んで読み欄を開く', () => {
      const rt = ed.wysiwyg.querySelector('rt')
      const ev = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      rt.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
      expect(ed.popm._rubyPanel.classList.contains('kuro-popm__sizes--visible')).toBe(true)
      expect(ed.popm._rubyInput.value).toBe('かんじ')
      expect(ed.popm._activeRange.toString()).toBe('漢字')
    })

    describe('形の掃除（入力のたび）', () => {
      const input = () => ed.wysiwyg.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

      it('親文字が空になったルビは丸ごと消す', () => {
        els().base.data = ''
        caretAt(els().before, 2)
        input()
        expect(html()).toBe('<p>前の後ろ</p>')
      })

      it('読みが空になったルビは外して親文字だけにする', () => {
        ed.wysiwyg.querySelector('rt').textContent = ''
        caretAt(els().after, 0)
        input()
        expect(html()).toBe('<p>前の漢字後ろ</p>')
      })

      it('読みの無いルビ（範囲の削除で読みだけ消えた）も外す', () => {
        ed.wysiwyg.querySelector('rt').remove()
        caretAt(els().base, 1)
        input()
        expect(html()).toBe('<p>前の漢字後ろ</p>')
        // キャレットは同じ文字の上に残る
        expect(window.getSelection().anchorNode.textContent).toBe('漢字')
        expect(window.getSelection().anchorOffset).toBe(1)
      })

      it('<ruby> の中で読みより後ろに入った字は、ルビの直後へ出す', () => {
        const x = document.createTextNode('X')
        els().ruby.appendChild(x)
        caretAt(x, 1)
        input()
        expect(html()).toBe('<p>前の<ruby>漢字<rt>かんじ</rt></ruby>X後ろ</p>')
        expect(window.getSelection().anchorNode).toBe(x)
        expect(window.getSelection().anchorOffset).toBe(1)
      })

      it('行末のルビの後ろに残った置き場の <br> は外す（2 つ続く改行は残す）', () => {
        ed.setContent('<p>前の<ruby>漢字<rt>かんじ</rt></ruby><br></p><p>後ろ</p>')
        caretAt(ed.wysiwyg.querySelectorAll('p')[1].firstChild, 0)
        input()
        expect(html()).toBe('<p>前の<ruby>漢字<rt>かんじ</rt></ruby></p><p>後ろ</p>')

        ed.setContent('<p>前の<ruby>漢字<rt>かんじ</rt></ruby><br><br></p>')
        caretAt(ed.wysiwyg.querySelector('p'), 3)
        input()
        expect(ed.wysiwyg.querySelectorAll('br').length).toBe(2)
      })

      it('キャレットの行（と手前の行）だけを直す — 他の行は触らない', () => {
        ed.setContent('<p><ruby>壊<rt></rt></ruby></p><p>間</p><p>ここ</p>')
        caretAt(ed.wysiwyg.querySelectorAll('p')[2].firstChild, 1)
        input()
        expect(ed.wysiwyg.querySelector('ruby')).not.toBeNull()
      })

      it('変換中の入力では触らない', () => {
        ed.wysiwyg.querySelector('rt').textContent = ''
        caretAt(els().after, 0)
        ed.wysiwyg.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', isComposing: true }))
        expect(ed.wysiwyg.querySelector('ruby')).not.toBeNull()
      })
    })

    describe('popm で読みを直す対象', () => {
      const selectRange = (a, ao, b, bo) => {
        ed.wysiwyg.focus()
        window.getSelection().setBaseAndExtent(a, ao, b, bo)
        ed.popm._activeRange = null
      }

      it('親文字の中の選択・キャレットは、そのルビ', () => {
        selectRange(els().base, 1, els().base, 2)
        expect(ed.popm._rubyAtSelection()).toBe(els().ruby)
      })

      it('ちょうどルビ 1 つを覆う選択（端がルビの外）は、そのルビ', () => {
        const { p } = els()
        selectRange(p, 1, p, 2)
        expect(ed.popm._rubyAtSelection()).toBe(els().ruby)
        selectRange(els().before, 2, els().after, 0)
        expect(ed.popm._rubyAtSelection()).toBe(els().ruby)
      })

      it('ルビの外の文字を含む選択は、どのルビも指さない（読み欄も空）', () => {
        selectRange(els().before, 1, els().base, 1)        // 「の漢」
        expect(ed.popm._rubyAtSelection()).toBeNull()
        selectRange(els().base, 1, els().after, 2)         // 「字後ろ」
        expect(ed.popm._rubyAtSelection()).toBeNull()
        const { p } = els()
        selectRange(p, 0, p, p.childNodes.length)          // 段落全部
        expect(ed.popm._rubyAtSelection()).toBeNull()
        ed.popm._updateRubyState()
        expect(ed.popm._rubyInput.value).toBe('')
      })

      it('「字後ろ」に読みを入れると、既存のルビを含めて選択全体に新しいルビが付く', () => {
        selectRange(els().base, 1, els().after, 2)
        ed._applyRuby('あと', '')
        const rubies = ed.wysiwyg.querySelectorAll('ruby')
        expect(rubies.length).toBe(1)
        expect(rubyBase(rubies[0])).toBe('漢字後ろ')
        expect(ed.wysiwyg.querySelectorAll('rt').length).toBe(1)
        expect(rubies[0].querySelector('rt').textContent).toBe('あと')
        expect(ed.wysiwyg.textContent.startsWith('前の漢字後ろ')).toBe(true)
      })

      it('ルビ 1 つを覆う選択に読みを入れると、そのルビの読みを差し替える', () => {
        selectRange(els().before, 2, els().after, 0)
        ed._applyRuby('かんじー', '')
        expect(html()).toBe('<p>前の<ruby>漢字<rt>かんじー</rt></ruby>後ろ</p>')
      })
    })
  })
})
