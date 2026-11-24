/**
 * エディタ UI の言語(仕様 editor-editor-spec-ui #spec-i18n)。
 * - 辞書の鍵は ja が正本。ほかの言語に抜け・余りが無く、差し込み({n} など)が揃っている
 * - editor.js が引く鍵はすべて ja にあり、ja の鍵はすべてどこかで引かれている
 * - uiLang: 'en' のエディタの画面(ボタンの説明・入力欄・モーダル)に日本語が残らない
 */
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { KuroEditor, normalizeUiLang, UI_LANGS, CONTACT_DEFAULTS } from '../src/editor.js'
import { t, setUiLocale, loadLocale } from '../src/i18n.js'
import ja from '../src/locales/ja.js'

const LOCALES_DIR = path.resolve(__dirname, '../src/locales')
const localeFiles = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.js'))
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const JP = /[぀-ヿ㐀-鿿]/

afterEach(() => { setUiLocale('ja'); delete globalThis.__kuroEditorLocales })

describe('辞書', () => {
  it('置いてある辞書は 11 言語の中のものだけ', () => {
    for (const f of localeFiles) expect(UI_LANGS).toContain(f.replace(/\.js$/, ''))
    expect(localeFiles).toContain('ja.js')
    expect(localeFiles).toContain('en.js')
  })
  for (const f of localeFiles) {
    it(`${f}: ja と同じ鍵を持ち、差し込みが揃う`, async () => {
      const dict = (await import(path.join(LOCALES_DIR, f))).default
      expect(Object.keys(dict).sort()).toEqual(Object.keys(ja).sort())
      for (const k of Object.keys(ja)) {
        expect(typeof dict[k], k).toBe('string')
        expect(dict[k].length, k).toBeGreaterThan(0)
        expect(vars(dict[k]), k).toBe(vars(ja[k]))
      }
    })
  }
  it('ja・zh(漢字を使う)以外の辞書に日本語が混ざらない', async () => {
    for (const f of localeFiles.filter((x) => !['ja.js', 'zh.js'].includes(x))) {
      const dict = (await import(path.join(LOCALES_DIR, f))).default
      for (const [k, v] of Object.entries(dict)) expect(JP.test(v), `${f} ${k}: ${v}`).toBe(false)
    }
  })
  it('editor.js が引く鍵はすべて ja にあり、ja の鍵はすべて使われている', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/editor.js'), 'utf8')
    const used = new Set([...src.matchAll(/\b(?:tr|lz)\('([A-Za-z0-9]+\.[A-Za-z0-9]+)'/g)].map((m) => m[1]))
    for (const k of used) expect(ja[k], k).toBeDefined()
    // 前置きで組み立てて引く鍵(jobErr.・recipeErr.・contactErr.・contactKind.)
    const prefixes = [...src.matchAll(/tr\(`([A-Za-z]+)\.\$\{/g)].map((m) => m[1] + '.')
    for (const k of Object.keys(ja)) {
      expect(used.has(k) || prefixes.some((p) => k.startsWith(p)), `使われていない鍵: ${k}`).toBe(true)
    }
  })
})

describe('言語の選び方', () => {
  it('ja-JP・pt-BR は前半で読み、11 言語に無いものは en', () => {
    expect(normalizeUiLang('ja-JP')).toBe('ja')
    expect(normalizeUiLang('pt-BR')).toBe('pt')
    expect(normalizeUiLang('nl')).toBe('en')
  })
  it('辞書が読まれていない言語は en で動く', () => {
    expect(setUiLocale('fr')).toBe('en')
    expect(t('popmtitles.bold')).toBe('Bold (Ctrl/⌘+B)')
  })
  it('辞書を登録すれば、その言語で引き、無い鍵は en で出す', async () => {
    globalThis.__kuroEditorLocales = { fr: { 'popmtitles.bold': 'Gras (Ctrl/⌘+B)' } }
    expect(await loadLocale('fr-FR')).toBe('fr')
    expect(setUiLocale('fr')).toBe('fr')
    expect(t('popmtitles.bold')).toBe('Gras (Ctrl/⌘+B)')
    expect(t('popmtitles.italic')).toBe('Italic (Ctrl/⌘+I)')
  })
  it('差し込みを埋める', () => {
    setUiLocale('en')
    expect(t('imageMenu.title', { size: '50%' })).toBe('Width 50%')
  })
})

describe('英語の画面', () => {
  const mount = () => { const el = document.createElement('div'); document.body.appendChild(el); return el }
  it('uiLang: en のエディタは、部品の説明・入力欄・モーダルに日本語を残さない', () => {
    const ed = new KuroEditor(mount(), { uiLang: 'en', jobUi: true, contactUi: true })
    const texts = []
    for (const el of document.querySelectorAll('body *')) {
      if (ed.wysiwyg.contains(el) || el.closest('.kuro-pane__source')) continue
      for (const a of ['title', 'aria-label', 'placeholder', 'data-placeholder']) {
        const v = el.getAttribute(a)
        if (v) texts.push(`${a}=${v}`)
      }
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) texts.push(n.textContent.trim())
      if (el.tagName === 'OPTION') texts.push(el.textContent)
    }
    // ア・(ア) は番号リストの記号の見本(訳さない)。問い合わせの既定の文(CONTACT_DEFAULTS)は本文に入る文で、
    // 本文の言語に従う(段取り②で本文の言語へ)。ここでは画面の文だけを見る
    const content = new Set(Object.values(CONTACT_DEFAULTS).map((v) => `placeholder=${v}`))
    const left = texts.filter((s) => !content.has(s) && JP.test(s.replace(/\(?ア\)?/g, '')))
    expect(left).toEqual([])
    expect(ed.uiLang).toBe('en')
  })
  it('既定(ブラウザが日本語)なら日本語', () => {
    const ed = new KuroEditor(mount())
    expect(ed.uiLang).toBe('ja')
    expect(ed.root.querySelector('[title^="元に戻す"]')).not.toBeNull()
  })
})
