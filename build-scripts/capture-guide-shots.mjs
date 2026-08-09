#!/usr/bin/env node
/**
 * capture-guide-shots.mjs — 操作マニュアル（public/guide/）に貼るポップアップの
 * スクリーンショットを【実物のエディタから】撮り直す。
 *
 * マニュアルは「実際の画面」を見せる方針。手描きの図やスタイルの真似は本体の
 * 変更に置いていかれるので、浮遊メニュー（範囲選択の popm・テーブルメニュー・
 * イメージメニュー・リンク編集・BOX設定・絵文字）は本物を撮って貼る。
 *
 * 使い方（ビルドには含まれない。見た目を変えたときだけ手で回す）:
 *   1. npm run build && npx vite preview --port 5178 --strictPort &
 *   2. node build-scripts/capture-guide-shots.mjs
 *   → public/guide/img/*.png を上書き
 *
 * playwright は devDependencies に入れていない（このスクリプト専用のため）。
 * 手元に無ければ `npx playwright install chromium` を先に。
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'guide', 'img')
const URL_SAMPLE = process.env.KE_SAMPLE_URL || 'http://localhost:5178/sample/'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  // npx キャッシュに入っている playwright を拾う（このリポジトリの依存ではない）
  const { globSync } = await import('node:fs')
  const hits = globSync(join(process.env.HOME, '.npm/_npx/*/node_modules/playwright/index.mjs'))
  if (!hits.length) {
    console.error('playwright が見つかりません。`npx playwright install chromium` を先に実行してください。')
    process.exit(1)
  }
  ;({ chromium } = await import(hits[0]))
}
void require

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,          // Retina。文字の潰れた図は読めない
})
await page.goto(URL_SAMPLE, { waitUntil: 'networkidle' })

const shot = async (name, selector) => {
  const el = await page.$(selector)
  if (!el) { console.error(`  ✗ ${name} — ${selector} が出ていない`); return false }
  await el.screenshot({ path: join(OUT, `${name}.png`) })
  console.log(`  ✓ ${name}.png`)
  return true
}

/**
 * 複数要素をまとめて 1 枚に収める。
 * ⚠ サブパネルは position:absolute で親の外へはみ出すものがあり、要素単位の
 *   スクリーンショットだと切り落とされる（メニューだけ写って中身が無い絵になる）。
 */
const shotUnion = async (name, selectors, pad = 6) => {
  const box = await page.evaluate(({ sels, pad }) => {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        const q = el.getBoundingClientRect()
        if (!q.width || !q.height) continue
        l = Math.min(l, q.left); t = Math.min(t, q.top)
        r = Math.max(r, q.right); b = Math.max(b, q.bottom)
      }
    }
    if (l === Infinity) return null
    return { x: Math.max(0, l - pad), y: Math.max(0, t - pad),
             width: r - l + pad * 2, height: b - t + pad * 2 }
  }, { sels: selectors, pad })
  if (!box) { console.error(`  ✗ ${name} — 対象が出ていない`); return false }
  await page.screenshot({ path: join(OUT, `${name}.png`), clip: box })
  console.log(`  ✓ ${name}.png`)
  return true
}

/** 本文を入れ替える */
const setBody = (html) => page.evaluate((h) => {
  const ed = window._kuroEditor
  ed.setContent(h)
  ed.wysiwyg.focus()
}, html)

/** 実マウスで範囲選択する（synthetic な selectionchange では popm が出ない） */
async function selectText(selector) {
  const box = await (await page.$(selector)).boundingBox()
  await page.mouse.move(box.x + 4, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

// ── 1. 文字選択のポップアップ（popm）と、そのサブパネル ────────────────────
await setBody('<p id="t">ここを選択すると書式メニューが出ます</p>')
await selectText('#t')
await shot('popm', '.kuro-popm')

// ⚠ リストのパネルは【リストの中にいるとき】だけ全部のボタンが出る（記号の色 ●・
//   開始番号は、対象のリストが無ければ指定しようが無いので隠れる）。
//   マニュアルには「本当の姿」を載せたいので、リストを仕込んでから開く。
for (const [name, title, seed] of [
  ['popm-color',   '文字色',           '<p id="t">ここを選択すると書式メニューが出ます</p>'],
  ['popm-size',    'フォントサイズ',   '<p id="t">ここを選択すると書式メニューが出ます</p>'],
  ['popm-ul',      '箇条書きリスト',   '<ul class="kuro-ul-disc"><li id="t">記号を選べます</li></ul>'],
  ['popm-ol',      '番号付きリスト',   '<ol class="kuro-list-decimal"><li id="t">番号を選べます</li></ol>'],
  ['popm-callout', 'コールアウト',     '<p id="t">ここを選択すると書式メニューが出ます</p>'],
  ['popm-ruby',    'ルビ',             '<p id="t">石動雷十太</p>'],
]) {
  // ⚠ 直前の操作で選択が外れると popm ごと消えるので、毎回入れ直す
  await setBody(seed)
  await selectText('#t')
  const btn = await page.$(`.kuro-popm__btn[title^="${title}"]`)
  if (!btn) { console.error(`  ✗ ${name} — 「${title}」のボタンが無い`); continue }
  await btn.click()
  await page.waitForTimeout(300)
  const open = await page.evaluate(() => !!document.querySelector(
    '.kuro-popm__sizes--visible, .kuro-popm__colors--visible'))
  if (!open) { console.error(`  ✗ ${name} — サブパネルが開かなかった`); continue }
  await shotUnion(name, ['.kuro-popm', '.kuro-popm__sizes--visible',
                         '.kuro-popm__colors--visible', '.kuro-marker-color-section--visible'])
}

// ── 2. テーブルメニュー ───────────────────────────────────────────────────
await setBody('<table><tbody><tr><td id="c1">A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table><p>後ろの段落</p>')
await page.click('#c1')
await page.waitForTimeout(400)
await shot('table-menu', '.kuro-table-menu')

// ── 3. イメージメニュー（メディア選択時）──────────────────────────────────
// ⚠ data-kuro-media が無いとイメージメニューは空箱で開く（中身が出ない）
await setBody('<p><span class="kuro-media-wrap kuro-media-wrap--center" data-kuro-media="img" style="width:60%">' +
  '<img id="im" src="data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">' +
    '<rect width="320" height="180" fill="#e0e7ff"/><text x="160" y="100" font-size="18" ' +
    'fill="#6366f1" text-anchor="middle" font-family="sans-serif">画像</text></svg>') +
  '" alt=""></span></p>')
await page.click('#im')
await page.waitForTimeout(400)
await shot('image-menu', '.kuro-image-menu')

// ── 4. リンク編集ポップアップ ─────────────────────────────────────────────
await setBody('<p>参考: <a id="lk" href="https://example.com" data-kuro-wiki="https://example.com">サンプルのリンク</a> です</p>')
await page.click('#lk')
await page.waitForTimeout(400)
await shot('link-edit', '.kuro-link-edit')

// ── 5. 角丸ボックスの BOX設定 ─────────────────────────────────────────────
await setBody('<div class="kuro-roundbox"><p id="rb">角丸ボックスの中</p></div>')
await page.click('#rb')
await page.waitForTimeout(400)
await shot('roundbox-menu', '.kuro-roundbox-menu, .kuro-kmenu')

// ── 6. コードブロック（編集画面の見た目 — 行番号 gutter 付き）────────────
// ⚠ 公開ページの <pre><code> には行番号が無い。gutter はエディタ側の chrome
//   なので、マニュアルでは「編集画面での見え方」として写真で見せる。
await setBody('<p>コードの例</p>')
const codeBtn = await page.$('.kuro-tabs__action[data-action="code"]')
if (codeBtn) {
  await page.click('p')
  await codeBtn.click()
  await page.waitForTimeout(400)
  const ta = await page.$('.kuro-code__area, .kuro-code-wrap textarea')
  if (ta) {
    await ta.click()
    await ta.fill('function hello(name) {\n  return `こんにちは、${name}`\n}\n\nhello(\'黒兎\')')
    await page.waitForTimeout(300)
    await page.evaluate(() => document.activeElement.blur())
    await page.waitForTimeout(200)
  }
  await shot('code-block', '.kuro-code-wrap')
}

// ── 6. 絵文字ピッカー ─────────────────────────────────────────────────────
await setBody('<p id="e">絵文字</p>')
await page.click('#e')
const emojiBtn = await page.$('.kuro-tabs__action[data-action="emoji"]')
if (emojiBtn) {
  await emojiBtn.click()
  await page.waitForTimeout(400)
  await shot('emoji', '.kuro-emoji-panel, .kuro-emoji')
}

await browser.close()
console.log('done →', OUT)
