/**
 * JobCard — 求人 1 件の構造化データを持つ原子的ブロック(仕様 editor-editor-spec-job・cms-job)。
 *
 * recipe.js と同じ流儀: **DOM に触らない純関数だけ・外部依存ゼロ**。ブラウザ・Worker・試験のどこでも
 * 同じ実装が動き、ホスト(KuroCMS)のサーバー側検証と公開ページの JSON-LD も同じ形を参照する。
 *
 * ## 保存形式
 * ```html
 * <div data-kuro-block="job-card" data-job-version="1"
 *      data-job="<encodeURIComponent した JSON>" contenteditable="false">
 *   … JSON から作ったプレビュー(直接編集しない) …
 * </div>
 * ```
 * ⚠ `data-job` が正本。プレビューは毎回そこから作り直す。利用者の文字は必ずエスケープしてから連結する。
 * ⚠ 期限の無い求人が普通なので、募集しているかは `open`(入切)で持つ。`validThrough` は期限が決まっている
 *   求人だけの任意の欄。`openedAt`(募集を始めた日 = datePosted)は、切から入へ変えて保存したときにエディタが入れる。
 */

function _escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const JOB_VERSION = 1
export const JOB_BLOCK = 'job-card'
export const JOB_CARD_SEL = `div[data-kuro-block="${JOB_BLOCK}"]`

/** 雇用形態(Schema.org employmentType)と画面の名前。並びは選ぶ画面の並び。 */
export const EMPLOYMENT_TYPES = [
  ['FULL_TIME', '正社員'],
  ['PART_TIME', 'パート・アルバイト'],
  ['CONTRACTOR', '業務委託'],
  ['TEMPORARY', '契約・期間'],
  ['INTERN', 'インターン'],
  ['VOLUNTEER', 'ボランティア'],
  ['PER_DIEM', '日雇い'],
  ['OTHER', 'その他'],
]

/** 給与の単位(Schema.org unitText)と画面の名前。 */
export const SALARY_UNITS = [
  ['HOUR', '時給'],
  ['DAY', '日給'],
  ['WEEK', '週給'],
  ['MONTH', '月給'],
  ['YEAR', '年収'],
]

export const SALARY_CURRENCIES = ['JPY', 'USD', 'EUR']

/**
 * 言語(仕様 editor-editor-spec-job・#spec-i18n): **日本語なら日本語・それ以外はすべて英語**の 2 言語。
 * 入力画面と誤りの文は書き手の画面の言語、カードの表示(公開ページにも出る)は本文の言語で選ぶ。
 * @param {unknown} lang 'ja'・'ja-JP'・'en'・'fr' など。空なら日本語
 * @returns {'ja'|'en'}
 */
export function jobLang(lang) {
  const v = typeof lang === 'string' ? lang.trim().toLowerCase() : ''
  return !v || v === 'ja' || v.startsWith('ja-') ? 'ja' : 'en'
}

/** 英語の名前(EMPLOYMENT_TYPES・SALARY_UNITS の並びと同じ鍵)。 */
export const EMPLOYMENT_TYPES_EN = [
  ['FULL_TIME', 'Full-time'],
  ['PART_TIME', 'Part-time'],
  ['CONTRACTOR', 'Contractor'],
  ['TEMPORARY', 'Temporary'],
  ['INTERN', 'Internship'],
  ['VOLUNTEER', 'Volunteer'],
  ['PER_DIEM', 'Per diem'],
  ['OTHER', 'Other'],
]
export const SALARY_UNITS_EN = [
  ['HOUR', 'Hourly'],
  ['DAY', 'Daily'],
  ['WEEK', 'Weekly'],
  ['MONTH', 'Monthly'],
  ['YEAR', 'Yearly'],
]

/** 言語ごとの雇用形態・給与の単位の [鍵, 名前] の並び。 */
export function employmentTypes(lang) {
  return jobLang(lang) === 'ja' ? EMPLOYMENT_TYPES : EMPLOYMENT_TYPES_EN
}
export function salaryUnits(lang) {
  return jobLang(lang) === 'ja' ? SALARY_UNITS : SALARY_UNITS_EN
}

/** 誤りの文(validateJob)。{n} は上限の数。 */
const JOB_ERRORS = {
  ja: {
    unreadable: '求人の内容が読み取れません。',
    open: '募集中かどうかが読み取れません。',
    openedAt: '募集を始めた日は YYYY-MM-DD の正しい日付で入力してください。',
    typesMin: '雇用形態を 1 つ以上選んでください。',
    typesUnknown: '雇用形態に知らない値があります。',
    currency: '給与の通貨は JPY・USD・EUR から選んでください。',
    unit: '給与の単位が読み取れません。',
    minMissing: '給与の下限を入力してください(上限だけは入れられません)。',
    minPositive: '給与の下限は正の数で入力してください。',
    maxPositive: '給与の上限は正の数で入力してください。',
    maxBelowMin: '給与の上限は下限以上にしてください。',
    noteMax: '給与の補足は {n} 文字以内で入力してください。',
    country: '勤務地の国は 2 文字の国コード(例 JP)で入力してください。',
    region: '勤務地の都道府県を入力してください。',
    locality: '勤務地の市区町村を入力してください。',
    addressMax: '勤務地の各欄は {n} 文字以内で入力してください。',
    hoursMax: '勤務時間は {n} 文字以内で入力してください。',
    requirementsMax: '応募資格は {n} 文字以内で入力してください。',
    benefitsMax: '待遇は {n} 文字以内で入力してください。',
    openingsMax: '募集人数は {n} 文字以内で入力してください。',
    contactMax: '問い合わせ先は {n} 文字以内で入力してください。',
    validThrough: '掲載期限は YYYY-MM-DD の正しい日付で入力してください。',
    validBeforeOpened: '掲載期限は募集を始めた日以後にしてください。',
  },
  en: {
    unreadable: 'The job details cannot be read.',
    open: 'Whether the job is open cannot be read.',
    openedAt: 'Enter the posting date as a valid date (YYYY-MM-DD).',
    typesMin: 'Choose at least one employment type.',
    typesUnknown: 'The employment type has an unknown value.',
    currency: 'Choose the salary currency from JPY, USD or EUR.',
    unit: 'The salary unit cannot be read.',
    minMissing: 'Enter the minimum salary (a maximum alone is not allowed).',
    minPositive: 'Enter the minimum salary as a positive number.',
    maxPositive: 'Enter the maximum salary as a positive number.',
    maxBelowMin: 'The maximum salary must be at least the minimum.',
    noteMax: 'Keep the salary note within {n} characters.',
    country: 'Enter the country of the location as a 2-letter code (for example JP).',
    region: 'Enter the state or prefecture of the location.',
    locality: 'Enter the city of the location.',
    addressMax: 'Keep each part of the location within {n} characters.',
    hoursMax: 'Keep the working hours within {n} characters.',
    requirementsMax: 'Keep the requirements within {n} characters.',
    benefitsMax: 'Keep the benefits within {n} characters.',
    openingsMax: 'Keep the number of openings within {n} characters.',
    contactMax: 'Keep the contact within {n} characters.',
    validThrough: 'Enter the closing date as a valid date (YYYY-MM-DD).',
    validBeforeOpened: 'The closing date must be on or after the posting date.',
  },
}

/** カードの表示の文(renderJobPreview)。 */
const JOB_TEXT = {
  ja: {
    card: '求人カード', badge: '求人', open: '募集中', closed: '現在は募集していません',
    types: '雇用形態', salary: '給与', location: '勤務地', hours: '勤務時間', requirements: '応募資格',
    benefits: '待遇', openings: '募集人数', contact: '問い合わせ', validThrough: '掲載期限', sep: '・',
  },
  en: {
    card: 'Job card', badge: 'Job', open: 'Hiring', closed: 'Not currently hiring',
    types: 'Employment type', salary: 'Salary', location: 'Location', hours: 'Working hours', requirements: 'Requirements',
    benefits: 'Benefits', openings: 'Openings', contact: 'Contact', validThrough: 'Closing date', sep: ', ',
  },
}

export const JOB_LIMITS = {
  noteMax: 500,
  hoursMax: 500,
  requirementsMax: 1000,
  benefitsMax: 1000,
  openingsMax: 100,
  contactMax: 300,
  addressPartMax: 100,
  salaryMax: 1e9,
}

const EMPLOYMENT_KEYS = new Set(EMPLOYMENT_TYPES.map(([k]) => k))
const UNIT_KEYS = new Set(SALARY_UNITS.map(([k]) => k))

function str(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
}

/** 数へ寄せる。空・数でないものは null(未入力)。範囲はここでは切らない(検証が誤りとして見せる)。 */
function num(v) {
  if (v === '' || v == null) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,，\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** 暦の日付として正しい YYYY-MM-DD か。 */
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/**
 * 入力(画面・属性・外部)を保存する形へ。未入力の任意の欄はキーごと落とす。
 * @returns {object}
 */
export function normalizeJob(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { version: JOB_VERSION, open: src.open !== false }
  const opened = str(src.openedAt)
  if (opened) out.openedAt = opened
  const types = []
  for (const t of Array.isArray(src.employmentType) ? src.employmentType : []) {
    const k = str(t).toUpperCase()
    if (k && !types.includes(k)) types.push(k)
  }
  out.employmentType = types
  const s = src.salary && typeof src.salary === 'object' ? src.salary : null
  if (s) {
    const min = num(s.min)
    const max = num(s.max)
    if (min !== null || max !== null) {
      out.salary = {
        currency: str(s.currency).toUpperCase() || 'JPY',
        unit: str(s.unit).toUpperCase() || 'HOUR',
      }
      if (min !== null) out.salary.min = min
      if (max !== null) out.salary.max = max
    }
  }
  const note = str(src.salaryNote)
  if (note) out.salaryNote = note
  const l = src.location && typeof src.location === 'object' ? src.location : {}
  out.location = { country: (str(l.country) || 'JP').toUpperCase(), region: str(l.region), locality: str(l.locality) }
  const pc = str(l.postalCode)
  if (pc) out.location.postalCode = pc
  const st = str(l.street)
  if (st) out.location.street = st
  const hours = str(src.hours)
  if (hours) out.hours = hours
  const req = str(src.requirements)
  if (req) out.requirements = req
  const benefits = str(src.benefits)
  if (benefits) out.benefits = benefits
  const openings = str(src.openings)
  if (openings) out.openings = openings
  const contact = str(src.contact)
  if (contact) out.contact = contact
  const vt = str(src.validThrough)
  if (vt) out.validThrough = vt
  return out
}

/**
 * 保存してよい形か。**正規化済み**の値を渡す。
 * @param {string|((key: string, n?: number) => string)} [lang] 誤りの文の言語(jobLang・既定は日本語)、または文を作る関数
 * @returns {string[]} 人が読める誤りの文(空なら OK)
 */
export function validateJob(j, lang) {
  const errors = []
  const L = JOB_LIMITS
  // lang に関数を渡すと、文はその関数が作る((鍵, 上限の数) => 文。エディタは画面の辞書で引く)
  const M = JOB_ERRORS[jobLang(typeof lang === 'function' ? '' : lang)]
  const msg = (key, n) => typeof lang === 'function' ? lang(key, n) : n === undefined ? M[key] : M[key].replace('{n}', String(n))
  const e = (key, n) => errors.push(msg(key, n))
  if (!j || typeof j !== 'object') return [msg('unreadable')]
  if (typeof j.open !== 'boolean') e('open')
  if (j.openedAt !== undefined && !isIsoDate(j.openedAt)) e('openedAt')
  const types = Array.isArray(j.employmentType) ? j.employmentType : []
  if (types.length < 1) e('typesMin')
  if (types.some((t) => !EMPLOYMENT_KEYS.has(t))) e('typesUnknown')
  if (j.salary) {
    const s = j.salary
    if (!SALARY_CURRENCIES.includes(s.currency)) e('currency')
    if (!UNIT_KEYS.has(s.unit)) e('unit')
    if (s.min === undefined) e('minMissing')
    for (const [key, v] of [['minPositive', s.min], ['maxPositive', s.max]]) {
      if (v !== undefined && !(typeof v === 'number' && v > 0 && v <= L.salaryMax)) e(key)
    }
    if (typeof s.min === 'number' && typeof s.max === 'number' && s.max < s.min) e('maxBelowMin')
  }
  if ((j.salaryNote ?? '').length > L.noteMax) e('noteMax', L.noteMax)
  const loc = j.location && typeof j.location === 'object' ? j.location : {}
  if (!/^[A-Z]{2}$/.test(loc.country ?? '')) e('country')
  if (!loc.region) e('region')
  if (!loc.locality) e('locality')
  for (const k of ['region', 'locality', 'street', 'postalCode']) {
    if ((loc[k] ?? '').length > L.addressPartMax) { e('addressMax', L.addressPartMax); break }
  }
  if ((j.hours ?? '').length > L.hoursMax) e('hoursMax', L.hoursMax)
  if ((j.requirements ?? '').length > L.requirementsMax) e('requirementsMax', L.requirementsMax)
  if ((j.benefits ?? '').length > L.benefitsMax) e('benefitsMax', L.benefitsMax)
  if ((j.openings ?? '').length > L.openingsMax) e('openingsMax', L.openingsMax)
  if ((j.contact ?? '').length > L.contactMax) e('contactMax', L.contactMax)
  if (j.validThrough !== undefined) {
    if (!isIsoDate(j.validThrough)) e('validThrough')
    else if (j.openedAt && isIsoDate(j.openedAt) && j.validThrough < j.openedAt) e('validBeforeOpened')
  }
  return errors
}

export function encodeJob(j) {
  return encodeURIComponent(JSON.stringify(j))
}

/** `data-job` を読み戻す。壊れていれば null。⚠ 中身は信用しない —— 必ず normalizeJob を通す。 */
export function decodeJob(attr) {
  if (typeof attr !== 'string' || !attr) return null
  try {
    const obj = JSON.parse(decodeURIComponent(attr))
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null
  } catch {
    return null
  }
}

/**
 * いま募集しているか。open が真で、期限が無いか、期限が today(YYYY-MM-DD・サイトの時計)以後。
 * today を渡さなければ期限は見ない。
 */
export function jobIsOpen(j, today) {
  if (!j || j.open !== true) return false
  if (today && j.validThrough && j.validThrough < today) return false
  return true
}

export function employmentLabels(j, lang) {
  const names = new Map(employmentTypes(lang))
  return (Array.isArray(j?.employmentType) ? j.employmentType : []).map((k) => names.get(k) ?? k)
}

function money(n, currency, lang) {
  if (lang === 'en') {
    const sign = { JPY: '¥', USD: '$', EUR: '€' }[currency]
    return sign ? `${sign}${n.toLocaleString('en-US')}` : `${n.toLocaleString('en-US')} ${currency}`
  }
  if (currency === 'JPY') {
    if (n >= 10000 && n % 10000 === 0) return `${(n / 10000).toLocaleString('ja-JP')}万円`
    if (n >= 10000 && n % 1000 === 0) return `${(n / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`
    return `${n.toLocaleString('ja-JP')}円`
  }
  return `${n.toLocaleString('en-US')} ${currency}`
}

/** 「時給 1,500円〜」「月給 20万円〜25万円」(英語は「Hourly ¥1,500+」「Monthly ¥200,000–¥250,000」)。給与が無ければ空。 */
export function formatSalary(j, lang) {
  const s = j?.salary
  if (!s || typeof s.min !== 'number') return ''
  const lg = jobLang(lang)
  const unit = new Map(salaryUnits(lg)).get(s.unit) ?? ''
  const m = (n) => money(n, s.currency, lg)
  const [dash, plus] = lg === 'ja' ? ['〜', '〜'] : ['–', '+']
  const range = typeof s.max === 'number' && s.max !== s.min
    ? `${m(s.min)}${dash}${m(s.max)}`
    : typeof s.max === 'number' ? m(s.min) : `${m(s.min)}${plus}`
  return `${unit} ${range}`.trim()
}

/**
 * 募集人数の文から人数を読む(構造化データの totalJobOpenings)。「3」「3名」「3 人」だけを数として読み、
 * 「数名」「若干名」「3名(資格者尚可)」のような文は null(数に言い換えない —— 見えない値を作らない)。
 */
export function openingsCount(j) {
  const m = /^(\d{1,4})\s*(?:名|人)?$/.exec(str(j?.openings).normalize('NFKC'))
  return m ? Number(m[1]) : null
}

/** 問い合わせ先の文から、最初の電話番号を読む(構造化データの applicationContact.telephone)。無ければ空。 */
export function contactTelephone(j) {
  const m = /\+?\d[\d\-() ]{7,}\d/.exec(str(j?.contact).normalize('NFKC'))
  return m ? m[0].trim() : ''
}

/** 「〒277-0825 千葉県柏市布施138-5」(英語は「138-5 Fuse, Kashiwa, Chiba 277-0825」の順)。 */
export function formatLocation(j, lang) {
  const l = j?.location ?? {}
  if (jobLang(lang) === 'en') {
    const tail = [l.region, l.postalCode].filter(Boolean).join(' ')
    const parts = [l.street, l.locality, tail].filter(Boolean)
    if (l.country && l.country !== 'JP') parts.push(l.country)
    return parts.join(', ')
  }
  const pc = l.postalCode ? `〒${l.postalCode} ` : ''
  const country = l.country && l.country !== 'JP' ? ` (${l.country})` : ''
  return `${pc}${l.region ?? ''}${l.locality ?? ''}${l.street ?? ''}${country}`.trim()
}

function multiline(s) {
  return _escapeHtml(s).replace(/\r?\n/g, '<br>')
}

/**
 * プレビュー(エディタと公開ページで同じ)の内側 HTML。JSON からだけ作る。
 * @param {object} j 正規化済み
 * @param {{today?: string, lang?: string}} [opt] today = 公開ページの作成日(サイトの時計)。渡すと期限を過ぎた
 *   求人を「募集していません」と出す。lang = 本文の言語(jobLang・既定は日本語)
 */
export function renderJobPreview(j, opt = {}) {
  const lang = jobLang(opt.lang)
  const T = JOB_TEXT[lang]
  const open = jobIsOpen(j, opt.today)
  const rows = []
  const row = (k, v) => rows.push(`<tr><th>${_escapeHtml(k)}</th><td>${v}</td></tr>`)
  const types = employmentLabels(j, lang)
  if (types.length) row(T.types, _escapeHtml(types.join(T.sep)))
  const sal = formatSalary(j, lang)
  if (sal || j.salaryNote) row(T.salary, [_escapeHtml(sal), j.salaryNote ? multiline(j.salaryNote) : ''].filter(Boolean).join('<br>'))
  const loc = formatLocation(j, lang)
  if (loc) row(T.location, _escapeHtml(loc))
  if (j.hours) row(T.hours, multiline(j.hours))
  if (j.requirements) row(T.requirements, multiline(j.requirements))
  if (j.benefits) row(T.benefits, multiline(j.benefits))
  if (j.openings) row(T.openings, multiline(j.openings))
  if (j.contact) row(T.contact, multiline(j.contact))
  if (j.validThrough) row(T.validThrough, _escapeHtml(lang === 'ja' ? j.validThrough.replace(/-/g, '/') : j.validThrough))
  return `<div class="kuro-job__head">` +
      `<span class="kuro-job__label">${T.badge}</span>` +
      `<span class="kuro-job__state kuro-job__state--${open ? 'open' : 'closed'}">${open ? T.open : T.closed}</span>` +
    `</div>` +
    `<table class="kuro-job__table"><tbody>${rows.join('')}</tbody></table>`
}

/** カードの aria-label(本文の言語)。 */
export function jobCardLabel(lang) {
  return JOB_TEXT[jobLang(lang)].card
}

/** JobCard ブロック 1 個ぶんの HTML(保存形式)。 */
export function buildJobCardHtml(j, opt = {}) {
  return `<div data-kuro-block="${JOB_BLOCK}"` +
    ` data-job-version="${JOB_VERSION}"` +
    ` data-job="${encodeJob(j)}"` +
    ` contenteditable="false" role="group" aria-label="${JOB_TEXT[jobLang(opt.lang)].card}">` +
    renderJobPreview(j, opt) +
    `</div>`
}

/** 新しく置くときの初期値。 */
export function emptyJob() {
  return {
    version: JOB_VERSION,
    open: true,
    employmentType: [],
    location: { country: 'JP', region: '', locality: '' },
  }
}

/**
 * 保存のときの openedAt。切から入へ変えたとき・新しく入のまま作るときに today を入れる。
 * 入のまま直すとき(前も入)は前の値を残す。切の間は前の値を残す(入れ直したときに新しい日へ変わる)。
 * @param {object|null} before 前の正本(新しく作るときは null)
 * @param {object} after 正規化済みの新しい値
 * @param {string} today YYYY-MM-DD(書き手の端末の日付)
 */
export function stampOpenedAt(before, after, today) {
  if (!after.open) return after
  const wasOpen = before ? before.open === true : false
  if (wasOpen) return after.openedAt ? after : { ...after, openedAt: today }
  // 切(または新規)から入へ: 書き手がモーダルで日付を直していればそれを、そうでなければ今日
  const edited = Boolean(after.openedAt) && after.openedAt !== before?.openedAt
  return { ...after, openedAt: edited ? after.openedAt : today }
}
