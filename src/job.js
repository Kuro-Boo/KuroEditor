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
 * @returns {string[]} 人が読める誤りの文(空なら OK)
 */
export function validateJob(j) {
  const errors = []
  const L = JOB_LIMITS
  if (!j || typeof j !== 'object') return ['求人の内容が読み取れません。']
  if (typeof j.open !== 'boolean') errors.push('募集中かどうかが読み取れません。')
  if (j.openedAt !== undefined && !isIsoDate(j.openedAt)) errors.push('募集を始めた日は YYYY-MM-DD の正しい日付で入力してください。')
  const types = Array.isArray(j.employmentType) ? j.employmentType : []
  if (types.length < 1) errors.push('雇用形態を 1 つ以上選んでください。')
  if (types.some((t) => !EMPLOYMENT_KEYS.has(t))) errors.push('雇用形態に知らない値があります。')
  if (j.salary) {
    const s = j.salary
    if (!SALARY_CURRENCIES.includes(s.currency)) errors.push('給与の通貨は JPY・USD・EUR から選んでください。')
    if (!UNIT_KEYS.has(s.unit)) errors.push('給与の単位が読み取れません。')
    if (s.min === undefined) errors.push('給与の下限を入力してください(上限だけは入れられません)。')
    for (const [label, v] of [['下限', s.min], ['上限', s.max]]) {
      if (v !== undefined && !(typeof v === 'number' && v > 0 && v <= L.salaryMax)) errors.push(`給与の${label}は正の数で入力してください。`)
    }
    if (typeof s.min === 'number' && typeof s.max === 'number' && s.max < s.min) errors.push('給与の上限は下限以上にしてください。')
  }
  if ((j.salaryNote ?? '').length > L.noteMax) errors.push(`給与の補足は ${L.noteMax} 文字以内で入力してください。`)
  const loc = j.location && typeof j.location === 'object' ? j.location : {}
  if (!/^[A-Z]{2}$/.test(loc.country ?? '')) errors.push('勤務地の国は 2 文字の国コード(例 JP)で入力してください。')
  if (!loc.region) errors.push('勤務地の都道府県を入力してください。')
  if (!loc.locality) errors.push('勤務地の市区町村を入力してください。')
  for (const k of ['region', 'locality', 'street', 'postalCode']) {
    if ((loc[k] ?? '').length > L.addressPartMax) { errors.push(`勤務地の各欄は ${L.addressPartMax} 文字以内で入力してください。`); break }
  }
  if ((j.hours ?? '').length > L.hoursMax) errors.push(`勤務時間は ${L.hoursMax} 文字以内で入力してください。`)
  if ((j.requirements ?? '').length > L.requirementsMax) errors.push(`応募資格は ${L.requirementsMax} 文字以内で入力してください。`)
  if ((j.benefits ?? '').length > L.benefitsMax) errors.push(`待遇は ${L.benefitsMax} 文字以内で入力してください。`)
  if ((j.openings ?? '').length > L.openingsMax) errors.push(`募集人数は ${L.openingsMax} 文字以内で入力してください。`)
  if ((j.contact ?? '').length > L.contactMax) errors.push(`問い合わせ先は ${L.contactMax} 文字以内で入力してください。`)
  if (j.validThrough !== undefined) {
    if (!isIsoDate(j.validThrough)) errors.push('掲載期限は YYYY-MM-DD の正しい日付で入力してください。')
    else if (j.openedAt && isIsoDate(j.openedAt) && j.validThrough < j.openedAt) errors.push('掲載期限は募集を始めた日以後にしてください。')
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

export function employmentLabels(j) {
  const names = new Map(EMPLOYMENT_TYPES)
  return (Array.isArray(j?.employmentType) ? j.employmentType : []).map((k) => names.get(k) ?? k)
}

function money(n, currency) {
  if (currency === 'JPY') {
    if (n >= 10000 && n % 10000 === 0) return `${(n / 10000).toLocaleString('ja-JP')}万円`
    if (n >= 10000 && n % 1000 === 0) return `${(n / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`
    return `${n.toLocaleString('ja-JP')}円`
  }
  return `${n.toLocaleString('en-US')} ${currency}`
}

/** 「時給 1,500円〜」「月給 20万円〜25万円」。給与が無ければ空。 */
export function formatSalary(j) {
  const s = j?.salary
  if (!s || typeof s.min !== 'number') return ''
  const unit = new Map(SALARY_UNITS).get(s.unit) ?? ''
  const range = typeof s.max === 'number' && s.max !== s.min
    ? `${money(s.min, s.currency)}〜${money(s.max, s.currency)}`
    : typeof s.max === 'number' ? money(s.min, s.currency) : `${money(s.min, s.currency)}〜`
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

/** 「〒277-0825 千葉県柏市布施138-5」 */
export function formatLocation(j) {
  const l = j?.location ?? {}
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
 * @param {{today?: string}} [opt] 公開ページの作成日(サイトの時計)。渡すと期限を過ぎた求人を「募集していません」と出す
 */
export function renderJobPreview(j, opt = {}) {
  const open = jobIsOpen(j, opt.today)
  const rows = []
  const row = (k, v) => rows.push(`<tr><th>${_escapeHtml(k)}</th><td>${v}</td></tr>`)
  const types = employmentLabels(j)
  if (types.length) row('雇用形態', _escapeHtml(types.join('・')))
  const sal = formatSalary(j)
  if (sal || j.salaryNote) row('給与', [_escapeHtml(sal), j.salaryNote ? multiline(j.salaryNote) : ''].filter(Boolean).join('<br>'))
  const loc = formatLocation(j)
  if (loc) row('勤務地', _escapeHtml(loc))
  if (j.hours) row('勤務時間', multiline(j.hours))
  if (j.requirements) row('応募資格', multiline(j.requirements))
  if (j.benefits) row('待遇', multiline(j.benefits))
  if (j.openings) row('募集人数', multiline(j.openings))
  if (j.contact) row('問い合わせ', multiline(j.contact))
  if (j.validThrough) row('掲載期限', _escapeHtml(j.validThrough.replace(/-/g, '/')))
  return `<div class="kuro-job__head">` +
      `<span class="kuro-job__label">求人</span>` +
      `<span class="kuro-job__state kuro-job__state--${open ? 'open' : 'closed'}">${open ? '募集中' : '現在は募集していません'}</span>` +
    `</div>` +
    `<table class="kuro-job__table"><tbody>${rows.join('')}</tbody></table>`
}

/** JobCard ブロック 1 個ぶんの HTML(保存形式)。 */
export function buildJobCardHtml(j, opt = {}) {
  return `<div data-kuro-block="${JOB_BLOCK}"` +
    ` data-job-version="${JOB_VERSION}"` +
    ` data-job="${encodeJob(j)}"` +
    ` contenteditable="false" role="group" aria-label="求人カード">` +
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
