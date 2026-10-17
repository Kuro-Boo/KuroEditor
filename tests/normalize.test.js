/**
 * 本文の形（normalize.js の conform）— エディタの形以外は、すべてエディタの形へ写す。
 *
 * 約束（2026-10-17 利用者の決定。Admin 仕様「本文の形」）:
 *   1. 文字は絶対に消さない
 *   2. 選べない値は近いものを採る。無ければ初期値（書かない）
 *   3. エディタが書かない機能の記法（data-*・id・kuro-/kurocms- のコメント・[[…]]）は残す
 *
 * 実データでの確かめ（2026-10-17）: Admin の文書 929・entamy.com の記事 220・
 * kuro.boo の記事 2,594 で、Chrome で読んだ文字の欠け 0・2 回目の変化 0。
 */
import { describe, it, expect } from 'vitest'
import { normalizeContentHtml, inspectContentHtml, conformContentHtml, cssColor } from '../src/normalize.js'

const N = normalizeContentHtml

describe('約束 1: 文字は絶対に消さない', () => {
  it('知らないタグは、文中の山括弧の書き損じとして文字に戻す（綴りもそのまま）', () => {
    expect(N('<p>x <app>y</app> <Pid></p>')).toBe('<p>x &lt;app&gt;y&lt;/app&gt; &lt;Pid&gt;</p>')
  })

  it('属性に見えない名前を持つタグも文字に戻す（"<A função …>" はブラウザでは消える）', () => {
    expect(N('<div><b><A função de uso final não é um bônus></b></div>'))
      .toBe('<p><strong>&lt;A função de uso final não é um bônus&gt;</strong></p>')
  })

  it('<button> や <label> は外しても、中の文字は残す', () => {
    expect(N('<p>押す<button>ここ</button><label>名前</label></p>')).toBe('<p>押すここ名前</p>')
  })

  it('見出しが飲み込んだ本文を兄弟に戻し、後ろの地の文も段落として拾う', () => {
    expect(N('<h1>見出し<p>本文</p>あとがき</h1>')).toBe('<h1>見出し</h1><p>本文</p><p>あとがき</p>')
  })

  it('表の外の文字・セルの外の文字も拾う', () => {
    expect(N('<table><tr><td>a</td>外</tr></table>'))
      .toBe('<table class="kuro-table"><tbody><tr><td contenteditable="true">a外</td></tr></tbody></table>')
  })

  it('<textarea> の中身は段落の文字になる', () => {
    expect(N('<textarea>書きかけ</textarea>')).toBe('<p>書きかけ</p>')
  })
})

describe('約束 2: 選べない値は近いものへ、無ければ書かない', () => {
  it('文字サイズはエディタの 7 段へ寄せる（100% は書かない）', () => {
    expect(N('<p><span style="font-size: 140%">a</span></p>')).toBe('<p><span style="font-size: 150%">a</span></p>')
    expect(N('<p>本文<span style="font-size: 14px">a</span></p>')).toBe('<p>本文<span style="font-size: 85%">a</span></p>')
    expect(N('<p><span style="font-size: 16px">a</span></p>')).toBe('<p>a</p>')
    expect(N('<p>本文<span style="font-size: 1.5rem">a</span></p>')).toBe('<p>本文<span style="font-size: 150%">a</span></p>')
  })

  it('入れ子の絶対値は、外側の大きさに対する比で書く', () => {
    expect(N('<p>本文<span style="font-size: 24px">a<span style="font-size: 24px">b</span></span></p>'))
      .toBe('<p>本文<span style="font-size: 150%">ab</span></p>')
  })

  it('絶対値の文字サイズは、いちばん多い大きさを 100% として読む（貼り付けも API も同じ）', () => {
    // Chrome は計算済みの 14px を全部に焼き込む。本文の大きさはサイトが決める
    expect(N('<p style="font-size: 14px">本文の文字</p><p><span style="font-size: 28px">大</span></p>'))
      .toBe('<p>本文の文字</p><p><span style="font-size: 200%">大</span></p>')
    // 大きさの書かれていない文字は 16px として数える
    expect(N('<p>ふつうの本文です</p><p><span style="font-size: 14px">注</span></p>'))
      .toBe('<p>ふつうの本文です</p><p><span style="font-size: 85%">注</span></p>')
  })

  it('見出しの中の絶対値は見出しの大きさに任せる', () => {
    expect(N('<h2><span style="font-size: 24px">見出し</span></h2>')).toBe('<h2>見出し</h2>')
  })

  it('行間は 6 段、字下げは 2em 刻み', () => {
    expect(N('<p style="line-height: 1.5; padding-left: 30px">a</p>'))
      .toBe('<p style="line-height: 1.4; padding-left: 2em">a</p>')
  })

  it('無い種類の callout は近い種類へ', () => {
    expect(N('<div class="kuro-callout kuro-callout--info"><p>a</p></div>'))
      .toBe('<div class="kuro-callout kuro-callout--note"><p>a</p></div>')
    expect(N('<div class="kuro-callout kuro-callout--warning"><p>a</p></div>'))
      .toBe('<div class="kuro-callout kuro-callout--warn"><p>a</p></div>')
  })

  it('角丸ボックスの幅・配置は選べる値へ寄せ、style は data-* から作り直す', () => {
    expect(N('<div class="kuro-roundbox" data-align="left" data-width="58%" style="width:58%"><p>a</p></div>'))
      .toBe('<div class="kuro-roundbox" data-align="left" data-width="60%" style="width: 60%; float: left; margin: 0 1em 1em 0"><p>a</p></div>')
  })

  it('書体は serif / sans-serif / Web フォントだけ（Arial などの並びは書かない）', () => {
    expect(N('<p><span style="font-family: Arial, sans-serif">a</span></p>')).toBe('<p>a</p>')
    expect(N(`<p><span style="font-family: 'Hiragino Mincho ProN', serif">a</span></p>`))
      .toBe('<p><span style="font-family: serif">a</span></p>')
    expect(N('<p><span style="font-family: &quot;Noto Sans JP&quot;, sans-serif">a</span></p>'))
      .toBe('<p><span style="font-family: &quot;Noto Sans JP&quot;, sans-serif">a</span></p>')
  })

  it('罫線は「幅 線種 色」のエディタの書き方（4 辺）へ', () => {
    expect(N('<table><tr><td style="border: 1px solid #ddd">a</td></tr></table>'))
      .toBe('<table class="kuro-table"><tbody><tr><td style="border-top: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; border-left: 1px solid #ddd" contenteditable="true">a</td></tr></tbody></table>')
  })

  it('背景と組で決めた文字色は、背景を落とすなら一緒に落とす（白地に白い字を残さない）', () => {
    expect(N('<p><a href="https://x.example" style="background:#030712;color:#fff;font-weight:700">見る</a></p>'))
      .toBe('<p><strong>[[https://x.example|見る]]</strong></p>')
  })
})

describe('約束 3: 機能の記法は残す', () => {
  it('data-* と id は残る（ページ内リンクの行き先・ホストの機能）', () => {
    expect(N('<h3 id="a-s1">見出し</h3><p data-x="1">a</p>')).toBe('<h3 id="a-s1">見出し</h3><p data-x="1">a</p>')
  })

  it('中身の無い機能の要素も残る（entamy.com の <a data-brand-site href>）', () => {
    expect(N('<p><a data-brand-site href="https://kuro.boo"></a>本文</p>'))
      .toBe('<p><a data-brand-site="" href="https://kuro.boo"></a>本文</p>')
  })

  it('外した器の data-* / id は、最初のブロックへ移す', () => {
    expect(N('<section id="purpose" data-source-doc-id="s17"><h2>目的</h2><p>a</p></section>'))
      .toBe('<h2 id="purpose" data-source-doc-id="s17">目的</h2><p>a</p>')
  })

  it('kuro- / kurocms- のコメントだけ残す', () => {
    expect(N('<p>a</p><!-- kurocms-reactions:off --><!--TgQPHd|||[]--><p>b</p>'))
      .toBe('<p>a</p><!-- kurocms-reactions:off --><p>b</p>')
  })

  it('data-kuro-* を持つ部品（レシピカード等）は中まで触らない', () => {
    const card = '<div data-kuro-block="recipe-card" data-recipe="x" data-recipe-version="1"><div class="kuro-recipe__head" style="color:red">鍋</div></div>'
    expect(N(card)).toBe(card)
  })

  it('[[…]] は文字なので残る。本文直下の URL カード・メディアと <br> は段落で包まない', () => {
    expect(N('<p>text</p>[[https://a.example|]]<br>[[img-1|60%,right]]'))
      .toBe('<p>text</p>[[https://a.example|]]<br>[[img-1|60%,right]]')
  })
})

describe('エディタの形', () => {
  it('<b>・太字の span → <strong>、<i>・斜体 → <em>、下線・取り消し線もタグへ', () => {
    expect(N('<p><b>a</b><i>b</i><span style="text-decoration: underline">c</span><del>d</del></p>'))
      .toBe('<p><strong>a</strong><em>b</em><u>c</u><s>d</s></p>')
  })

  it('<font> は span の書き方へ', () => {
    expect(N('<p><font color="#ff0000" size="5">a</font></p>'))
      .toBe('<p><span style="color: #ff0000; font-size: 150%">a</span></p>')
  })

  it('意味の無い div は段落、ブロックを抱えていれば外す', () => {
    expect(N('<div data-bid="x-1">text</div>')).toBe('<p data-bid="x-1">text</p>')
    expect(N('<div style="font-family: Arial"><div dir="ltr"><p>a</p><p>b</p></div></div>')).toBe('<p>a</p><p>b</p>')
  })

  it('ブロックに付いた文字装飾は落とす（R6 を引き継ぐ）', () => {
    expect(N('<p style="font-size: 15px; font-weight: 400;">本文</p>')).toBe('<p>本文</p>')
  })

  it('書式の要素がブロックを抱えていたら、書式をブロックの内側へ配る', () => {
    expect(N('<p>本文の文字</p><span style="font-size: 24px"><p>a</p><p>b</p></span>'))
      .toBe('<p>本文の文字</p><p><span style="font-size: 150%">a</span></p><p><span style="font-size: 150%">b</span></p>')
  })

  it('表: kuro-table・tbody 1 つ・長方形・壊れた colspan は外す・空のセルは <br>', () => {
    expect(N('<table border="1"><thead><tr><th colspan="undefined">A</th><th>B</th></tr></thead><tbody><tr><td></td></tr></tbody></table>'))
      .toBe('<table class="kuro-table"><tbody><tr><th contenteditable="true">A</th><th contenteditable="true">B</th></tr>' +
        '<tr><td contenteditable="true"><br></td><td contenteditable="true"><br></td></tr></tbody></table>')
  })

  it('列幅は列数が合うときだけ % で残す（px は比率に直す）', () => {
    expect(N('<table><colgroup><col width="100"><col width="300"></colgroup><tr><td>a</td><td>b</td></tr></table>'))
      .toBe('<table class="kuro-table"><colgroup><col style="width: 25.0000%"><col style="width: 75.0000%"></colgroup>' +
        '<tbody><tr><td contenteditable="true">a</td><td contenteditable="true">b</td></tr></tbody></table>')
    expect(N('<table><colgroup><col width="100"></colgroup><tr><td>a</td><td>b</td></tr></table>')).not.toContain('colgroup')
  })

  it('コードブロックは <pre class="kuro-code" data-gutter><code>文字だけ</code></pre>', () => {
    expect(N('<pre><span class="k">if</span> a\nb</pre>'))
      .toBe('<pre class="kuro-code" data-gutter="1\n2"><code>if a\nb</code></pre>')
    expect(N('<div spellcheck="false"><div data-language="plain">a</div><div data-language="plain">b</div></div>'))
      .toBe('<pre class="kuro-code" data-gutter="1\n2"><code>a\nb</code></pre>')
  })

  it('水平線は kuro-hr、色は border-top-color だけ', () => {
    expect(N('<hr style="font-size:14px">')).toBe('<hr class="kuro-hr">')
    expect(N('<hr style="border: 0; border-top: 2px solid #ef4444">')).toBe('<hr class="kuro-hr" style="border-top-color: #ef4444">')
  })

  it('リスト: 項目の外の文字は項目に、入れ子は直前の項目の子に', () => {
    expect(N('<ul>外<li>a</li><ul><li>b</li></ul></ul>'))
      .toBe('<ul><li>外</li><li>a<ul><li>b</li></ul></li></ul>')
    expect(N('<ol type="a" start="3"><li>x</li></ol>')).toBe('<ol class="kuro-list-alpha" start="3"><li>x</li></ol>')
  })

  it('器の外の <li> は <ul> に入れる', () => {
    expect(N('<li>a</li><li>b</li>')).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('本文直下の文字は段落に入れる', () => {
    expect(N('a<b>b</b><p>c</p>')).toBe('<p>a<strong>b</strong></p><p>c</p>')
  })

  it('前の版が <p> に化けさせた器を戻す（R5 を引き継ぐ）', () => {
    expect(N('<p class="kuro-callout kuro-callout--tip">tip</p>'))
      .toBe('<div class="kuro-callout kuro-callout--tip"><p>tip</p></div>')
  })

  it('data-bid は 1 ブロックに 1 つ（R8 を引き継ぐ）', () => {
    const out = N('<h1 data-bid="A">見出し<p data-bid="B">本文</p></h1>')
    expect(out).toBe('<h1 data-bid="A">見出し</h1><p>本文</p>')
  })

  it('空の段落: <br> のあるものは 1 つの空行、何も無いものは捨てる', () => {
    expect(N('<div><br><br></div>')).toBe('<p><br></p>')
    expect(N('<p>   </p><p>a</p>')).toBe('<p>a</p>')
    expect(N('<p>&nbsp;</p>')).toBe('<p>&nbsp;</p>')
  })

  it('文字参照はブラウザ（innerHTML）と同じ書き方に揃える — 開いて保存しても変わらない', () => {
    expect(N('<p><a href="/x?a=1&b=2" title="&copy; x">a</a></p>'))
      .toBe('<p><a href="/x?a=1&amp;b=2" title="© x">a</a></p>')
    expect(N('<p><a href="https://x.example/?a=1&b=2">Q&amp;A</a></p>'))
      .toBe('<p>[[https://x.example/?a=1&amp;b=2|Q&amp;A]]</p>')
  })

  it('外の書き方のリンクはエディタの記法へ（記法にできないものは <a> のまま）', () => {
    expect(N('<p><a href="https://a.example/" target="_blank" class="x">https://a.example/</a></p>'))
      .toBe('<p>[[https://a.example/]]</p>')
    expect(N('<p><a href="https://a.example/" id="r1">a</a></p>')).toBe('<p><a href="https://a.example/" id="r1">a</a></p>')
    expect(N('<p><a href="mailto:a@example.com">m</a></p>')).toBe('<p><a href="mailto:a@example.com">m</a></p>')
    expect(N('<p><a href="https://a.example/" rel="sponsored noopener">広告</a></p>')).toBe('<p><a href="https://a.example/" rel="sponsored noopener">広告</a></p>')
    expect(N('<p><a href="https://a.example/">[x]</a></p>')).toBe('<p><a href="https://a.example/">[x]</a></p>')
    // 図として描かれる URL（動画）は文中の <a> のまま（段落が割れない）
    expect(N('<p>見て<a href="https://www.youtube.com/watch?v=x">https://www.youtube.com/watch?v=x</a></p>'))
      .toBe('<p>見て<a href="https://www.youtube.com/watch?v=x">https://www.youtube.com/watch?v=x</a></p>')
  })

  it('同じ id は最初の 1 つだけ（外した包みの id が配られても重ならない）', () => {
    expect(N('<b id="g1" style="font-weight:normal"><p>一</p><p>二</p></b>')).toBe('<p><span id="g1">一</span></p><p>二</p>')
    expect(N('<p>Q&A &#x20bb7; a > b &nbsp;&copy &bigstar;</p>'))
      .toBe('<p>Q&amp;A 𠮷 a &gt; b &nbsp;© &bigstar;</p>')
  })

  it('段落の中の画像の [[…]] は段落の外へ（ブラウザも図の手前で段落を閉じる）', () => {
    expect(N('<p>まえ[[img-1|60%,right]]あと</p><p>[[https://a.example|]]</p>'))
      .toBe('<p>まえ</p>[[img-1|60%,right]]<p>あと</p><p>[[https://a.example|]]</p>')
  })
})

describe('壊れた HTML も必ず形にする', () => {
  it('閉じ忘れは親で閉じる', () => {
    expect(N('<p>unclosed')).toBe('<p>unclosed</p>')
    expect(N('</p>')).toBe('')
  })

  it('交差したタグは、開いた順に閉じる', () => {
    expect(N('<p><b><i>x</b></i></p>')).toBe('<p><strong><em>x</em></strong></p>')
  })

  it('Google の AI の回答のコピー（plaimy-rival の実例）', () => {
    const src = '<div style="font-family: Arial, sans-serif;"><button style="font-size: 13.3px"></button>' +
      '<p><span style="font-size: 16px; font-weight: 700;">Steam</span><span style="font-size: 14px;">。</span></p></div>' +
      '<div><div style="margin-left: -0.22px;"><div dir="ltr"><br><p>前置き<!--TgQPHd|||[]--></p>' +
      '<table class="kuro-table"><tbody><tr><th colspan="undefined">順位<!--TgQPHd|||[]--></th></tr></tbody></table>' +
      '<hr style="font-size: 14px;"></div></div></div>'
    expect(N(src)).toBe('<p><strong>Steam</strong><span style="font-size: 85%">。</span></p><br><p>前置き</p>' +
      '<table class="kuro-table"><tbody><tr><th contenteditable="true">順位</th></tr></tbody></table><hr class="kuro-hr">')
  })

  it('Google スプレッドシートの包み（<google-sheets-html-origin>）は外す', () => {
    expect(N('<google-sheets-html-origin><table><tr><td>a</td></tr></table></google-sheets-html-origin>'))
      .toBe('<table class="kuro-table"><tbody><tr><td contenteditable="true">a</td></tr></tbody></table>')
  })
})

describe('守り（R0）と性質', () => {
  it('script / style / on* / javascript: は落ちる', () => {
    expect(N('<p onclick="x()">a<script>alert(1)</script></p><style>p{}</style><a href="javascript:x">b</a>'))
      .toBe('<p>a</p><p>b</p>')
  })

  it('冪等', () => {
    const src = '<div><b>a</b></div><div><br></div><div data-bid="w"><p>x</p></div><table><tr><td style="border:1px solid red">c</td></tr></table>'
    const once = N(src)
    expect(N(once)).toBe(once)
  })

  it('空・文字列以外', () => {
    expect(N('')).toBe('')
    expect(N(null)).toBe('')
    expect(N(undefined)).toBe('')
  })

  it('normalizeContentHtml は conformContentHtml と同じ（旧い名前・旧いオプションは無視）', () => {
    const src = '<h1><p style="font-size: 15px">本文</p></h1>'
    expect(N(src, { clipboardRepair: false })).toBe(conformContentHtml(src))
  })

  it('cssColor はテーマの変数を色と認めない', () => {
    expect(cssColor('#FFF')).toBe('#fff')
    expect(cssColor('var(--muted)')).toBe(null)
    expect(cssColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
  })
})

describe('inspectContentHtml', () => {
  it('変わるかどうか（正）と内訳（目安）', () => {
    const s = inspectContentHtml('<div>a</div><p><b>x</b></p><div><br></div>')
    expect(s.bTags).toBe(1)
    expect(s.changed).toBe(true)
  })

  it('形どおりなら変わらない', () => {
    expect(inspectContentHtml('<p>a <strong>b</strong></p><p><br></p>').changed).toBe(false)
  })
})
