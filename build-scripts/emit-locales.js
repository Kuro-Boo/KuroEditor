#!/usr/bin/env node
/**
 * emit-locales.js — エディタ UI の辞書を言語ごとの小さなファイルにする(仕様 editor-editor-spec-ui #spec-i18n)。
 *
 * src/locales/<lang>.js(ESM の default)を dist/locales/kuro-editor.<lang>.js へ。
 * 中身は自分を globalThis.__kuroEditorLocales[lang] に登録するだけなので、<script> でも import でも読め、
 * 本体より先に読んでも後に読んでもよい。ja・en は本体にも入っている(読まなくてよい)が、揃えて出す。
 * `npm run build` の最後(vite build が dist/ を空にした後)で走る。
 */
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SRC = resolve('src/locales')
const OUT = resolve('dist/locales')
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.js')).sort()) {
  const lang = f.replace(/\.js$/, '')
  const dict = (await import(pathToFileURL(join(SRC, f)).href)).default
  const body = `(globalThis.__kuroEditorLocales=globalThis.__kuroEditorLocales||{})[${JSON.stringify(lang)}]=${JSON.stringify(dict)};\n`
  writeFileSync(join(OUT, `kuro-editor.${lang}.js`), body)
  console.log(`  dist/locales/kuro-editor.${lang}.js (${Buffer.byteLength(body)} B)`)
}
