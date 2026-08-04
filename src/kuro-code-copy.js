// KuroEditor — 公開ページ用のコードコピーボタン (kuro-code-copy.js)
// ---------------------------------------------------------------------------
// 編集画面のコードブロックには 📋 コピーボタンがある。公開ページにも同じものが
// 無いと「見たままが公開される」原則が崩れるが、コピーはクリック＝ JS が要るので
// CSS だけでは再現できない（行番号は ::before で再現できた）。そこで【ホストが
// 読み込んだときだけ】ボタンを後付けする、この小さなスクリプトを配る。
//
// 使い方（コードブロックのあるページだけで読み込めばよい）:
//   <script src="/path/kuro-code-copy.js" defer></script>
//
// ⚠ 保存 HTML にボタンを入れてはいけない。JS を読まないページでは「押せない
//   ボタン」になり、エディタへ読み戻したときにも本文の一部として混ざる。
//   保存形式は <pre data-gutter><code> のまま＝この判断はホストに委ねる。
// ⚠ コピーするのは <code> の textContent。行番号は CSS の ::before なので
//   そもそもテキストに含まれない（＝貼り付けたコードがそのまま動く）。
// ⚠ 外部依存ゼロ・グローバル汚染は window.kuroCodeCopy 一つだけ。
(function () {
  'use strict'

  var READY_ATTR = 'data-kuro-copy'
  var LABEL = '📋'
  var DONE = '✅'

  function copyText(text) {
    // navigator.clipboard は https / localhost でしか使えない。使えない環境では
    // そもそもボタンを出さない（押しても何も起きないボタンを見せない）。
    return navigator.clipboard.writeText(text)
  }

  function makeButton(code) {
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'kuro-code-copybtn'
    btn.textContent = LABEL
    btn.title = 'コードをコピー'
    btn.setAttribute('aria-label', 'コードをコピー')
    btn.addEventListener('click', function () {
      copyText(code.textContent || '').then(function () {
        btn.textContent = DONE
        btn.classList.add('kuro-code-copybtn--done')
        setTimeout(function () {
          btn.textContent = LABEL
          btn.classList.remove('kuro-code-copybtn--done')
        }, 1200)
      }).catch(function () { /* 失敗しても壊さない（見た目は元のまま） */ })
    })
    return btn
  }

  /**
   * root 配下のコードブロックにボタンを付ける。
   * 何度呼んでも二重に付かない（本文を差し替えるホストはそのまま呼び直せる）。
   * @param {ParentNode} [root=document]
   */
  function enhance(root) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return
    var scope = root || document
    var pres = scope.querySelectorAll('pre[data-gutter]')
    for (var i = 0; i < pres.length; i++) {
      var pre = pres[i]
      if (pre.getAttribute(READY_ATTR)) continue
      var code = pre.querySelector('code')
      if (!code) continue
      pre.setAttribute(READY_ATTR, '1')
      pre.appendChild(makeButton(code))
    }
  }

  window.kuroCodeCopy = enhance

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { enhance() })
  } else {
    enhance()
  }
})()
