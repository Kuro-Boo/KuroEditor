<div align="center">

# KuroEditor

**編集画面はライト/ダーク切替対応・Vanilla JS の WYSIWYG エディター**

[![License](https://img.shields.io/badge/license-Kuro%20License-blue.svg)](LICENSE.txt)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-38bdf8)](https://tailwindcss.com/)
[![No deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](#)

[English](README.md) | **日本語**

外部 JS ライブラリーゼロ — 単一ファイル `kuro-editor.js` を読み込むだけで動作する組込み用 WYSIWYG エディターです。

### 🌐 [紹介ページ](https://kuro.boo/kuroeditor/) &nbsp;·&nbsp; 🎮 [サンプルを試す](https://kuro.boo/kuroeditor/sample/) &nbsp;·&nbsp; 📖 [操作マニュアル](https://kuro.boo/kuroeditor/guide/) &nbsp;·&nbsp; 🏠 [作者: Kuro.Boo](https://kuro.boo/)

</div>

---

## 📖 ドキュメント

| 読む人 | ドキュメント |
|---|---|
| **記事を書く人** | 📖 **[操作マニュアル](https://kuro.boo/kuroeditor/guide/)** — 画面の見かた・改行と段落の違い・字下げ・リスト・表・画像・リンク・コールアウトの使い方を、**実際の画面と表示例つき**で解説（日本語） |
| **組み込む人** | この README（下のクイックスタート以降）と [紹介ページ](https://kuro.boo/kuroeditor/) |
| **触って試す人** | 🎮 [サンプル](https://kuro.boo/kuroeditor/sample/) — 実物を動かせます |

操作マニュアルは、エディタのタブバー右上にある **「？」ボタン**（目次ボタンの左）からも開けます。
自前のマニュアルを配る場合は `helpUrl` で差し替え、ボタンごと消す場合は `helpUi: false` を指定してください。
マニュアルの実体は**このリポジトリの [`public/guide/index.html`](public/guide/index.html)** なので、自分のサイトに置いて `helpUrl` をそちらへ向けることもできます。

---

## ⚠️ v2.0.0 — CSS アーキテクチャ v2（WYSIWYG 強化）

**コンテンツの見た目を「単一の正」に集約しました。** 編集中とサイト公開時の表示を構造的に一致（WYSIWYG）させ、将来の乖離を防ぎます。

- **`src/content.css`** … 編集されるコンテンツの見た目（見出し・本文・引用・リスト・リンク・hr など）を**プレーンCSSで一元管理**。公開ページはこのファイルを読みます。色は `--kuro-*` 変数（既定はテーマ非依存／`inherit`）。
- **`src/editor.css`** … **エディタUI（ツールバー・メニュー等の枠）専用**。`@import "tailwindcss"` ＋ `@import "./content.css"` ＋ chrome スタイル。**コンテンツの見た目ルールは持ちません**。編集キャンバスは**既定でライト**（content.css のテーマ非依存な既定値＝公開ページと同じ値のまま）で、ダーク用の `--kuro-*` パレットは `.kuro-editor--canvas-dark` 修飾子の配下にスコープされているため、ライト表示や公開ページへ漏れません。
- `src/main.js` は `editor.css` を読み込みます。

**重要（公開側）**：見出し等はテンプレートの Tailwind preflight で素タグが小さくなるため、content.css は `.kuro-content` 配下に加え、**KuroEditor が見出しに付与する `id="kuro-h-*"`** にもスコープして公開ページで効くようにしています。

### 🛟 問題が出たら（旧CSSへフォールバック）
v2 で表示崩れ等が起きた場合の戻し方：

- **推奨（完全復元）**：組込み側（例: KuroCMS）で KuroEditor を **v1.0.8 にピン**する。v1.0.8 の `dist/`（旧モノリシック `editor.css` ＋ 旧 `content.css`）をそのまま使うので、確実に元の表示へ戻ります。

> 旧モノリシック `editor.css` は一時期フォールバック用にツリー内へ残していましたが、**削除済み**です（必要なら tag v1.0.8 / git 履歴から復元可能）。現在の `src/editor.css` は v2 の chrome 専用スタイルシート（旧 `editor2.css` をリネーム）です。

---

## ✨ 特徴

- 🪶 **ライブラリ不要** — Vanilla JS と Tailwind CSS だけで構成。React / Vue / jQuery 不要
- 🎨 **豊富な装飾** — 見出し H1〜H4、引用、コールアウト（4色）、リスト、文字色、フォントサイズ、行間、整列、コードブロック。コードブロックは行番号・コピー・削除・ドラッグ並び替えに対応（**行番号は公開ページにも出ます**）
- 📊 **本格的なテーブル** — セル結合・分割、罫線スタイル個別指定、列幅ドラッグリサイズ、セル背景色、縦方向配置、テーブル削除
- 🖼 **メディア対応** — 画像／動画／音声／YouTube・Vimeo 埋め込み、ドラッグ＆ドロップ、クリップボード貼り付け
- 🔗 **特殊リンク記法** — `[[slug]]` / `[[[slug]]]` / `[[slug|表示]]` で WiKi 風リンク。`[[url|]]` で **URL カード**（Dropbox Paper 風）。リンクはエディタ内の**リンク編集ポップアップ**とツールバーの 🔗 挿入ボタンでその場で編集・作成
- ↩️ **Undo / Redo** — 自前のスナップショット履歴（最大 200 手）。テーブル操作・リンク削除・書式適用など **DOM 直接操作もすべて取り消せます**。日本語入力（IME）の変換確定 Enter も誤爆しません
- 🌓 **編集画面のライト/ダーク切替** — 既定は公開ページに合わせたライト表示。ダークにも切替できます（`canvasDark` オプション / `setCanvasDark()`。タブバーのトグル表示は `canvasDarkUi: true` でオプトイン）
- 💾 **自動保存** — 任意の間隔で `onSave` コールバック
- 📝 **3 モード** — ✏️ 編集 / 👁 閲覧（読み取り専用） / `</>` HTML ソースをタブで切り替え
- 🪄 **目次自動生成** — 見出しからアウトラインを自動で構築

---

## 🚀 クイックスタート

最小構成は `<script>` 1 行＋マウント先の `<div>` だけです。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/path/to/kuro-editor.css">
</head>
<body>
  <div id="editor"></div>

  <script src="/path/to/kuro-editor.js"></script>
  <script>
    const editor = new KuroEditor(document.getElementById('editor'), {
      initialContent: '<p>こんにちは KuroEditor!</p>',
      onSave(html) {
        console.log('保存:', html)
      },
    })
  </script>
</body>
</html>
```

これだけで起動します。

---

## 📦 組み込み方

### 1. ファイルの入手

ビルド済みファイルをサーバーに置きます（エディターを載せるページに必要なのは上の 2 つ）:

| ファイル | 内容 |
|---|---|
| `dist/kuro-editor.js` | エディター本体（Vanilla JS、依存なし） |
| `dist/kuro-editor.css` | スタイル（Tailwind コンパイル済み、スコープ済み） |
| `dist/kuro-content.css` | **エディターを読み込まない公開ページ**用の本文スタイル（[保存コンテンツの表示](#-保存コンテンツの表示公開ページ)参照） |

ローカルでビルドする場合:

```bash
npm install
npm run build
# → dist/kuro-editor.js, dist/kuro-editor.css, dist/kuro-content.css が生成
```

### 2. HTML への組み込み

CSS を `<head>` に、JS を `<body>` の末尾（または `defer` 付き）で読み込みます:

```html
<link rel="stylesheet" href="/assets/kuro-editor.css">

<div id="my-editor"></div>

<script src="/assets/kuro-editor.js" defer></script>
<script defer>
  document.addEventListener('DOMContentLoaded', () => {
    new KuroEditor(document.getElementById('my-editor'), {
      // ...options
    })
  })
</script>
```

> 💡 `kuro-editor.js` を読み込むと `window.KuroEditor` と `window.KUROEDITOR_VERSION` が定義されます。

### 3. ES Modules で使う場合

```js
import { KuroEditor } from './path/to/dist/kuro-editor.js'
import './path/to/dist/kuro-editor.css'

new KuroEditor(document.getElementById('editor'), { /* options */ })
```

### 4. CMS / フォーム部品としての例

既存フォームの `<textarea>` を置換する典型パターン:

```html
<form id="article-form">
  <input name="title" placeholder="記事タイトル">
  <div id="editor-mount"></div>
  <input type="hidden" name="body" id="body-field">
  <button type="submit">送信</button>
</form>

<script>
  const editor = new KuroEditor(document.getElementById('editor-mount'), {
    initialContent: document.getElementById('body-field').value,
  })

  document.getElementById('article-form').addEventListener('submit', () => {
    document.getElementById('body-field').value = editor.getContent()
  })
</script>
```

---

## 🖥 保存コンテンツの表示（公開ページ）

KuroEditor が出力する HTML は、クラスベースのブロック（角丸ボックス・テーブル・カスタムリストマーカー）を使います。これを**公開サイト側**（エディターを読み込まないページ）で表示するには、重い editor CSS の代わりに、軽量・テーマ非依存の `kuro-content.css` を読み込みます:

```html
<link rel="stylesheet" href="/assets/kuro-content.css">
<article><!-- KuroEditor で保存した HTML --></article>
```

- `kuro-content.css` はプレーン CSS（Tailwind なし・リセットなし）で、ホストページのスタイルを壊しません。ブロック用クラス（`.kuro-roundbox` / `.kuro-table` / `ul.kuro-ul-*` / `ol.kuro-list-*`）は保存 HTML に既に付いているため、ラッパー要素は不要です。
- テーマは `--kuro-*` CSS 変数（中立な既定値）で制御します。ダーク（や独自テーマ）に合わせるには変数を上書きします:

```css
:root {
  --kuro-box-border: #525252;
  --kuro-box-bg: #1a1a1e;
  --kuro-table-border: #525252;
  --kuro-table-head-bg: #262626;
}
```

> エディター本体の `kuro-editor.css` にはこれらのコンテンツスタイルが既に含まれます。エディターを読み込むページでは `kuro-content.css` は**不要**です。


### コードブロックのコピーボタン（任意）

コードブロックは公開ページでも**行番号つき**で表示されます（保存 HTML の `<pre data-gutter="…">` を `kuro-content.css` が描画）。
📋 **コピーボタン**はクリック＝JS が要るので、必要なページだけ小さなスクリプトを読み込みます（**依存ゼロ・約 2KB**）。

```html
<!-- コードブロックのあるページだけで読み込めば十分 -->
<script src="/path/to/kuro-code-copy.js" defer></script>
```

- 対象は `<pre data-gutter>` だけ。**保存 HTML は一切変わりません**（ボタンは実行時に後付け）
- 本文を差し替えるページは `window.kuroCodeCopy()` を呼べば付け直せます（二重には付きません）
- `navigator.clipboard` が使えない環境（http など）ではボタンを出しません

---

## ⚙️ オプション一覧

`new KuroEditor(mountEl, options)` で渡せる主なオプション:

| オプション | 型 | 説明 |
|---|---|---|
| `initialContent` | `string` | 初期 HTML。`[[...]]` 記法も自動展開されます |
| `onSave(html)` | `function` | 保存ボタン押下／自動保存時に呼ばれるコールバック |
| `autoSaveInterval` | `number` | 自動保存の間隔（ミリ秒）。既定 `30000` |
| `urlResolver(slug)` | `function` | `[[slug]]` 等の slug → URL 変換関数 |
| `onMediaUpload(file)` | `async function` | 画像・動画アップロード処理。`mid` を返すと自動で `[[mid]]` 形式で挿入されます |
| `modalToolbar` | `HTMLElement` | モーダルメニュー（mmenu）を任意の DOM スロットに差し込む場合に指定 |
| `modalMenu` | `boolean` | 既定 `true`。`false` でモーダルメニュー（mmenu）を表示しない（タブバーのインラインボタンが全アクションをミラーするため機能は失われません）。`modalToolbar` より優先 |
| `saveUi` | `boolean` | 既定 `true`。`false` で保存 UI（自動保存チェック＋保存ボタン。タブバー・mmenu 両方）を非表示にし、内蔵の自動保存も無効化。保存をホスト側が `onDirty` + `getContent()` で完全管理する場合に |
| `onDirty()` | `function` | 未保存の変更が生じた瞬間に呼ばれる（false→true 遷移のみ。保存で消灯し、次の編集で再発火）。文字色やセル背景などの装飾系 DOM 操作は `input` イベントを発火しないため、保存 UI を自前で持つホストは input 監視ではなく必ずこれを購読してください。保存完了時は `clearDirty()` を呼びます |
| `canvasDark` | `boolean` | 任意。編集キャンバスの初期ダークモードをホストが強制。指定時は localStorage の保存値より優先され、トグルしても localStorage に書き込みません。未指定なら従来どおり localStorage 復元（既定ライト） |
| `canvasDarkUi` | `boolean` | 既定 `false`（非表示）。`true` でタブバーに「ダーク」トグルチェックを表示。非表示でも `canvasDark` / `setCanvasDark()` による切替は有効です |
| `helpUi` | `boolean` | 既定 `true`（表示）。`false` でタブバー上段・目次ボタンの左の「？」ヘルプボタンを非表示にします |
| `helpUrl` | `string \| null` | 「？」ボタンが**別タブ**で開く操作ガイドの URL。既定は公式マニュアル `https://kuro.boo/kuroeditor/guide/`。自前のマニュアルがあれば差し替え、`null` ならボタン自体を出しません |
| `versionUi` | `boolean` | 既定 `true`（表示）。`false` でタブバー左上のバージョンバッジ（`vX.Y.Z`）を非表示にします。非表示でも `data-kuro-editor` 属性や `window.KUROEDITOR_VERSION` でバージョン確認は可能 |
| `canvasColors` | `object` | 任意。ライト（通常）モードのキャンバス配色をホストサイトの実際の色に合わせます。`{ bg, text, caret, placeholder, cellFocusBg, dragOverBg }`（各値 CSS color、部分指定可）。省略キーは既定（白地/slate-900 系）のまま。実行時変更は `setCanvasColors()` |
| `canvasDarkColors` | `object` | 任意。ダークモードのキャンバス配色。shape は `canvasColors` と同じで、ダーク表示中のみ適用。省略キーはダーク既定（`#171717`/`#f5f5f5` 系）のまま。実行時変更は `setCanvasDarkColors()` |
| `clipControl` | `boolean` | 既定 `false`（非表示）。`true` で文字選択ポップアップの末尾にコピー / 切り取り / 貼り付けの 3 ボタンを表示。WebView 埋め込み等、ホストがクリップボードを仲介する環境向け |
| `onClipCopy({text, html})` | `function` | コピーボタンのタップ時に選択内容（プレーンテキストと HTML）とともに呼ばれる。未指定時は `navigator.clipboard.writeText(text)` にフォールバック |
| `onClipCut({text, html})` | `function` | 切り取りボタンのタップ時に選択内容とともに呼ばれる。呼び出し後、エディタ側で選択範囲を削除。未指定時は `navigator.clipboard.writeText(text)` にフォールバック |
| `onClipPaste()` | `function` | 貼り付けボタンのタップ時に呼ばれる。`string`（または `string` を resolve する `Promise`）を返すと選択位置にプレーンテキストとして挿入。何も返さなければ挿入はホスト側に委ねる。未指定時は `navigator.clipboard.readText()` にフォールバック |
| `onFetchUrlMeta(slug)` | `async function` | 任意。URL カード（`[[slug\|]]`）の豪華表示用メタ取得。`{ title?, description?, favicon?, image? }`（または `null`）を返す。**2 段階表示**：カードはまず URL 由来の簡易表示で即描画され（画面はブロックしない）、この関数が解決したらそのカードだけをタイトル/説明/favicon/サムネイルに差し替える。未指定・`null`・失敗時は簡易表示のまま |
| `mediaAccept` | `string` | 既定 `'image/*,video/*,audio/*'`。メディアダイアログ「ファイル選択」の `<input type="file">` の accept。ホストが受け付ける種別に合わせて絞れます(例 `'image/*'`)。**iOS(WKWebView/Safari)は、写真ライブラリが提供できない種別(audio 等)が accept に混ざると Files ピッカーだけに落ちる**ため、画像のみのホストは `'image/*'` に絞ると「フォトライブラリ / 写真を撮る」の標準シートが出ます |
| `blockIds` | `boolean` | 既定 `false`。`true` で各トップレベルブロックに安定した `data-bid`（UUID）を付与・維持。外部同期レイヤーでのブロック単位 3-way マージ（named export の `mergeBlocks()`）の土台。保存には id 入りの `getContent()`、公開 HTML には id を除去した `getBuildImage()` を使います |

### onSave の例

```js
new KuroEditor(mount, {
  onSave(html) {
    fetch('/api/articles/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: html }),
    })
  },
})
```

### onMediaUpload の例

`onMediaUpload` を渡すと、ユーザーが画像をドラッグ＆ドロップ／貼り付け／ファイル選択した時に呼ばれます。返却した `mid` は `[[mid-xxx]]` として記事中に挿入され、表示時には `urlResolver` で実際の URL に変換されます。

```js
new KuroEditor(mount, {
  async onMediaUpload(file) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/media', { method: 'POST', body: fd })
    const { mid } = await res.json()
    return mid   // 例: "mid-abc123"
  },

  urlResolver(slug) {
    if (slug.startsWith('mid-')) return `/media/${slug}`
    if (slug.startsWith('http')) return slug
    return `/articles/${slug}`
  },
})
```

---

## 🎮 公開 API

```js
const editor = new KuroEditor(mountEl, options)

editor.setContent(html)   // 内容を上書き
editor.getContent()       // 現在の HTML を取得（[[...]] 記法に戻して。blockIds 有効時は data-bid 込み）
editor.getBuildImage()    // 公開/ビルド用 HTML（getContent() から編集専用メタ data-bid を除去）
editor.setMode('source')  // 'wysiwyg' | 'view' | 'source' へ切替
editor.getMode()          // 現在のモード
editor.setCanvasDark(true)     // 編集キャンバスのライト/ダーク切替（取得は isCanvasDark()）
editor.setCanvasColors({...})  // ライトのキャンバス配色を実行時変更（ダークは setCanvasDarkColors()）
editor.isDirty()          // 未保存の変更があるか（onDirty コールバックと対）
editor.clearDirty()       // ホスト側の保存が完了したことをエディタへ通知
editor.destroy()          // 後片付け（イベント解除＋元の要素に戻す）
```

### モード

タブバーは 3 モード構成です。

| タブ | モード | 挙動 |
|------|--------|------|
| ✏️ | `wysiwyg` | 編集。従来どおり各種ポップアップ・ツールバーが有効（既定） |
| 👁 | `view` | 閲覧（編集不可）。`contenteditable` を切り、コードブロックも読み取り専用。挿入系ボタンは無効化され、編集用ポップアップ（書式・テーブル・画像・リンク編集）は一切出ません。リンクはクリックしても遷移せず、「新しいタブで開くか」をダイアログで確認します |
| `</>` | `source` | HTML ソース |

---

## 🔖 特殊リンク記法

エディター内では以下のリンク記法をサポートします:

| 記法 | 用途 | 例 |
|---|---|---|
| `[[slug]]` | ハイパーリンク（インライン。表示テキスト＝slug） | `[[about]]` |
| `[[slug\|表示]]` | WiKi 形式（表示テキスト指定） | `[[about\|会社概要]]` |
| `[[slug\|]]` | **URL カード**（表題なしを明示 → Dropbox Paper 風カード表示） | `[[https://example.com\|]]` |
| `[[[slug]]]` | カード型リンク（別タブで開く） | `[[[recipe-curry]]]` |
| `[[mid\|60%,right]]` | メディア（サイズ＆配置） | `[[mid-001\|50%,center]]` |
| `[[url\|60%\|https://...]]` | 画像クリックで別タブ遷移 | — |

`slug` が `http` で始まる場合は外部リンクとして扱われます。

**URL カード（`[[slug|]]`）** — 表示テキストを空にして「表題なし」を明示すると、青いテキストリンクではなく、アイコン＋タイトル＋URL のカード（Dropbox Paper 方式）で表示されます。リンク編集ポップアップで表示テキストを空にするだけでカード化でき、逆に表示テキストを入れると通常のテキストリンクに戻ります。カードは編集画面では `contenteditable="false"` の 1 オブジェクトとして扱われ、クリックすると遷移せずリンク編集ポップアップが開きます（公開ページでは通常のリンクとして遷移）。

**2 段階表示（豪華表示）** — カードのタイトルは、既定では URL から得られる情報（http(s) はホスト名、内部 slug は slug 文字列）だけを使います。ブラウザは CORS で外部ページの `<title>` を読めないためです。`onFetchUrlMeta` を渡すと、①まず簡易表示のカードを**同期で即描画**（画面はブロックしない）→ ②ホストがサーバー側 fetch や unfurl サービスで解決したメタ（タイトル・説明・favicon・サムネイル）が届いたら、そのカードだけを豪華表示に**差し替え**る、という 2 段階になります。取得が遅くても・失敗しても簡易表示のまま残ります。

> **⚠️ 仕様上の注意** — 豪華表示のメタは**保存されず**（`getContent()` は常に `[[slug|]]` に戻す）、カードを表示するたびに `onFetchUrlMeta` で取得し直します。したがって、**編集時と本番表示時とで対象 URL の記事（タイトル・favicon・OGP 画像など）が変更されていると、カードの見た目が変化する場合があります。これは仕様です。** リンクの実体（`[[slug|]]`）は不変で、あくまで「その URL の今の情報」を描画するためです。

---

## 🛠 開発

```bash
npm install
npm run dev      # 開発サーバー → http://localhost:5177/src/index.html を開く
npm test         # 単体テスト（Vitest）
npm run build    # dist/ にビルド
```

### ディレクトリ構成

```
src/
  editor.js     # KuroEditor 本体（クラス + ユーティリティ）
  editor.css    # エディタ UI (chrome) のスタイル。content.css を import
  content.css   # 本文のスタイル（公開ページと共有）
  main.js       # デモページのエントリ
  index.html    # 開発用デモ（開発サーバーでは /src/index.html で配信）
tests/          # Vitest テスト
build-scripts/  # ビルド/リリース用ツール (bump.js / emit-version.js / landing CSS 入力)
public/         # 紹介/デモサイトの静的ファイル (vite build の対象)
dist/           # ビルド成果物 (kuro-editor.js / kuro-editor.css / kuro-content.css)
```

---

## 📜 ライセンス

[Kuro License](LICENSE.txt) — MIT ベース＋帰属表示要件付き。

> このソフトウェアを使ったユーザー向けインターフェイスを公開する場合、フッターやクレジット欄などに `Editor: Kuro.Boo` ([https://kuro.boo/](https://kuro.boo/)) の表示が必要です。
