// dist へ「vite が扱わない素ファイル」を複製する。
//  - kuro-content.css : 公開ページ用の本文スタイル（エディタ非読込ページ向け）
//  - kuro-code-copy.js : 公開ページのコードブロックに 📋 を後付けする小さな script
//  - blocks.js / kuro-links.js / recipe.js : DOM 非依存の共有純関数モジュール
//    （公開 repo の利用者向けの dist。Entamy のモノレポの中の製品は src を直接 import する）
//  - *.d.ts : 上記モジュールの型定義（src では .js と同じ名前で並べる。dist では kuro- を付ける）
// これらは verbatim コピー（vite バンドル対象外）。
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

const files = [
  ['src/content.css', 'dist/kuro-content.css'],
  ['src/blocks.js', 'dist/kuro-blocks.js'],
  ['src/blocks.d.ts', 'dist/kuro-blocks.d.ts'],
  ['src/kuro-links.js', 'dist/kuro-links.js'],
  // 公開ページ用のコピーボタン（ホストが opt-in で読み込む小さなスクリプト）
  ['src/kuro-code-copy.js', 'dist/kuro-code-copy.js'],
  ['src/kuro-links.d.ts', 'dist/kuro-links.d.ts'],
  ['src/normalize.js', 'dist/kuro-normalize.js'],
  ['src/recipe.js', 'dist/kuro-recipe.js'],
  ['src/recipe.d.ts', 'dist/kuro-recipe.d.ts'],
  ['src/normalize.d.ts', 'dist/kuro-normalize.d.ts'],
];

for (const [from, to] of files) {
  copyFileSync(from, to);
  console.log(`  [copy-assets] ${from} → ${to}`);
}
