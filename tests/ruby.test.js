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
})
