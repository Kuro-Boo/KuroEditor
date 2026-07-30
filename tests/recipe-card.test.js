/**
 * RecipeCard — エディタ組み込み側のテスト（recipeUi オプション / 挿入 / 編集 /
 * 保存往復）。happy-dom。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KuroEditor, RECIPE_CARD_SEL, buildRecipeCardHtml, decodeRecipe, normalizeRecipe } from '../src/editor.js'

function makeMount() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

const RECIPE = {
  yield: '2人分',
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  ingredients: [{ name: '生しいたけ', amount: '6枚' }],
  instructions: [{ text: 'フライパンで両面を焼く。' }],
}
const cardHtml = (r = RECIPE) => buildRecipeCardHtml(normalizeRecipe(r))

beforeEach(() => { document.body.innerHTML = '' })

describe('recipeUi オプション', () => {
  it('既定 (false) では鍋ボタンもモーダルも作らない', () => {
    const ed = new KuroEditor(makeMount())
    expect(ed._tabActionBtns.recipe).toBeUndefined()
    expect(ed._mmenuBtns.recipe).toBeUndefined()
    expect(ed.recipeDialog).toBeNull()
    expect(document.querySelector('.kuro-recipe-dialog')).toBeNull()
  })

  it('true でタブバー / mmenu の【リンクの右】に鍋ボタンが出る', () => {
    const ed = new KuroEditor(makeMount(), { recipeUi: true })
    expect(ed._tabActionBtns.recipe).toBeDefined()
    expect(ed._mmenuBtns.recipe).toBeDefined()
    // 並び順: … link → recipe（リンクの直後）
    const ids = [...ed._tabActionBtns.link.parentElement.children]
      .map((b) => b.getAttribute('data-action')).filter(Boolean)
    expect(ids[ids.indexOf('link') + 1]).toBe('recipe')
  })

  it('recipeUi: false では API 経由でもモーダルが開かない', () => {
    const ed = new KuroEditor(makeMount())
    ed._handleMMenu('recipe')
    expect(document.querySelector('.kuro-recipe-dialog--visible')).toBeNull()
  })
})

describe('挿入と編集', () => {
  let ed
  beforeEach(() => { ed = new KuroEditor(makeMount(), { recipeUi: true, initialContent: '<p>本文</p>' }) })

  const fill = (r = RECIPE) => {
    const d = ed.recipeDialog
    d._yieldInput.value = r.yield
    d._prepInput.value = String(r.prepTimeMinutes ?? '')
    d._cookInput.value = String(r.cookTimeMinutes ?? '')
    d._ingList.textContent = ''
    d._insList.textContent = ''
    for (const i of r.ingredients) d._addIngredient(i.name, i.amount ?? '')
    for (const s of r.instructions) d._addInstruction(s.text)
  }

  it('鍋ボタン → モーダル → 保存で本文にカードが入る', () => {
    ed._tabActionBtns.recipe.click()
    expect(ed.recipeDialog.isVisible).toBe(true)

    fill()
    ed.recipeDialog._saveBtn.click()

    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    expect(card).not.toBeNull()
    expect(card.getAttribute('contenteditable')).toBe('false')
    expect(decodeRecipe(card.getAttribute('data-recipe'))).toEqual(normalizeRecipe(RECIPE))
    expect(ed.recipeDialog.isVisible).toBe(false)
    expect(ed.isDirty()).toBe(true)              // 挿入はユーザーの編集
  })

  it('入力が足りないときは保存せずモーダルに留まる', () => {
    ed._tabActionBtns.recipe.click()
    fill({ ...RECIPE, yield: '', ingredients: [], instructions: [] })
    ed.recipeDialog._saveBtn.click()

    expect(ed.recipeDialog.isVisible).toBe(true)
    expect(ed.recipeDialog._errors.hidden).toBe(false)
    expect(ed.recipeDialog._errors.textContent).toContain('人数')
    expect(ed.wysiwyg.querySelector(RECIPE_CARD_SEL)).toBeNull()
  })

  it('カードが既にあれば鍋ボタンは【編集】になり 2 個目を作らない', () => {
    ed.setContent(`<p>本文</p>${cardHtml()}`)
    ed._tabActionBtns.recipe.click()
    // 既存の内容がフォームに載っている
    expect(ed.recipeDialog._yieldInput.value).toBe('2人分')

    ed.recipeDialog._yieldInput.value = '4人分'
    ed.recipeDialog._saveBtn.click()

    const cards = ed.wysiwyg.querySelectorAll(RECIPE_CARD_SEL)
    expect(cards.length).toBe(1)
    expect(decodeRecipe(cards[0].getAttribute('data-recipe')).yield).toBe('4人分')
  })

  it('ダブルクリックでも開いたまま（実ブラウザは dblclick の前に click が来る）', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    card.dispatchEvent(new Event('click', { bubbles: true }))
    card.dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(ed.recipeDialog.isVisible).toBe(true)
    expect(ed.recipeDialog._yieldInput.value).toBe('2人分')
  })

  it('カードをクリックすると編集モーダルが開く', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    card.dispatchEvent(new Event('click', { bubbles: true }))
    expect(ed.recipeDialog.isVisible).toBe(true)
    expect(ed.recipeDialog._yieldInput.value).toBe('2人分')
  })

  it('右上に 🗑 が出て、押すとカードごと消える（モーダルは開かない）', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    const del = card.querySelector('.kuro-recipe__del')
    expect(del).not.toBeNull()

    del.dispatchEvent(new Event('click', { bubbles: true }))
    expect(ed.wysiwyg.querySelector(RECIPE_CARD_SEL)).toBeNull()
    expect(ed.recipeDialog.isVisible).toBe(false)   // 削除ボタンでは編集を開かない
    expect(ed.isDirty()).toBe(true)                 // undo で戻せる編集として載る
  })

  it('🗑 の左にサイズ選択と寄せ 3 種が並ぶ', () => {
    ed.setContent(cardHtml())
    const chrome = ed.wysiwyg.querySelector('.kuro-recipe__chrome')
    expect(chrome).not.toBeNull()
    const kinds = [...chrome.children].map((c) => c.className)
    expect(kinds[0]).toContain('kuro-recipe__size')          // 表示サイズ
    expect(kinds.filter((c) => c.includes('kuro-recipe__align')).length).toBe(3)
    expect(kinds[kinds.length - 1]).toContain('kuro-recipe__del')   // 🗑 は右端
    expect([...chrome.querySelector('.kuro-recipe__size').options].map((o) => o.value))
      .toEqual(['25%', '50%', '75%', '100%'])
  })

  it('サイズ / 寄せを変えると data-* と style が変わる（回り込みは float）', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    const sel = card.querySelector('.kuro-recipe__size')
    sel.value = '50%'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    card.querySelector('.kuro-recipe__align[data-align="left"]')
      .dispatchEvent(new Event('click', { bubbles: true }))

    expect(card.dataset.width).toBe('50%')
    expect(card.dataset.align).toBe('left')
    expect(card.getAttribute('style')).toBe('width:50%;float:left;margin:0 1em 1em 0')
    expect(card.querySelector('.kuro-recipe__align[data-align="left"]').className)
      .toContain('--active')
    expect(ed.isDirty()).toBe(true)
    expect(ed.recipeDialog.isVisible).toBe(false)   // 設定操作で編集モーダルは開かない
  })

  it('レイアウトは保存 HTML に残り、内容を編集しても失われない', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    card.querySelector('.kuro-recipe__align[data-align="right"]')
      .dispatchEvent(new Event('click', { bubbles: true }))
    expect(ed.getContent()).toContain('data-align="right"')

    // 内容の編集（モーダル保存）でレイアウトが既定へ戻らない
    ed._tabActionBtns.recipe.click()
    ed.recipeDialog._yieldInput.value = '4人分'
    ed.recipeDialog._saveBtn.click()
    const after = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    expect(after.dataset.align).toBe('right')
    expect(after.getAttribute('style')).toContain('float:right')
  })

  it('🗑（編集用 chrome）は保存 HTML に出ない', () => {
    ed.setContent(cardHtml())
    expect(ed.wysiwyg.querySelector('.kuro-recipe__del')).not.toBeNull()  // 画面には出る
    expect(ed.getContent()).not.toContain('kuro-recipe__del')             // 保存には出ない
    expect(ed.getContent()).not.toContain('kuro-recipe__chrome')
    expect(ed.getContent()).toContain('data-kuro-block="recipe-card"')
  })

  it('保存時にプレビューは正本(data-recipe)から作り直される', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    // 本文側が何かの拍子に壊れても、保存内容は正本から復元される
    card.innerHTML = '<p>荒らされたプレビュー</p>'
    const out = ed.getContent()
    expect(out).not.toContain('荒らされた')
    expect(out).toContain('生しいたけ')
  })

  it('更新しても data-bid は引き継ぐ（同じブロックの同一性）', () => {
    const ed2 = new KuroEditor(makeMount(), { recipeUi: true, blockIds: true })
    ed2.setContent(cardHtml())
    const before = ed2.wysiwyg.querySelector(RECIPE_CARD_SEL).getAttribute('data-bid')
    expect(before).toBeTruthy()

    ed2._tabActionBtns.recipe.click()
    ed2.recipeDialog._yieldInput.value = '4人分'
    ed2.recipeDialog._saveBtn.click()

    expect(ed2.wysiwyg.querySelector(RECIPE_CARD_SEL).getAttribute('data-bid')).toBe(before)
  })

  it('閲覧モードへ切り替えるとモーダルは閉じる', () => {
    ed._tabActionBtns.recipe.click()
    expect(ed.recipeDialog.isVisible).toBe(true)
    ed.setMode('view')
    expect(ed.recipeDialog.isVisible).toBe(false)
  })
})

describe('保存往復（getContent / getBuildImage）', () => {
  it('getContent がカードを丸ごと保つ（属性が消えない）', () => {
    const ed = new KuroEditor(makeMount(), { recipeUi: true })
    ed.setContent(`<p>まえがき</p>${cardHtml()}<p>あとがき</p>`)
    const out = ed.getContent()

    expect(out).toContain('data-kuro-block="recipe-card"')
    expect(out).toContain('contenteditable="false"')
    const attr = /data-recipe="([^"]+)"/.exec(out)[1]
    expect(decodeRecipe(attr)).toEqual(normalizeRecipe(RECIPE))
  })

  it('atomic ブロックの【包み】剥がしに巻き込まれない（回帰）', () => {
    // _unwrapAtomicBlocks は div[data-kuro-block=""]（値の無い包み）だけを剥がす。
    // 値付き（recipe-card）まで剥がすと、保存のたびにレシピが消える。
    const ed = new KuroEditor(makeMount(), { recipeUi: true })
    ed.setContent(cardHtml())
    expect(ed.getContent()).toContain('data-kuro-block="recipe-card"')
    // 2 度保存しても壊れない（冪等）
    ed.setContent(ed.getContent())
    expect(ed.getContent()).toContain('data-kuro-block="recipe-card"')
  })

  it('getBuildImage は data-bid を落としてもカードは残す', () => {
    const ed = new KuroEditor(makeMount(), { recipeUi: true, blockIds: true })
    ed.setContent(cardHtml())
    const img = ed.getBuildImage()
    expect(img).not.toContain('data-bid')
    expect(img).toContain('data-kuro-block="recipe-card"')
    expect(img).toContain('data-recipe=')
  })

  it('recipeUi: false のホストでも本文のカードは壊さず素通しする', () => {
    // 記事タイプが変わってボタンを消しても、保存済み本文は保全されるべき
    const ed = new KuroEditor(makeMount())
    ed.setContent(cardHtml())
    expect(ed.getContent()).toContain('data-kuro-block="recipe-card"')
  })
})
