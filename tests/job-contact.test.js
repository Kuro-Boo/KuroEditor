/**
 * JobCard(求人)・ContactForm(問い合わせフォーム)— 純関数とエディタの組み込み。happy-dom。
 * 仕様: editor-editor-spec-job・editor-editor-spec-contact。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  KuroEditor,
  JOB_CARD_SEL,
  CONTACT_CARD_SEL,
  buildJobCardHtml,
  buildContactCardHtml,
  normalizeJob,
  validateJob,
  decodeJob,
  jobIsOpen,
  formatSalary,
  stampOpenedAt,
  renderJobPreview,
  normalizeContactForm,
  validateContactForm,
  decodeContactForm,
  renderContactFormHtml,
  validateSubmission,
  emptyContactForm,
  openingsCount,
  contactTelephone,
  jobLang,
  formatLocation,
} from '../src/editor.js'

const JOB = {
  open: true,
  openedAt: '2026-11-21',
  employmentType: ['PART_TIME'],
  salary: { currency: 'JPY', unit: 'HOUR', min: '1,500' },
  location: { country: 'JP', postalCode: '277-0825', region: '千葉県', locality: '柏市', street: '布施138-5' },
  hours: '9:00〜17:00 のうち 4 時間〜',
}

beforeEach(() => { document.body.innerHTML = '' })

describe('normalizeJob / validateJob', () => {
  it('給与の数は桁区切りを外して数にし、正しい求人は誤りが無い', () => {
    const j = normalizeJob(JOB)
    expect(j.salary).toEqual({ currency: 'JPY', unit: 'HOUR', min: 1500 })
    expect(validateJob(j)).toEqual([])
  })
  it('雇用形態・都道府県・市区町村は必須', () => {
    const errs = validateJob(normalizeJob({ open: true, location: {} }))
    expect(errs.join()).toMatch('雇用形態')
    expect(errs.join()).toMatch('都道府県')
    expect(errs.join()).toMatch('市区町村')
  })
  it('暦に無い日付・期限が始めた日より前・上限が下限より小さいものは断る', () => {
    expect(validateJob(normalizeJob({ ...JOB, openedAt: '2026-02-30' })).join()).toMatch('募集を始めた日')
    expect(validateJob(normalizeJob({ ...JOB, validThrough: '2026-11-01' })).join()).toMatch('掲載期限は募集を始めた日以後')
    expect(validateJob(normalizeJob({ ...JOB, salary: { currency: 'JPY', unit: 'HOUR', min: 2000, max: 1000 } })).join()).toMatch('上限は下限以上')
  })
  it('期限は任意(期限の無い求人が普通)', () => {
    const j = normalizeJob(JOB)
    expect(j.validThrough).toBeUndefined()
    expect(validateJob(j)).toEqual([])
  })
})

describe('待遇・募集人数・問い合わせ先', () => {
  const FULL = { ...JOB, benefits: '賞与 年2回\n労災保険・雇用保険', openings: '数名', contact: '04-7168-0711\n繋がらない時は本部へ', salaryNote: '夜勤 1回 16,100円\n予想月収 11万9500円' }
  it('保存の形に残り、カードに行として出る(複数行は改行のまま)', () => {
    const j = normalizeJob(FULL)
    expect(validateJob(j)).toEqual([])
    const html = renderJobPreview(j)
    expect(html).toMatch('<th>待遇</th><td>賞与 年2回<br>労災保険・雇用保険</td>')
    expect(html).toMatch('<th>募集人数</th><td>数名</td>')
    expect(html).toMatch('<th>問い合わせ</th><td>04-7168-0711<br>繋がらない時は本部へ</td>')
    expect(html).toMatch('予想月収')
  })
  it('空なら行を出さず、キーごと落とす', () => {
    const j = normalizeJob({ ...JOB, benefits: ' ', openings: '', contact: null })
    expect('benefits' in j || 'openings' in j || 'contact' in j).toBe(false)
    expect(renderJobPreview(j)).not.toMatch('募集人数')
  })
  it('字数の上限', () => {
    expect(validateJob(normalizeJob({ ...JOB, openings: 'x'.repeat(101) })).join()).toMatch('募集人数')
  })
  it('人数は数だけのときに読み、「数名」は数に言い換えない', () => {
    expect(openingsCount(normalizeJob({ ...JOB, openings: '3名' }))).toBe(3)
    expect(openingsCount(normalizeJob({ ...JOB, openings: '３人' }))).toBe(3)
    expect(openingsCount(normalizeJob({ ...JOB, openings: '数名' }))).toBeNull()
    expect(openingsCount(normalizeJob({ ...JOB, openings: '3名(資格者尚可)' }))).toBeNull()
  })
  it('問い合わせ先から最初の電話番号を読む', () => {
    expect(contactTelephone(normalizeJob(FULL))).toBe('04-7168-0711')
    expect(contactTelephone(normalizeJob({ ...JOB, contact: '本部へメールで' }))).toBe('')
  })
})

describe('募集中の入切', () => {
  it('切なら募集していない。期限が過ぎても募集していない', () => {
    expect(jobIsOpen(normalizeJob({ ...JOB, open: false }), '2026-11-21')).toBe(false)
    expect(jobIsOpen(normalizeJob({ ...JOB, validThrough: '2026-11-30' }), '2026-12-01')).toBe(false)
    expect(jobIsOpen(normalizeJob(JOB), '2030-01-01')).toBe(true)
  })
  it('切から入へ変えたら、募集を始めた日は今日になる', () => {
    const before = normalizeJob({ ...JOB, open: false, openedAt: '2025-01-01' })
    const after = stampOpenedAt(before, normalizeJob({ ...JOB, openedAt: '2025-01-01' }), '2026-12-24')
    expect(after.openedAt).toBe('2026-12-24')
  })
  it('入のまま直したら、募集を始めた日は変えない', () => {
    const before = normalizeJob(JOB)
    const after = stampOpenedAt(before, normalizeJob({ ...JOB, hours: '変更' }), '2026-12-24')
    expect(after.openedAt).toBe('2026-11-21')
  })
  it('新しく入で作れば今日。切で作れば日付を入れない', () => {
    expect(stampOpenedAt(null, normalizeJob({ ...JOB, openedAt: '' }), '2026-12-24').openedAt).toBe('2026-12-24')
    expect(stampOpenedAt(null, normalizeJob({ ...JOB, open: false, openedAt: '' }), '2026-12-24').openedAt).toBeUndefined()
  })
  it('プレビューは状態を出し、止めた求人は「現在は募集していません」', () => {
    expect(renderJobPreview(normalizeJob(JOB))).toMatch('募集中')
    expect(renderJobPreview(normalizeJob({ ...JOB, open: false }))).toMatch('現在は募集していません')
  })
})

describe('formatSalary', () => {
  it('時給・月給の幅を読める形にする', () => {
    expect(formatSalary(normalizeJob(JOB))).toBe('時給 1,500円〜')
    expect(formatSalary(normalizeJob({ ...JOB, salary: { currency: 'JPY', unit: 'MONTH', min: 200000, max: 250000 } }))).toBe('月給 20万円〜25万円')
  })
})

describe('JobCard の保存形式', () => {
  it('data-job が正本で、利用者の文字はエスケープする', () => {
    const html = buildJobCardHtml(normalizeJob({ ...JOB, hours: '<script>x</script>' }))
    const holder = document.createElement('div')
    holder.innerHTML = html
    const card = holder.querySelector(JOB_CARD_SEL)
    expect(card.getAttribute('contenteditable')).toBe('false')
    expect(decodeJob(card.getAttribute('data-job')).hours).toBe('<script>x</script>')
    expect(card.querySelector('script')).toBeNull()
  })
})

describe('ContactForm', () => {
  it('既定の形は正しい', () => {
    expect(validateContactForm(normalizeContactForm(emptyContactForm()))).toEqual([])
  })
  it('メールアドレスか電話番号の項目が無ければ断る(返事ができない)', () => {
    const c = normalizeContactForm({ subject: 'x', fields: [{ kind: 'name', label: 'お名前' }] })
    expect(validateContactForm(c).join()).toMatch('メールアドレスか電話番号')
  })
  it('選ぶ項目は選択肢が要る', () => {
    const c = normalizeContactForm({ subject: 'x', fields: [{ kind: 'tel', label: '電話' }, { kind: 'select', label: '種類', options: [] }] })
    expect(validateContactForm(c).join()).toMatch('選択肢')
  })
  it('保存形式に form・input を出さない(本物は公開のときにホストが作る)', () => {
    const html = buildContactCardHtml(normalizeContactForm(emptyContactForm()))
    expect(html).not.toMatch(/<form|<input(?![^>]*disabled)/)
    const holder = document.createElement('div')
    holder.innerHTML = html
    expect(decodeContactForm(holder.querySelector(CONTACT_CARD_SEL).getAttribute('data-contact')).subject).toBe('お問い合わせ')
  })
  it('送り先は名前だけを持つ(重複は 1 つに・形の違う名前と多すぎる数は断る)', () => {
    const c = normalizeContactForm({ ...emptyContactForm(), to: ['honbu', 'Syurou-A', 'honbu', ''] })
    expect(c.to).toEqual(['honbu', 'syurou-a'])
    expect(validateContactForm(c)).toEqual([])
    expect(validateContactForm(normalizeContactForm({ ...emptyContactForm(), to: ['a@b.com'] })).join()).toMatch('送り先の名前')
    expect(validateContactForm(normalizeContactForm({ ...emptyContactForm(), to: ['a', 'b', 'c', 'd', 'e', 'f'] })).join()).toMatch('5 か所まで')
    expect(normalizeContactForm(emptyContactForm()).to).toBeUndefined()
  })
  it('公開ページのフォームは欄の名前を並びの番号にし、罠の欄を持つ', () => {
    const html = renderContactFormHtml(normalizeContactForm(emptyContactForm()), { form: 'abc', sig: 'def', endpoint: '/_contact' })
    expect(html).toMatch('name="f0"')
    expect(html).toMatch('name="website"')
    expect(html).toMatch('data-sig="def"')
  })
})

describe('validateSubmission', () => {
  const c = normalizeContactForm({
    subject: '申し込み',
    fields: [
      { kind: 'name', label: 'お名前', required: true },
      { kind: 'email', label: 'メール', required: true },
      { kind: 'select', label: '種類', required: true, options: ['見学', '利用'] },
      { kind: 'textarea', label: '内容' },
    ],
  })
  it('正しい値は通り、1 行の欄の改行は畳む', () => {
    const r = validateSubmission(c, { f0: '山田\r\n太郎', f1: 'a@example.com', f2: '見学', f3: '1行目\n2行目' })
    expect(r.ok).toBe(true)
    expect(r.clean[0].value).toBe('山田 太郎')
    expect(r.clean[3].value).toBe('1行目\n2行目')
  })
  it('必須・メールの形・選択肢の外を断る', () => {
    const r = validateSubmission(c, { f0: '', f1: 'not-mail', f2: '他' })
    expect(r.ok).toBe(false)
    expect(Object.keys(r.errors).sort()).toEqual(['f0', 'f1', 'f2'])
  })
  it('見出しを割る文字(改行)入りのメールアドレスは通さない', () => {
    const r = validateSubmission(c, { f0: 'a', f1: 'a@example.com\nBcc: x@example.com', f2: '見学' })
    expect(r.errors.f1).toBeDefined()
  })
})

describe('エディタの組み込み', () => {
  const mount = () => { const el = document.createElement('div'); document.body.appendChild(el); return el }
  it('既定では求人・フォームのボタンもモーダルも作らない', () => {
    const ed = new KuroEditor(mount())
    expect(ed._tabActionBtns.job).toBeUndefined()
    expect(ed._tabActionBtns.contact).toBeUndefined()
    expect(ed.jobDialog).toBeNull()
    expect(ed.contactDialog).toBeNull()
  })
  it('jobUi・contactUi で出る', () => {
    const ed = new KuroEditor(mount(), { jobUi: true, contactUi: true })
    expect(ed._tabActionBtns.job).toBeDefined()
    expect(ed._tabActionBtns.contact).toBeDefined()
  })
  it('求人カードがあれば求人ボタンを淡くする(1 記事 = 1 求人)', () => {
    const ed = new KuroEditor(mount(), { jobUi: true })
    ed.setContent(buildJobCardHtml(normalizeJob(JOB)))
    ed._syncJobBtn()
    expect(ed._tabActionBtns.job.getAttribute('aria-disabled')).toBe('true')
  })
  it('保存のたびにカードの内側を正本から作り直す', () => {
    const ed = new KuroEditor(mount(), { jobUi: true, contactUi: true })
    ed.setContent(buildJobCardHtml(normalizeJob(JOB)) + buildContactCardHtml(normalizeContactForm(emptyContactForm())))
    ed.wysiwyg.querySelector(JOB_CARD_SEL).innerHTML = '<p>壊れた</p>'
    const out = ed.getContent()
    expect(out).toMatch('kuro-job__table')
    expect(out).not.toMatch('壊れた')
    expect(out).toMatch('kuro-contact__subject')
  })
  it('フォームのモーダルは、ホストの候補から送り先を選ばせ、登録に無い名前も黙って落とさない', () => {
    const ed = new KuroEditor(mount(), { contactUi: true, contactRecipients: [{ name: 'honbu', label: '本部' }, { name: 'syurou-a', label: 'A型' }] })
    const d = ed.contactDialog
    d.open({ ...emptyContactForm(), to: ['honbu', 'old'] })
    const boxes = [...d._toList.querySelectorAll('input[type="checkbox"]')]
    expect(boxes.map((b) => [b.value, b.checked])).toEqual([['honbu', true], ['syurou-a', false], ['old', true]])
    expect(d._toList.textContent).toMatch('old(登録がありません)')
    boxes[1].checked = true
    boxes[2].checked = false
    expect(normalizeContactForm(d._read()).to).toEqual(['honbu', 'syurou-a'])
  })
  it('モーダルで保存すると、キャレットの後ろにカードが入る', () => {
    const ed = new KuroEditor(mount(), { jobUi: true })
    ed.setContent('<p>前</p>')
    ed._applyAtomicCard('job', normalizeJob(JOB))
    expect(ed.wysiwyg.querySelectorAll(JOB_CARD_SEL).length).toBe(1)
  })
})

describe('求人カードの言語(日本語なら日本語・それ以外は英語)', () => {
  const mount = () => { const el = document.createElement('div'); document.body.appendChild(el); return el }
  it('jobLang は ja・ja-JP・空を日本語、ほかを英語にする', () => {
    expect(jobLang('ja')).toBe('ja')
    expect(jobLang('ja-JP')).toBe('ja')
    expect(jobLang('')).toBe('ja')
    expect(jobLang('en')).toBe('en')
    expect(jobLang('fr')).toBe('en')
  })
  it('英語の本文では、カードの見出し・雇用形態・給与・勤務地を英語で出す', () => {
    const j = normalizeJob({ ...JOB, hours: '9:00-17:00', location: { country: 'JP', postalCode: '277-0825', region: 'Chiba', locality: 'Kashiwa', street: '138-5 Fuse' } })
    const html = renderJobPreview(j, { lang: 'en' })
    expect(html).toMatch('Employment type')
    expect(html).toMatch('Part-time')
    expect(html).toMatch('Hiring')
    expect(html).not.toMatch(/[ぁ-んァ-ン]/)
    expect(formatSalary(j, 'en')).toBe('Hourly ¥1,500+')
    expect(formatLocation(j, 'en')).toBe('138-5 Fuse, Kashiwa, Chiba 277-0825')
    expect(renderJobPreview(normalizeJob({ ...JOB, open: false }), { lang: 'en' })).toMatch('Not currently hiring')
    expect(buildJobCardHtml(j, { lang: 'en' })).toMatch('aria-label="Job card"')
  })
  it('既定(言語なし)は今までどおり日本語', () => {
    const j = normalizeJob(JOB)
    expect(renderJobPreview(j)).toMatch('雇用形態')
    expect(formatSalary(j)).toBe('時給 1,500円〜')
  })
  it('誤りの文も英語にできる', () => {
    const errs = validateJob(normalizeJob({ ...JOB, employmentType: [] }), 'en')
    expect(errs).toContain('Choose at least one employment type.')
  })
  it('入力画面は uiLang、カードの表示は contentLang に従い、setContentLang で作り直す', () => {
    const ed = new KuroEditor(mount(), { jobUi: true, uiLang: 'en', contentLang: 'ja' })
    expect(ed.jobDialog.el.getAttribute('aria-label')).toBe('Edit job card')
    expect(ed.jobDialog.el.textContent).toMatch('Employment type (one or more)')
    expect(ed._tabActionBtns.job.getAttribute('title')).toMatch('Job card')
    ed.setContent(buildJobCardHtml(normalizeJob(JOB)))
    expect(ed.wysiwyg.querySelector(JOB_CARD_SEL).textContent).toMatch('雇用形態')
    ed.setContentLang('en')
    expect(ed.wysiwyg.querySelector(JOB_CARD_SEL).textContent).toMatch('Employment type')
    expect(ed.getContent()).toMatch('Employment type')
  })
  it('uiLang が日本語なら入力画面は日本語', () => {
    const ed = new KuroEditor(mount(), { jobUi: true, uiLang: 'ja' })
    expect(ed.jobDialog.el.getAttribute('aria-label')).toBe('求人カードの編集')
  })
})
