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

  it('保存 HTML に編集用の痕跡が混ざらない', () => {
    ed.setContent(cardHtml())
    const out = ed.getContent()
    expect(out).not.toContain('<button')
    expect(out).not.toContain('<select')
    expect(out).toContain('data-kuro-block="recipe-card"')
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

  it('カードの上にはボタンを一切置かない（WYSIWYG＝公開ページと同じ見た目）', () => {
    ed.setContent(cardHtml())
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    expect(card.querySelector('button')).toBeNull()
    expect(card.querySelector('select')).toBeNull()
  })

  it('モーダルのタイトル行にサイズ選択・寄せ 3 種・削除がある', () => {
    ed.setContent(cardHtml())
    ed.wysiwyg.querySelector(RECIPE_CARD_SEL).dispatchEvent(new Event('click', { bubbles: true }))
    const d = ed.recipeDialog
    expect([...d._sizeSelect.options].map((o) => o.value))
      .toEqual(['25%', '30%', '50%', '60%', '75%', '100%'])
    expect(d._alignBtns.map((b) => b.dataset.align)).toEqual(['left', 'center', 'right'])
    expect(d._deleteBtn.textContent).toContain('削除')   // 表現はエディタ共通
    expect(d._deleteBtn.querySelector('svg')).not.toBeNull()
  })

  it('削除は状態で出し分けない（新規でも同じ場所に同じボタン）', () => {
    ed._tabActionBtns.recipe.click()
    const btn = ed.recipeDialog._deleteBtn
    expect(btn.hidden).toBe(false)
    expect(btn.disabled).toBe(false)
    // まだカードが無いので、押しても消すものが無く「やめる」になるだけ
    btn.click()
    expect(ed.recipeDialog.isVisible).toBe(false)
    expect(ed.wysiwyg.querySelector(RECIPE_CARD_SEL)).toBeNull()
  })

  it('モーダルでサイズと寄せを決めるとカードに反映される（左右は float）', () => {
    ed._tabActionBtns.recipe.click()
    fill()
    ed.recipeDialog._sizeSelect.value = '60%'
    ed.recipeDialog._alignBtns.find((b) => b.dataset.align === 'left').click()
    ed.recipeDialog._saveBtn.click()

    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    expect(card.dataset.width).toBe('60%')
    expect(card.dataset.align).toBe('left')
    expect(card.getAttribute('style')).toBe('width:60%;float:left;margin:0 1em 1em 0')
  })

  it('再編集ではカードの現在のレイアウトがモーダルに載る', () => {
    ed.setContent(buildRecipeCardHtml(normalizeRecipe(RECIPE), { width: '30%', align: 'right' }))
    ed.wysiwyg.querySelector(RECIPE_CARD_SEL).dispatchEvent(new Event('click', { bubbles: true }))
    expect(ed.recipeDialog._sizeSelect.value).toBe('30%')
    expect(ed.recipeDialog._alignBtns.find((b) => b.classList.contains('active')).dataset.align)
      .toBe('right')

    // そのまま保存すればレイアウトは変わらない
    ed.recipeDialog._saveBtn.click()
    const card = ed.wysiwyg.querySelector(RECIPE_CARD_SEL)
    expect(card.dataset.width).toBe('30%')
    expect(card.getAttribute('style')).toContain('float:right')
  })

  it('モーダルの「削除」でカードごと消える', () => {
    ed.setContent(cardHtml())
    ed.wysiwyg.querySelector(RECIPE_CARD_SEL).dispatchEvent(new Event('click', { bubbles: true }))
    ed.recipeDialog._deleteBtn.click()

    expect(ed.wysiwyg.querySelector(RECIPE_CARD_SEL)).toBeNull()
    expect(ed.recipeDialog.isVisible).toBe(false)
    expect(ed.isDirty()).toBe(true)      // undo で戻せる編集として載る
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
