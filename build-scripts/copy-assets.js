// dist へ「vite が扱わない素ファイル」を複製する。
//  - kuro-content.css : 公開ページ用の本文スタイル（エディタ非読込ページ向け）
//  - blocks.js / kuro-links.js / recipe.js : DOM 非依存の共有純関数モジュール
//    （ホストが vendored。recipe.js は KuroCMS のサーバー側検証とも実装を共有する）
//  - *.d.ts : 上記モジュールの型定義（KuroEditor が単一保守 → ホストが vendored）
// これらは verbatim コピー（vite バンドル対象外）。
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

const files = [
  ['src/content.css', 'dist/kuro-content.css'],
  ['src/blocks.js', 'dist/kuro-blocks.js'],
  ['src/kuro-blocks.d.ts', 'dist/kuro-blocks.d.ts'],
  ['src/kuro-links.js', 'dist/kuro-links.js'],
  ['src/kuro-links.d.ts', 'dist/kuro-links.d.ts'],
  ['src/normalize.js', 'dist/kuro-normalize.js'],
  ['src/recipe.js', 'dist/kuro-recipe.js'],
  ['src/kuro-recipe.d.ts', 'dist/kuro-recipe.d.ts'],
  ['src/kuro-normalize.d.ts', 'dist/kuro-normalize.d.ts'],
];

for (const [from, to] of files) {
  copyFileSync(from, to);
  console.log(`  [copy-assets] ${from} → ${to}`);
}
