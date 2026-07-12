<div align="center">

# KuroEditor

**編集画面はライト/ダーク切替対応・Vanilla JS の WYSIWYG エディター**

[![License](https://img.shields.io/badge/license-Kuro%20License-blue.svg)](LICENSE.txt)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-38bdf8)](https://tailwindcss.com/)
[![No deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](#)

[English](README.md) | **日本語**

外部 JS ライブラリーゼロ — 単一ファイル `kuro-editor.js` を読み込むだけで動作する組込み用 WYSIWYG エディターです。

### 🌐 [紹介ページ](https://kuro.boo/kuroeditor/) &nbsp;·&nbsp; 🎮 [サンプルを試す](https://kuro.boo/kuroeditor/sample/) &nbsp;·&nbsp; 🏠 [作者: Kuro.Boo](https://kuro.boo/)

</div>

---

## ⚠️ v2.0.0 — CSS アーキテクチャ v2（WYSIWYG 強化）

**コンテンツの見た目を「単一の正」に集約しました。** 編集中とサイト公開時の表示を構造的に一致（WYSIWYG）させ、将来の乖離を防ぎます。

- **`src/content.css`** … 編集されるコンテンツの見た目（見出し・本文・引用・リスト・リンク・hr など）を**プレーンCSSで一元管理**。公開ページはこのファイルを読みます。色は `--kuro-*` 変数（既定はテーマ非依存／`inherit`）。
- **`src/editor2.css`**（旧 `editor.css` をリネーム）… **エディタUI（ツールバー・メニュー等の枠）専用**。`@import "tailwindcss"` ＋ `@import "./content.css"` ＋ `.kuro-content { --kuro-*: <ダーク値> }` のみ。**コンテンツの見た目ルールは持ちません**。
- `src/main.js` は `editor2.css` を読み込みます。

**重要（公開側）**：見出し等はテンプレートの Tailwind preflight で素タグが小さくなるため、content.css は `.kuro-content` 配下に加え、**KuroEditor が見出しに付与する `id="kuro-h-*"`** にもスコープして公開ページで効くようにしています。

### 🛟 問題が出たら（旧CSSへフォールバック）
v2 で表示崩れ等が起きた場合の戻し方：

- **推奨（完全復元）**：組込み側（例: KuroCMS）で KuroEditor を **v1.0.8 にピン**する。v1.0.8 の `dist/`（旧 `editor.css` ＋ 旧 `content.css`）をそのまま使うので、確実に元の表示へ戻ります。
- **暫定（その場で）**：`src/main.js` の import を `editor2.css` → `editor.css` に戻して `npm run build`。※ただし `content.css` は v2 で更新されているため、これは部分的な復元です（完全復元は v1.0.8 ピンを使用）。

> 旧 `editor.css` は削除せず**フォールバック用に残して**あります。完全な原状回復が必要な場合は v1.0.8 を利用してください。

---

## ✨ 特徴

- 🪶 **ライブラリ不要** — Vanilla JS と Tailwind CSS だけで構成。React / Vue / jQuery 不要
- 🎨 **豊富な装飾** — 見出し H1〜H4、引用、コールアウト（4色）、リスト、文字色、フォントサイズ、行間、整列、コードブロック。コードブロックは行番号・コピー・削除・ドラッグ並び替えに対応
- 📊 **本格的なテーブル** — セル結合・分割、罫線スタイル個別指定、列幅ドラッグリサイズ、セル背景色、縦方向配置、テーブル削除
- 🖼 **メディア対応** — 画像／動画／音声／YouTube・Vimeo 埋め込み、ドラッグ＆ドロップ、クリップボード貼り付け
- 🔗 **特殊リンク記法** — `[[slug]]` / `[[[slug]]]` / `[[slug|表示]]` で WiKi 風リンク
- 🌓 **編集画面のライト/ダーク切替** — 既定は公開ページに合わせたライト表示。ダークにも切替できます（`canvasDark` オプション / `setCanvasDark()`。タブバーのトグル表示は `canvasDarkUi: true` でオプトイン）
- 💾 **自動保存** — 任意の間隔で `onSave` コールバック
- 📝 **ソース編集** — WYSIWYG / HTML ソースをタブ切り替え
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

ビルド済みの 2 ファイルをサーバーに置きます:

| ファイル | 内容 |
|---|---|
| `dist/kuro-editor.js` | エディター本体（Vanilla JS、依存なし） |
| `dist/kuro-editor.css` | スタイル（Tailwind コンパイル済み、スコープ済み） |

ローカルでビルドする場合:

```bash
npm install
npm run build
# → dist/kuro-editor.js, dist/kuro-editor.css が生成
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
| `canvasDark` | `boolean` | 任意。編集キャンバスの初期ダークモードをホストが強制。指定時は localStorage の保存値より優先され、トグルしても localStorage に書き込みません。未指定なら従来どおり localStorage 復元（既定ライト） |
| `canvasDarkUi` | `boolean` | 既定 `false`（非表示）。`true` でタブバーに「ダーク」トグルチェックを表示。非表示でも `canvasDark` / `setCanvasDark()` による切替は有効です |
| `canvasColors` | `object` | 任意。ライト（通常）モードのキャンバス配色をホストサイトの実際の色に合わせます。`{ bg, text, caret, placeholder, cellFocusBg, dragOverBg }`（各値 CSS color、部分指定可）。省略キーは既定（白地/slate-900 系）のまま。実行時変更は `setCanvasColors()` |
| `canvasDarkColors` | `object` | 任意。ダークモードのキャンバス配色。shape は `canvasColors` と同じで、ダーク表示中のみ適用。省略キーはダーク既定（`#171717`/`#f5f5f5` 系）のまま。実行時変更は `setCanvasDarkColors()` |
| `clipControl` | `boolean` | 既定 `false`（非表示）。`true` で文字選択ポップアップの末尾にコピー / 切り取り / 貼り付けの 3 ボタンを表示。WebView 埋め込み等、ホストがクリップボードを仲介する環境向け |
| `onClipCopy({text, html})` | `function` | コピーボタンのタップ時に選択内容（プレーンテキストと HTML）とともに呼ばれる。未指定時は `navigator.clipboard.writeText(text)` にフォールバック |
| `onClipCut({text, html})` | `function` | 切り取りボタンのタップ時に選択内容とともに呼ばれる。呼び出し後、エディタ側で選択範囲を削除。未指定時は `navigator.clipboard.writeText(text)` にフォールバック |
| `onClipPaste()` | `function` | 貼り付けボタンのタップ時に呼ばれる。`string`（または `string` を resolve する `Promise`）を返すと選択位置にプレーンテキストとして挿入。何も返さなければ挿入はホスト側に委ねる。未指定時は `navigator.clipboard.readText()` にフォールバック |
| `onFetchUrlMeta(slug)` | `async function` | 任意。URL カード（`[[slug\|]]`）の豪華表示用メタ取得。`{ title?, description?, favicon?, image? }`（または `null`）を返す。**2 段階表示**：カードはまず URL 由来の簡易表示で即描画され（画面はブロックしない）、この関数が解決したらそのカードだけをタイトル/説明/favicon/サムネイルに差し替える。未指定・`null`・失敗時は簡易表示のまま |

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
editor.getContent()       // 現在の HTML を取得（[[...]] 記法に戻して）
editor.setMode('source')  // 'wysiwyg' | 'source' へ切替
editor.getMode()          // 現在のモード
editor.destroy()          // 後片付け（イベント解除＋元の要素に戻す）
```

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
npm run dev      # 開発サーバー (http://localhost:5177)
npm test         # 単体テスト（Vitest）
npm run build    # dist/ にビルド
```

### ディレクトリ構成

```
src/
  editor.js     # KuroEditor 本体（クラス + ユーティリティ）
  editor.css    # Tailwind CSS スタイル
  main.js       # デモページのエントリ
  index.html    # 開発用デモ
tests/          # Vitest テスト
dist/           # ビルド成果物 (kuro-editor.js / .css)
```

---

## 📜 ライセンス

[Kuro License](LICENSE.txt) — MIT ベース＋帰属表示要件付き。

> このソフトウェアを使ったユーザー向けインターフェイスを公開する場合、フッターやクレジット欄などに `Editor: Kuro.Boo` ([https://kuro.boo/](https://kuro.boo/)) の表示が必要です。
