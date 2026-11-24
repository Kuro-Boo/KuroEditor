/**
 * ContactForm — 問い合わせ・申し込みのフォームの形を持つ原子的ブロック(仕様 editor-editor-spec-contact・cms-contact)。
 *
 * recipe.js・job.js と同じ流儀: **DOM に触らない純関数だけ・外部依存ゼロ**。
 * KuroEditor が持つのはフォームの形(件名・項目・ボタンの文)と、送り先の**名前**(to)だけ。
 * アドレス・送り方・ロボット避けはホストが持つ(KuroCMS は設定の「問い合わせ」で送り先を登録し、ID mail-001… を付ける)。
 * ⚠ 本文にアドレスを書く欄は作らない(書ける人が誰でも宛先を変えられると、サイトが他人へのメールの踏み台になる)。
 *   名前はホストが登録した送り先を指すだけなので、名前を書き換えても登録の外へは送れない。
 *
 * ## 保存形式
 * ```html
 * <div data-kuro-block="contact-form" data-contact-version="1"
 *      data-contact="<encodeURIComponent した JSON>" contenteditable="false">… 押せない見本 …</div>
 * ```
 * 保存 HTML に <form>・<input> は出さない。公開ページの本物のフォームは、ホストが renderContactFormHtml で作る。
 */

function _escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const CONTACT_VERSION = 1
export const CONTACT_BLOCK = 'contact-form'
export const CONTACT_CARD_SEL = `div[data-kuro-block="${CONTACT_BLOCK}"]`

/** 項目の種類と既定の名前。 */
export const FIELD_KINDS = [
  ['name', 'お名前'],
  ['kana', 'ふりがな'],
  ['email', 'メールアドレス'],
  ['tel', '電話番号'],
  ['postal', '郵便番号'],
  ['address', '住所'],
  ['date', '日付'],
  ['select', '選択'],
  ['text', '1 行の文'],
  ['textarea', '複数行の文'],
]

export const CONTACT_LIMITS = {
  perBody: 3,
  subjectMax: 60,
  fieldsMax: 20,
  labelMax: 40,
  optionsMax: 20,
  optionMax: 60,
  submitMax: 20,
  doneMax: 200,
  noteMax: 300,
  /** 送り先の名前の数(本部と事業所、のように複数へ同じ内容を届ける) */
  toMax: 5,
  /** 送られる値の上限(1 行・複数行) */
  valueMax: 200,
  textareaMax: 5000,
}

export const CONTACT_DEFAULTS = {
  submitLabel: '送信する',
  doneMessage: '送信しました。担当者からご連絡します。',
}

const KIND_KEYS = new Set(FIELD_KINDS.map(([k]) => k))

/** 送り先の名前の形(ホストの登録の ID。KuroCMS では mail-001 のような形)。 */
export const RECIPIENT_NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/

function str(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
}

/** 入力を保存する形へ。空の任意の欄はキーごと落とす。 */
export function normalizeContactForm(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { version: CONTACT_VERSION, subject: str(src.subject), fields: [] }
  for (const f of Array.isArray(src.fields) ? src.fields : []) {
    const kind = str(f?.kind)
    const label = str(f?.label)
    if (!kind && !label) continue
    const field = { kind, label, required: f?.required === true }
    if (kind === 'select') {
      field.options = (Array.isArray(f?.options) ? f.options : []).map(str).filter(Boolean)
    }
    out.fields.push(field)
  }
  for (const k of ['submitLabel', 'doneMessage', 'note']) {
    const v = str(src[k])
    if (v) out[k] = v
  }
  const to = [...new Set((Array.isArray(src.to) ? src.to : []).map(str).map((v) => v.toLowerCase()).filter(Boolean))]
  if (to.length) out.to = to
  return out
}

/** 保存してよい形か。正規化済みを渡す。 */
export function validateContactForm(c) {
  const errors = []
  const L = CONTACT_LIMITS
  if (!c || typeof c !== 'object') return ['フォームの内容が読み取れません。']
  if (!c.subject) errors.push('件名を入力してください。')
  else if (c.subject.length > L.subjectMax) errors.push(`件名は ${L.subjectMax} 文字以内で入力してください。`)
  const fields = Array.isArray(c.fields) ? c.fields : []
  if (fields.length < 1) errors.push('項目を 1 つ以上置いてください。')
  if (fields.length > L.fieldsMax) errors.push(`項目は ${L.fieldsMax} 個までです。`)
  fields.forEach((f, i) => {
    const n = i + 1
    if (!KIND_KEYS.has(f.kind)) errors.push(`${n} 番目の項目の種類が読み取れません。`)
    if (!f.label) errors.push(`${n} 番目の項目の名前を入力してください。`)
    else if (f.label.length > L.labelMax) errors.push(`${n} 番目の項目の名前は ${L.labelMax} 文字以内で入力してください。`)
    if (f.kind === 'select') {
      const o = f.options ?? []
      if (o.length < 1 || o.length > L.optionsMax) errors.push(`${n} 番目の項目の選択肢は 1〜${L.optionsMax} 個で入力してください。`)
      if (o.some((x) => x.length > L.optionMax)) errors.push(`${n} 番目の項目の選択肢は 1 つ ${L.optionMax} 文字以内で入力してください。`)
    }
  })
  if (!fields.some((f) => f.kind === 'email' || f.kind === 'tel')) {
    errors.push('返事ができるよう、メールアドレスか電話番号の項目を 1 つ以上置いてください。')
  }
  if ((c.submitLabel ?? '').length > L.submitMax) errors.push(`ボタンの文は ${L.submitMax} 文字以内で入力してください。`)
  if ((c.doneMessage ?? '').length > L.doneMax) errors.push(`送信後の文は ${L.doneMax} 文字以内で入力してください。`)
  if ((c.note ?? '').length > L.noteMax) errors.push(`案内の文は ${L.noteMax} 文字以内で入力してください。`)
  const to = Array.isArray(c.to) ? c.to : []
  if (to.length > L.toMax) errors.push(`送り先は ${L.toMax} か所までです。`)
  if (to.some((n) => !RECIPIENT_NAME_RE.test(n))) errors.push('送り先の名前が読み取れません。')
  return errors
}

export function encodeContactForm(c) {
  return encodeURIComponent(JSON.stringify(c))
}

/** `data-contact` を読み戻す。壊れていれば null。⚠ 中身は信用しない —— 必ず normalizeContactForm を通す。 */
export function decodeContactForm(attr) {
  if (typeof attr !== 'string' || !attr) return null
  try {
    const obj = JSON.parse(decodeURIComponent(attr))
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null
  } catch {
    return null
  }
}

const INPUT_TYPE = { email: 'email', tel: 'tel', date: 'date', postal: 'text', name: 'text', kana: 'text', address: 'text', text: 'text' }
const AUTOCOMPLETE = { name: 'name', email: 'email', tel: 'tel', postal: 'postal-code', address: 'street-address' }

/**
 * 欄の HTML。live が偽なら押せない見本(エディタのプレビュー)、真なら本物(公開ページ)。
 * 本物の name は `f{番号}`(項目の並び)。名前を利用者の文字から作らない。
 */
function fieldHtml(f, i, live) {
  const id = `kc-f${i}`
  const req = f.required ? '<span class="kuro-contact__req">必須</span>' : ''
  const dis = live ? '' : ' disabled tabindex="-1"'
  const reqAttr = live && f.required ? ' required' : ''
  const name = live ? ` name="f${i}" id="${id}"` : ''
  let control
  if (f.kind === 'textarea') {
    control = `<textarea class="kuro-contact__input" rows="5" maxlength="${CONTACT_LIMITS.textareaMax}"${name}${reqAttr}${dis}></textarea>`
  } else if (f.kind === 'select') {
    const opts = (f.options ?? []).map((o) => `<option>${_escapeHtml(o)}</option>`).join('')
    control = `<select class="kuro-contact__input"${name}${reqAttr}${dis}><option value="">選んでください</option>${opts}</select>`
  } else {
    const ac = AUTOCOMPLETE[f.kind] ? ` autocomplete="${AUTOCOMPLETE[f.kind]}"` : ''
    control = `<input class="kuro-contact__input" type="${INPUT_TYPE[f.kind] ?? 'text'}" maxlength="${CONTACT_LIMITS.valueMax}"${ac}${name}${reqAttr}${dis}>`
  }
  const forAttr = live ? ` for="${id}"` : ''
  return `<div class="kuro-contact__row"><label class="kuro-contact__label"${forAttr}>${_escapeHtml(f.label)}${req}</label>${control}</div>`
}

function bodyHtml(c, live) {
  const note = c.note ? `<p class="kuro-contact__note">${_escapeHtml(c.note).replace(/\r?\n/g, '<br>')}</p>` : ''
  const rows = c.fields.map((f, i) => fieldHtml(f, i, live)).join('')
  const btn = `<button type="${live ? 'submit' : 'button'}" class="kuro-contact__submit"${live ? '' : ' disabled tabindex="-1"'}>${_escapeHtml(c.submitLabel || CONTACT_DEFAULTS.submitLabel)}</button>`
  return `<div class="kuro-contact__head"><span class="kuro-contact__label-tag">フォーム</span><span class="kuro-contact__subject">${_escapeHtml(c.subject)}</span></div>${note}${rows}<div class="kuro-contact__actions">${btn}</div>`
}

/** エディタのプレビュー(押せない見本)の内側 HTML。 */
export function renderContactPreview(c) {
  return bodyHtml(c, false)
}

/** ContactForm ブロック 1 個ぶんの HTML(保存形式)。 */
export function buildContactCardHtml(c) {
  return `<div data-kuro-block="${CONTACT_BLOCK}"` +
    ` data-contact-version="${CONTACT_VERSION}"` +
    ` data-contact="${encodeContactForm(c)}"` +
    ` contenteditable="false" role="group" aria-label="問い合わせフォーム">` +
    renderContactPreview(c) +
    `</div>`
}

/**
 * 公開ページの本物のフォーム。ホストが公開のときに作る。
 * @param {object} c 正規化・検証済みの形
 * @param {{ form: string, sig: string, endpoint: string }} host 署名した形(base64url)・署名・送り先の根(自分のサイト)
 */
export function renderContactFormHtml(c, host) {
  const done = _escapeHtml(c.doneMessage || CONTACT_DEFAULTS.doneMessage)
  return `<form class="kuro-contact kuro-contact--live" data-kuro-contact="1" novalidate` +
    ` data-form="${_escapeHtml(host.form)}" data-sig="${_escapeHtml(host.sig)}" data-endpoint="${_escapeHtml(host.endpoint)}">` +
    bodyHtml(c, true) +
    // 罠の欄(人には見えない。値があればロボット)
    `<div class="kuro-contact__trap" aria-hidden="true"><label>空のままにしてください<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>` +
    `<p class="kuro-contact__status" role="status" aria-live="polite"></p>` +
    `<p class="kuro-contact__done" hidden>${done}</p>` +
    `<noscript><p class="kuro-contact__nojs">このフォームを送るには JavaScript を有効にしてください。</p></noscript>` +
    `</form>`
}

const EMAIL_RE = /^[^\s@<>"',;:\\()[\]]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/
const TEL_RE = /^[0-9０-９+＋()（）\-－ー‐\s]{6,24}$/
const POSTAL_RE = /^[0-9０-９]{3}[-－ー‐]?[0-9０-９]{4}$/

export function isEmail(v) {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v)
}

/**
 * 送られた値をフォームの形で確かめる(サーバーとブラウザで同じ)。
 * @param {object} c 形(正規化済み)
 * @param {Record<string, unknown>} values `f{番号}` → 値
 * @returns {{ ok: boolean, errors: Record<string, string>, clean: {label: string, kind: string, value: string}[] }}
 */
export function validateSubmission(c, values) {
  const errors = {}
  const clean = []
  const src = values && typeof values === 'object' ? values : {}
  c.fields.forEach((f, i) => {
    const key = `f${i}`
    const raw = src[key]
    let v = typeof raw === 'string' ? raw : raw == null ? '' : String(raw)
    // 改行は複数行の欄だけ。ほかは 1 行に畳む(メールの見出しに入らないが、表示を崩さない)
    v = f.kind === 'textarea' ? v.replace(/\r\n?/g, '\n').trim() : v.replace(/[\r\n\t]+/g, ' ').trim()
    // 制御文字は落とす(改行・タブは上で扱った)
    v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    const max = f.kind === 'textarea' ? CONTACT_LIMITS.textareaMax : CONTACT_LIMITS.valueMax
    if (!v) {
      if (f.required) errors[key] = `${f.label}を入力してください。`
    } else if (v.length > max) {
      errors[key] = `${f.label}は ${max} 文字以内で入力してください。`
    } else if (f.kind === 'email' && !isEmail(v)) {
      errors[key] = 'メールアドレスの形が正しくありません。'
    } else if (f.kind === 'tel' && !TEL_RE.test(v)) {
      errors[key] = '電話番号の形が正しくありません。'
    } else if (f.kind === 'postal' && !POSTAL_RE.test(v)) {
      errors[key] = '郵便番号は 7 桁で入力してください。'
    } else if (f.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      errors[key] = '日付の形が正しくありません。'
    } else if (f.kind === 'select' && !(f.options ?? []).includes(v)) {
      errors[key] = `${f.label}は選択肢から選んでください。`
    }
    clean.push({ label: f.label, kind: f.kind, value: v })
  })
  return { ok: Object.keys(errors).length === 0, errors, clean }
}

/** 新しく置くときの初期値(よく使う 4 項目)。 */
export function emptyContactForm() {
  return {
    version: CONTACT_VERSION,
    subject: 'お問い合わせ',
    fields: [
      { kind: 'name', label: 'お名前', required: true },
      { kind: 'email', label: 'メールアドレス', required: true },
      { kind: 'tel', label: '電話番号', required: false },
      { kind: 'textarea', label: 'お問い合わせ内容', required: true },
    ],
  }
}
