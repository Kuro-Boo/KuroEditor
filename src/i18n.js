/**
 * エディタ UI の言語(仕様 editor-editor-spec-ui #spec-i18n)。
 *
 * - 本体は 1 つ。辞書は言語ごと(src/locales/<lang>.js)。本体に入るのは ja(正本)と en(受け皿)だけで、
 *   ほかの言語は dist/locales/kuro-editor.<lang>.js をホストが読む(`KuroEditor.loadLocale`)。
 * - 辞書のファイルは自分を `globalThis.__kuroEditorLocales[lang]` へ登録するだけ。読む順は問わない。
 * - 文言は短い鍵で引く。`{n}` のような差し込みは vars から埋める(語順を言語ごとに変えられる)。
 * - 鍵が辞書に無ければ en、それも無ければ ja、それも無ければ鍵そのものを出す(画面を空にしない)。
 *
 * ⚠ 画面の言語は 1 ページに 1 つ(いちばん新しく作ったエディタの uiLang)。言語を変えるときは、
 *   ホストがエディタを作り直す。本文の言語(求人カードなどの表示)は contentLang で別に持つ。
 */
import ja from './locales/ja.js'
import en from './locales/en.js'

/** Entamy の基本の 11 言語。これ以外は en。 */
export const UI_LANGS = ['ja', 'en', 'fr', 'it', 'es', 'zh', 'ko', 'uk', 'de', 'pt', 'ar']

const BUNDLED = { ja, en }

function registry() {
  const g = globalThis
  if (!g.__kuroEditorLocales || typeof g.__kuroEditorLocales !== 'object') g.__kuroEditorLocales = {}
  return g.__kuroEditorLocales
}

/** 'ja-JP'・'pt-BR'・'zh-Hans' などを 11 言語の名前へ。無いものは en。空はブラウザの言語。 */
export function normalizeUiLang(lang) {
  let v = typeof lang === 'string' ? lang.trim().toLowerCase() : ''
  if (!v && typeof navigator !== 'undefined') v = String(navigator.language || '').toLowerCase()
  const base = v.split(/[-_]/)[0]
  return UI_LANGS.includes(base) ? base : 'en'
}

function dictOf(lang) {
  return BUNDLED[lang] ?? registry()[lang] ?? null
}

let current = 'ja'

/**
 * 画面の言語を決める。辞書が読まれていない言語は en にする(読んでから作るのはホストの務め)。
 * @returns {string} 実際に使う言語
 */
export function setUiLocale(lang) {
  const want = normalizeUiLang(lang)
  current = dictOf(want) ? want : 'en'
  return current
}

export function getUiLocale() {
  return current
}

/** 鍵の文言。vars の {名前} を埋める。 */
export function t(key, vars) {
  const s = dictOf(current)?.[key] ?? en[key] ?? ja[key] ?? key
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])))
}

/**
 * 読み込み時(モジュールの最上位)に作る表のための、後で訳す文言。使う時(文字列へ変える時)の言語で出す。
 * innerHTML・setAttribute・連結・テンプレートでそのまま使える。=== で比べない。
 */
export function lz(key) {
  return {
    toString: () => t(key),
    valueOf: () => t(key),
    [Symbol.toPrimitive]: () => t(key),
    toJSON: () => t(key),
  }
}

/**
 * 言語の辞書を読む。ja・en は本体に入っているので何もしない。
 * @param {string} lang
 * @param {string} [url] 辞書のファイル(dist/locales/kuro-editor.<lang>.js)の URL。ja・en 以外では要る。
 *   ⚠ 置き場所を本体から割り出さない(import.meta は <script> で読まれた本体では構文の誤りになる)
 * @returns {Promise<string>} 使える言語(読めなければ 'en')
 */
export function loadLocale(lang, url) {
  const l = normalizeUiLang(lang)
  if (dictOf(l)) return Promise.resolve(l)
  if (typeof document === 'undefined') return Promise.resolve('en')
  const src = typeof url === 'string' ? url : ''
  if (!src) return Promise.resolve('en')
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve(dictOf(l) ? l : 'en')
    s.onerror = () => resolve('en')
    document.head.appendChild(s)
  })
}
