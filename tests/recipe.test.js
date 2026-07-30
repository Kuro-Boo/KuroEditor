/**
 * RecipeCard — 純関数（src/recipe.js）のテスト。
 * DOM を使わないので直接叩く。仕様の正本は KuroCMS「レシピ専用タイプの追加の仕様」。
 */
import { describe, it, expect } from 'vitest'
import {
  RECIPE_BLOCK,
  RECIPE_LIMITS,
  RECIPE_VERSION,
  buildRecipeCardHtml,
  decodeRecipe,
  encodeRecipe,
  formatMinutes,
  normalizeRecipe,
  renderRecipePreview,
  totalMinutes,
  validateRecipe,
} from '../src/recipe.js'

const valid = () => ({
  yield: '2人分',
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  ingredients: [{ name: '生しいたけ', amount: '6枚' }, { name: 'バター', amount: '10g' }],
  instructions: [{ text: 'しいたけの軸を切り落とす。' }, { text: 'フライパンで両面を焼く。' }],
})

describe('normalizeRecipe', () => {
  it('仕様のサンプルをそのままの形に正規化する', () => {
    expect(normalizeRecipe(valid())).toEqual({
      version: RECIPE_VERSION,
      yield: '2人分',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      ingredients: [{ name: '生しいたけ', amount: '6枚' }, { name: 'バター', amount: '10g' }],
      instructions: [{ text: 'しいたけの軸を切り落とす。' }, { text: 'フライパンで両面を焼く。' }],
    })
  })

  it('空行は落とす（材料は名称、手順は本文が空の行）', () => {
    const r = normalizeRecipe({
      ...valid(),
      ingredients: [{ name: '', amount: '3g' }, { name: '塩', amount: '' }],
      instructions: [{ text: '  ' }, { text: '混ぜる' }],
    })
    expect(r.ingredients).toEqual([{ name: '塩' }])   // 分量が空なら amount ごと持たない
    expect(r.instructions).toEqual([{ text: '混ぜる' }])
  })

  it('未入力の時間はキーごと落とす（null を保存しない）', () => {
    const r = normalizeRecipe({ ...valid(), prepTimeMinutes: '', cookTimeMinutes: '15' })
    expect('prepTimeMinutes' in r).toBe(false)
    expect(r.cookTimeMinutes).toBe(15)               // 文字列入力も数値へ寄せる
  })

  it('前後の空白は落とし、表示順は配列順のまま', () => {
    const r = normalizeRecipe({
      ...valid(),
      yield: '  4人分 ',
      ingredients: [{ name: ' 米 ', amount: ' 2合 ' }, { name: '水' }],
    })
    expect(r.yield).toBe('4人分')
    expect(r.ingredients).toEqual([{ name: '米', amount: '2合' }, { name: '水' }])
  })

  it('壊れた入力でも例外を投げず空の形に倒す', () => {
    expect(normalizeRecipe(null)).toEqual({
      version: RECIPE_VERSION, yield: '', ingredients: [], instructions: [],
    })
    expect(normalizeRecipe({ ingredients: 'not-an-array' }).ingredients).toEqual([])
  })
})

describe('validateRecipe', () => {
  const errs = (patch) => validateRecipe(normalizeRecipe({ ...valid(), ...patch }))

  it('仕様どおりの入力はエラー無し', () => {
    expect(errs({})).toEqual([])
  })

  it('人数は必須・80 文字まで', () => {
    expect(errs({ yield: '' }).join()).toContain('人数')
    expect(errs({ yield: 'あ'.repeat(RECIPE_LIMITS.yieldMax + 1) }).join()).toContain('人数')
    expect(errs({ yield: 'あ'.repeat(RECIPE_LIMITS.yieldMax) })).toEqual([])
  })

  it('下準備・調理は【どちらか】必須（両方空は不可・片方だけは可）', () => {
    expect(errs({ prepTimeMinutes: '', cookTimeMinutes: '' }).join()).toContain('下準備時間か調理時間')
    expect(errs({ prepTimeMinutes: 5, cookTimeMinutes: '' })).toEqual([])
    expect(errs({ prepTimeMinutes: '', cookTimeMinutes: 5 })).toEqual([])
  })

  it('時間は 0〜1440 分', () => {
    expect(errs({ cookTimeMinutes: RECIPE_LIMITS.timeMax + 1 }).join()).toContain('調理時間')
    expect(errs({ cookTimeMinutes: RECIPE_LIMITS.timeMax })).toEqual([])
  })

  it('材料・手順は 1 行以上（空配列は保存させない）', () => {
    expect(errs({ ingredients: [] }).join()).toContain('材料')
    expect(errs({ instructions: [] }).join()).toContain('手順')
  })

  it('材料 100 行 / 手順 50 行 / 手順 1000 文字の上限', () => {
    const ing = (n) => Array.from({ length: n }, (_, i) => ({ name: `材料${i}` }))
    const ins = (n) => Array.from({ length: n }, (_, i) => ({ text: `手順${i}` }))
    expect(errs({ ingredients: ing(RECIPE_LIMITS.ingredientsMax) })).toEqual([])
    expect(errs({ ingredients: ing(RECIPE_LIMITS.ingredientsMax + 1) }).join()).toContain('材料')
    expect(errs({ instructions: ins(RECIPE_LIMITS.instructionsMax + 1) }).join()).toContain('手順')
    expect(errs({ instructions: [{ text: 'あ'.repeat(RECIPE_LIMITS.instructionTextMax + 1) }] }).join())
      .toContain('文字以内')
  })
})

describe('encode / decode', () => {
  it('往復して同じ値になる', () => {
    const r = normalizeRecipe(valid())
    expect(decodeRecipe(encodeRecipe(r))).toEqual(r)
  })

  it('引用符・山括弧・改行は属性の外へ出ない（HTML を壊さない）', () => {
    const r = normalizeRecipe({
      ...valid(),
      yield: '2"人分<script>',
      instructions: [{ text: "改行\nと '引用符'" }],
    })
    const attr = encodeRecipe(r)
    expect(attr).not.toMatch(/["<>\n]/)
    expect(decodeRecipe(attr)).toEqual(r)
  })

  it('壊れた属性は null（レシピとして扱わない）', () => {
    expect(decodeRecipe('')).toBeNull()
    expect(decodeRecipe('%%%')).toBeNull()
    expect(decodeRecipe(encodeURIComponent('[1,2]'))).toBeNull()   // 配列は object でない
    expect(decodeRecipe(null)).toBeNull()
  })
})

describe('totalMinutes / formatMinutes', () => {
  it('合計は prep + cook から導出（保存しない）', () => {
    expect(totalMinutes({ prepTimeMinutes: 10, cookTimeMinutes: 15 })).toBe(25)
    expect(totalMinutes({ cookTimeMinutes: 15 })).toBe(15)
    expect(totalMinutes({})).toBeNull()
  })

  it('60 分以上は時間へ繰り上げる', () => {
    expect(formatMinutes(15)).toBe('15 分')
    expect(formatMinutes(60)).toBe('1 時間')
    expect(formatMinutes(65)).toBe('1 時間 5 分')
    expect(formatMinutes(0)).toBe('')
  })
})

describe('buildRecipeCardHtml', () => {
  const html = () => buildRecipeCardHtml(normalizeRecipe(valid()))

  it('仕様 §4 の保存形式（識別子・版・正本・contenteditable=false）', () => {
    const h = html()
    expect(h).toContain(`data-kuro-block="${RECIPE_BLOCK}"`)
    expect(h).toContain(`data-recipe-version="${RECIPE_VERSION}"`)
    expect(h).toContain('contenteditable="false"')
    expect(h).toMatch(/data-recipe="[^"]+"/)
  })

  it('data-recipe から元のレシピを復元できる（プレビューは従属物）', () => {
    const attr = /data-recipe="([^"]+)"/.exec(html())[1]
    expect(decodeRecipe(attr)).toEqual(normalizeRecipe(valid()))
  })

  it('プレビューに材料・手順・時間が出る', () => {
    const h = html()
    expect(h).toContain('生しいたけ')
    expect(h).toContain('6枚')
    expect(h).toContain('フライパンで両面を焼く。')
    expect(h).toContain('下準備 10 分')
    expect(h).toContain('合計 25 分')
  })

  it('ユーザー入力はエスケープされる（プレビューへ直接連結しない）', () => {
    const h = buildRecipeCardHtml(normalizeRecipe({
      ...valid(),
      ingredients: [{ name: '<img src=x onerror=alert(1)>', amount: '"&"' }],
    }))
    expect(h).not.toContain('<img src=x')
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('プレビューは data-recipe から毎回同じものが再生成される（冪等）', () => {
    const r = normalizeRecipe(valid())
    expect(renderRecipePreview(r)).toBe(renderRecipePreview(decodeRecipe(encodeRecipe(r))))
  })
})
