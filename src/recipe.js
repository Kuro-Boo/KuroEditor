/**
 * RecipeCard — レシピの構造化データを持つ原子的ブロック。
 *
 * 仕様の正本は KuroCMS 側の「レシピ専用タイプの追加の仕様」(2026-07-30)。
 * このモジュールは **DOM に触らない純関数だけ・外部依存ゼロ**（`blocks.js` と
 * 同じ流儀）。ブラウザ・Worker・テストのどこからでも同じ実装が動き、KuroCMS の
 * サーバー側検証も同じ形を参照できる。
 *
 * ## 保存形式（仕様 §4）
 * ```html
 * <div data-kuro-block="recipe-card" data-recipe-version="1"
 *      data-recipe="<encodeURIComponent した JSON>" contenteditable="false">
 *   … JSON から作った編集画面用プレビュー（直接編集しない） …
 * </div>
 * ```
 *
 * ⚠ **`data-recipe` が正本**。プレビュー HTML は毎回そこから再生成する。
 *   ユーザー入力をプレビューへ直接連結しない（必ず `_escapeHtml` を通す）。
 * ⚠ 属性値のエンコードは `encodeURIComponent(JSON.stringify(...))`。
 *   `data-kuro-wiki` と同じ流儀で、引用符・山括弧・改行が属性の外へ出ない＝
 *   ユーザーが HTML を直接編集してもデータの一部だけを壊せない。
 * ⚠ `totalTime` は保存しない（`prep + cook` から導出する。二重保持は矛盾の元）。
 */

/**
 * 属性・本文へ入れる前のエスケープ。kuro-links.js にも同等品があるが、この
 * モジュールは **外部依存ゼロ**（Worker へ 1 ファイルで持ち込める）を保つため
 * あえて持たない — 5 行の重複より依存の無さを取る。
 */
function _escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 保存データのスキーマ版。破壊的変更のときだけ上げる。 */
export const RECIPE_VERSION = 1

/** ブロックの識別子（`data-kuro-block` の値）。KuroCMS 側と一致させること。 */
export const RECIPE_BLOCK = 'recipe-card'

/** DOM/HTML から RecipeCard を見つけるためのセレクタ。 */
export const RECIPE_CARD_SEL = `div[data-kuro-block="${RECIPE_BLOCK}"]`

/**
 * カードの表示レイアウト（本文中での見せ方）。
 * ⚠ これは **レシピの内容ではない**ので `data-recipe`(正本 JSON) には入れない。
 *   Schema.org へ出すのは材料・時間・手順であって、幅や回り込みではないため。
 *   角丸ボックスと同じ `data-width` / `data-align` + インライン style で持たせ、
 *   公開ページでは JS 無しでそのまま再現できるようにする。
 */
export const RECIPE_WIDTHS = ['25%', '30%', '50%', '60%', '75%', '100%']
export const RECIPE_ALIGNS = ['left', 'center', 'right']
export const RECIPE_LAYOUT_DEFAULT = { width: '100%', align: 'center' }

/** 受け取ったレイアウトを既知の値へ丸める（不正値は既定へ）。 */
export function normalizeRecipeLayout(layout) {
  const w = String(layout?.width ?? '').trim()
  const a = String(layout?.align ?? '').trim()
  return {
    width: RECIPE_WIDTHS.includes(w) ? w : RECIPE_LAYOUT_DEFAULT.width,
    align: RECIPE_ALIGNS.includes(a) ? a : RECIPE_LAYOUT_DEFAULT.align,
  }
}

/**
 * インライン style 文字列。左右寄せは **画像・角丸ボックスと同じ float** で、
 * 周囲の本文が回り込む。中央は float せず margin auto。
 */
export function recipeLayoutStyle(layout) {
  const { width, align } = normalizeRecipeLayout(layout)
  if (align === 'left')  return `width:${width};float:left;margin:0 1em 1em 0`
  if (align === 'right') return `width:${width};float:right;margin:0 0 1em 1em`
  return `width:${width};display:block;margin:0 auto`
}

/** 仕様 §4「必須フィールド」の制約値。検証もプレビューもここだけを見る。 */
export const RECIPE_LIMITS = {
  yieldMax: 80,
  timeMax: 1440,          // 分（24 時間）
  ingredientsMax: 100,
  instructionsMax: 50,
  instructionTextMax: 1000,
}

/** 空文字・非文字列を潰して trim した文字列にする。 */
function str(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
}

/**
 * 分（整数）へ寄せる。空・非数値・負値は null（＝未入力）。
 * 上限を超える値はここでは切らない（検証側がエラーとして見せる）。
 */
function minutes(v) {
  if (v === '' || v == null) return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i < 0 ? null : i
}

/**
 * 入力（フォーム/属性/外部データ）を保存する形へ正規化する。
 * - 空行は落とす（材料は名称が空、手順は本文が空の行）
 * - 未入力の時間はキーごと落とす（`null` を保存しない）
 * - 表示順は配列順のまま保つ
 *
 * @param {object} raw
 * @returns {{version:number, yield:string, prepTimeMinutes?:number,
 *            cookTimeMinutes?:number,
 *            ingredients:{name:string, amount?:string}[],
 *            instructions:{text:string}[]}}
 */
export function normalizeRecipe(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {
    version: RECIPE_VERSION,
    yield: str(src.yield),
    ingredients: [],
    instructions: [],
  }
  const prep = minutes(src.prepTimeMinutes)
  const cook = minutes(src.cookTimeMinutes)
  if (prep !== null) out.prepTimeMinutes = prep
  if (cook !== null) out.cookTimeMinutes = cook

  for (const row of Array.isArray(src.ingredients) ? src.ingredients : []) {
    const name = str(row?.name)
    if (!name) continue                       // 名称の無い行は存在しないのと同じ
    const amount = str(row?.amount)
    out.ingredients.push(amount ? { name, amount } : { name })
  }
  for (const row of Array.isArray(src.instructions) ? src.instructions : []) {
    const text = str(row?.text)
    if (!text) continue
    out.instructions.push({ text })
  }
  return out
}

/** 誤りの文(日本語)。エディタは画面の辞書の recipeErr.<鍵> で引き直す(#spec-i18n)。 */
const RECIPE_ERRORS = {
  unreadable: 'レシピの内容が読み取れません。',
  yield: '人数を入力してください。',
  yieldMax: '人数は {n} 文字以内で入力してください。',
  prepTime: '下準備時間は 0〜{n} 分の整数で入力してください。',
  cookTime: '調理時間は 0〜{n} 分の整数で入力してください。',
  timeRequired: '下準備時間か調理時間のどちらかを入力してください。',
  ingredients: '材料を 1 行以上入力してください。',
  ingredientsMax: '材料は {n} 行までです。',
  instructions: '手順を 1 行以上入力してください。',
  instructionsMax: '手順は {n} 行までです。',
  instructionTextMax: '手順は 1 行 {n} 文字以内で入力してください。',
}

/**
 * 保存してよい形かを検査する（仕様 §10「KuroEditorモーダル保存」）。
 * **正規化済みの値**を渡すこと（空行落としは normalizeRecipe の役目）。
 * @param {object} r
 * @param {(key: string, vars?: object) => string} [tr] 文を作る関数(省くと日本語)
 * @returns {string[]} 人が読めるエラー文の配列（空なら OK）
 */
export function validateRecipe(r, tr) {
  const errors = []
  const L = RECIPE_LIMITS
  const msg = (key, vars) => tr ? tr(key, vars) : RECIPE_ERRORS[key].replace(/\{(\w+)\}/g, (m, k) => String(vars?.[k] ?? m))
  const e = (key, vars) => errors.push(msg(key, vars))
  if (!r || typeof r !== 'object') return [msg('unreadable')]

  if (!r.yield) e('yield')
  else if (r.yield.length > L.yieldMax) e('yieldMax', { n: L.yieldMax })

  const prep = r.prepTimeMinutes
  const cook = r.cookTimeMinutes
  for (const [key, v] of [['prepTime', prep], ['cookTime', cook]]) {
    if (v === undefined) continue
    if (!Number.isInteger(v) || v < 0 || v > L.timeMax) e(key, { n: L.timeMax })
  }
  // 仕様 §4: 下準備・調理のいずれかは必須（両方任意だが両方空は不可）
  if (prep === undefined && cook === undefined) e('timeRequired')

  const ing = Array.isArray(r.ingredients) ? r.ingredients : []
  if (ing.length < 1) e('ingredients')
  else if (ing.length > L.ingredientsMax) e('ingredientsMax', { n: L.ingredientsMax })

  const ins = Array.isArray(r.instructions) ? r.instructions : []
  if (ins.length < 1) e('instructions')
  else if (ins.length > L.instructionsMax) e('instructionsMax', { n: L.instructionsMax })
  if (ins.some((x) => (x?.text ?? '').length > L.instructionTextMax)) e('instructionTextMax', { n: L.instructionTextMax })
  return errors
}

/** 下準備 + 調理（どちらも未入力なら null）。保存はせず、表示のたびに導出する。 */
export function totalMinutes(r) {
  const p = r?.prepTimeMinutes
  const c = r?.cookTimeMinutes
  if (p === undefined && c === undefined) return null
  return (p ?? 0) + (c ?? 0)
}

/** 属性へ入れる形（`data-recipe`）。 */
export function encodeRecipe(r) {
  return encodeURIComponent(JSON.stringify(r))
}

/**
 * `data-recipe` を読み戻す。壊れていれば null（呼び手は「レシピとして扱わない」）。
 * ⚠ 復号できても中身は信用しない — 必ず normalizeRecipe を通してから使う。
 */
export function decodeRecipe(attr) {
  if (typeof attr !== 'string' || !attr) return null
  try {
    const obj = JSON.parse(decodeURIComponent(attr))
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null
  } catch {
    return null
  }
}

/**
 * 本文の言語(仕様 #spec-i18n): Entamy の 11 言語。カードの見出し(公開ページにも出る)は本文の言語で選ぶ。
 * 空は日本語(今までの本文)、11 言語に無いものは英語。
 */
export function recipeLang(lang) {
  const v = typeof lang === 'string' ? lang.trim().toLowerCase() : ''
  if (!v) return 'ja'
  const base = v.split(/[-_]/)[0]
  return base in RECIPE_TEXT ? base : 'en'
}

/** カードの見出しと時間の書き方。{t} は時間、{h}・{m} は時・分。 */
const RECIPE_TEXT = {
  ja: { card: 'レシピカード', badge: 'レシピ', yield: '人数', ingredients: '材料', steps: '手順', prep: '下準備 {t}', cook: '調理 {t}', total: '合計 {t}', hm: '{h} 時間 {m} 分', h: '{h} 時間', m: '{m} 分' },
  en: { card: 'Recipe card', badge: 'Recipe', yield: 'Servings', ingredients: 'Ingredients', steps: 'Steps', prep: 'Prep {t}', cook: 'Cook {t}', total: 'Total {t}', hm: '{h} hr {m} min', h: '{h} hr', m: '{m} min' },
  fr: { card: 'Fiche recette', badge: 'Recette', yield: 'Portions', ingredients: 'Ingrédients', steps: 'Étapes', prep: 'Préparation {t}', cook: 'Cuisson {t}', total: 'Total {t}', hm: '{h} h {m} min', h: '{h} h', m: '{m} min' },
  it: { card: 'Scheda ricetta', badge: 'Ricetta', yield: 'Porzioni', ingredients: 'Ingredienti', steps: 'Passaggi', prep: 'Preparazione {t}', cook: 'Cottura {t}', total: 'Totale {t}', hm: '{h} h {m} min', h: '{h} h', m: '{m} min' },
  es: { card: 'Tarjeta de receta', badge: 'Receta', yield: 'Raciones', ingredients: 'Ingredientes', steps: 'Pasos', prep: 'Preparación {t}', cook: 'Cocción {t}', total: 'Total {t}', hm: '{h} h {m} min', h: '{h} h', m: '{m} min' },
  zh: { card: '食谱卡片', badge: '食谱', yield: '份量', ingredients: '食材', steps: '步骤', prep: '准备 {t}', cook: '烹饪 {t}', total: '合计 {t}', hm: '{h} 小时 {m} 分钟', h: '{h} 小时', m: '{m} 分钟' },
  ko: { card: '레시피 카드', badge: '레시피', yield: '인분', ingredients: '재료', steps: '순서', prep: '밑준비 {t}', cook: '조리 {t}', total: '합계 {t}', hm: '{h}시간 {m}분', h: '{h}시간', m: '{m}분' },
  uk: { card: 'Картка рецепта', badge: 'Рецепт', yield: 'Порції', ingredients: 'Інгредієнти', steps: 'Кроки', prep: 'Підготовка {t}', cook: 'Приготування {t}', total: 'Разом {t}', hm: '{h} год {m} хв', h: '{h} год', m: '{m} хв' },
  de: { card: 'Rezeptkarte', badge: 'Rezept', yield: 'Portionen', ingredients: 'Zutaten', steps: 'Schritte', prep: 'Vorbereitung {t}', cook: 'Garzeit {t}', total: 'Gesamt {t}', hm: '{h} Std. {m} Min.', h: '{h} Std.', m: '{m} Min.' },
  pt: { card: 'Cartão de receita', badge: 'Receita', yield: 'Porções', ingredients: 'Ingredientes', steps: 'Passos', prep: 'Preparo {t}', cook: 'Cozimento {t}', total: 'Total {t}', hm: '{h} h {m} min', h: '{h} h', m: '{m} min' },
  ar: { card: 'بطاقة وصفة', badge: 'وصفة', yield: 'عدد الحصص', ingredients: 'المكوّنات', steps: 'الخطوات', prep: 'التحضير {t}', cook: 'الطهي {t}', total: 'المجموع {t}', hm: '{h} س {m} د', h: '{h} س', m: '{m} د' },
}

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] === undefined ? m : String(v[k])))

/** カードの aria-label(本文の言語)。 */
export function recipeCardLabel(lang) {
  return RECIPE_TEXT[recipeLang(lang)].card
}

/** 「10 分」「1 時間 5 分」(lang = 本文の言語)。0 分は「0 分」ではなく空（呼び手が行ごと出さない）。 */
export function formatMinutes(m, lang) {
  if (!Number.isFinite(m) || m <= 0) return ''
  const T = RECIPE_TEXT[recipeLang(lang)]
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h && r) return fill(T.hm, { h, m: r })
  if (h) return fill(T.h, { h })
  return fill(T.m, { m: r })
}

/**
 * 編集画面用プレビューの内側 HTML。**JSON からのみ**組み立てる。
 * 公開ページ側の整形はテンプレートの仕事（仕様 §8）なので、ここは
 * 「入力内容がそのまま読める」ことだけを目的にした素直な表にする。
 */
export function renderRecipePreview(r, opt = {}) {
  const lang = recipeLang(opt.lang)
  const T = RECIPE_TEXT[lang]
  const time = []
  if (r.prepTimeMinutes) time.push(fill(T.prep, { t: formatMinutes(r.prepTimeMinutes, lang) }))
  if (r.cookTimeMinutes) time.push(fill(T.cook, { t: formatMinutes(r.cookTimeMinutes, lang) }))
  const total = totalMinutes(r)
  if (total && time.length === 2) time.push(fill(T.total, { t: formatMinutes(total, lang) }))

  // 「2」とだけ書かれても何の数字か分かるようにラベルを添える
  // （時間側が「下準備 10 分」と読めるのと同じ扱い）
  const meta = [
    `<span class="kuro-recipe__yield">` +
      `<span class="kuro-recipe__k">${_escapeHtml(T.yield)}</span>${_escapeHtml(r.yield)}` +
    `</span>`,
  ]
  if (time.length) {
    meta.push(`<span class="kuro-recipe__time">${_escapeHtml(time.join(' / '))}</span>`)
  }

  const ing = r.ingredients.map((i) =>
    `<li><span class="kuro-recipe__ing-name">${_escapeHtml(i.name)}</span>` +
    (i.amount ? `<span class="kuro-recipe__ing-amount">${_escapeHtml(i.amount)}</span>` : '') +
    `</li>`).join('')
  const ins = r.instructions.map((s) => `<li>${_escapeHtml(s.text)}</li>`).join('')

  return `<div class="kuro-recipe__head">` +
      `<span class="kuro-recipe__label">${_escapeHtml(T.badge)}</span>` +
      `<span class="kuro-recipe__meta">${meta.join('')}</span>` +
    `</div>` +
    `<div class="kuro-recipe__body">` +
      `<div class="kuro-recipe__col">` +
        `<h4 class="kuro-recipe__h">${_escapeHtml(T.ingredients)}</h4><ul class="kuro-recipe__ings">${ing}</ul>` +
      `</div>` +
      `<div class="kuro-recipe__col">` +
        `<h4 class="kuro-recipe__h">${_escapeHtml(T.steps)}</h4><ol class="kuro-recipe__steps">${ins}</ol>` +
      `</div>` +
    `</div>`
}

/**
 * RecipeCard ブロック 1 個ぶんの HTML（仕様 §4 の保存形式）。
 * @param {object} r 正規化済みレシピ
 * @param {{width?:string, align?:string}} [layout] 表示レイアウト（既定 100% / center）
 * @param {{lang?: string}} [opt] lang = 本文の言語(見出しの言葉)
 */
export function buildRecipeCardHtml(r, layout = RECIPE_LAYOUT_DEFAULT, opt = {}) {
  const l = normalizeRecipeLayout(layout)
  return `<div data-kuro-block="${RECIPE_BLOCK}"` +
    ` data-recipe-version="${RECIPE_VERSION}"` +
    ` data-recipe="${encodeRecipe(r)}"` +
    ` data-width="${l.width}" data-align="${l.align}"` +
    ` style="${recipeLayoutStyle(l)}"` +
    ` contenteditable="false" role="group" aria-label="${RECIPE_TEXT[recipeLang(opt.lang)].card}">` +
    renderRecipePreview(r, opt) +
    `</div>`
}

/** 空のフォーム初期値（新規挿入時）。1 行ずつ空行を置いて入力を始めやすくする。 */
export function emptyRecipe() {
  return {
    version: RECIPE_VERSION,
    yield: '',
    prepTimeMinutes: undefined,
    cookTimeMinutes: undefined,
    ingredients: [{ name: '', amount: '' }],
    instructions: [{ text: '' }],
  }
}
