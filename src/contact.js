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

/**
 * 本文の言語(仕様 editor-editor-spec-contact・#spec-i18n): Entamy の 11 言語。公開ページのフォーム・送った方への
 * 誤りの文・送信の案内は頁の言語で出す。空は日本語(今までの本文)、11 言語に無いものは英語。
 */
export function contactLang(lang) {
  const v = typeof lang === 'string' ? lang.trim().toLowerCase() : ''
  if (!v) return 'ja'
  const base = v.split(/[-_]/)[0]
  return base in CONTACT_TEXT ? base : 'en'
}

/**
 * 文。kinds は項目の種類の既定の名前(FIELD_KINDS の並び)。{label}・{max} は差し込み。
 * client はブラウザで出す案内(公開ページのフォームに data-messages として載せる)。
 */
const CONTACT_TEXT = {
  ja: {
    card: '問い合わせフォーム', tag: 'フォーム', required: '必須', choose: '選んでください', trap: '空のままにしてください', nojs: 'このフォームを送るには JavaScript を有効にしてください。',
    submit: '送信する', done: '送信しました。担当者からご連絡します。', subject: 'お問い合わせ', inquiry: 'お問い合わせ内容', closed: '現在、このフォームではお問い合わせを受け付けていません。',
    kinds: ['お名前', 'ふりがな', 'メールアドレス', '電話番号', '郵便番号', '住所', '日付', '選択', '1 行の文', '複数行の文'],
    errRequired: '{label}を入力してください。', errMax: '{label}は {max} 文字以内で入力してください。', errEmail: 'メールアドレスの形が正しくありません。', errTel: '電話番号の形が正しくありません。', errPostal: '郵便番号は 7 桁で入力してください。', errDate: '日付の形が正しくありません。', errSelect: '{label}は選択肢から選んでください。',
    client: { fieldRequired: '入力してください。', missing: '入力していない項目があります。', sending: '送信しています…', check: '入力を確かめてください。', busy: '送信が続いたため、しばらく受け付けられません。時間をおいてお試しください。', closed: '現在、このフォームではお問い合わせを受け付けていません。', failed: '送信できませんでした。時間をおいてもう一度お試しください。' },
  },
  en: {
    card: 'Contact form', tag: 'Form', required: 'Required', choose: 'Please choose', trap: 'Leave this empty', nojs: 'Please enable JavaScript to send this form.',
    submit: 'Send', done: 'Thank you. We will get back to you.', subject: 'Contact', inquiry: 'Message', closed: 'This form is not accepting messages at the moment.',
    kinds: ['Name', 'Name reading', 'Email', 'Phone', 'Postal code', 'Address', 'Date', 'Choice', 'Text', 'Message'],
    errRequired: 'Please enter {label}.', errMax: 'Keep {label} within {max} characters.', errEmail: 'The email address is not valid.', errTel: 'The phone number is not valid.', errPostal: 'Enter the postal code as 7 digits.', errDate: 'The date is not valid.', errSelect: 'Choose {label} from the options.',
    client: { fieldRequired: 'Please fill this in.', missing: 'Some fields are not filled in.', sending: 'Sending…', check: 'Please check your entries.', busy: 'Too many messages were sent. Please try again later.', closed: 'This form is not accepting messages at the moment.', failed: 'The message could not be sent. Please try again later.' },
  },
  fr: {
    card: 'Formulaire de contact', tag: 'Formulaire', required: 'Obligatoire', choose: 'Veuillez choisir', trap: 'Laissez ce champ vide', nojs: 'Activez JavaScript pour envoyer ce formulaire.',
    submit: 'Envoyer', done: 'Merci. Nous vous répondrons prochainement.', subject: 'Contact', inquiry: 'Message', closed: 'Ce formulaire n’accepte pas de messages pour le moment.',
    kinds: ['Nom', 'Lecture du nom', 'E-mail', 'Téléphone', 'Code postal', 'Adresse', 'Date', 'Choix', 'Texte', 'Message'],
    errRequired: 'Veuillez saisir : {label}.', errMax: '{label} : {max} caractères au maximum.', errEmail: 'L’adresse e-mail n’est pas valide.', errTel: 'Le numéro de téléphone n’est pas valide.', errPostal: 'Saisissez le code postal sur 7 chiffres.', errDate: 'La date n’est pas valide.', errSelect: '{label} : choisissez parmi les options.',
    client: { fieldRequired: 'Veuillez remplir ce champ.', missing: 'Certains champs ne sont pas remplis.', sending: 'Envoi en cours…', check: 'Veuillez vérifier votre saisie.', busy: 'Trop de messages ont été envoyés. Réessayez plus tard.', closed: 'Ce formulaire n’accepte pas de messages pour le moment.', failed: 'Le message n’a pas pu être envoyé. Réessayez plus tard.' },
  },
  it: {
    card: 'Modulo di contatto', tag: 'Modulo', required: 'Obbligatorio', choose: 'Scegli', trap: 'Lascia vuoto questo campo', nojs: 'Attiva JavaScript per inviare questo modulo.',
    submit: 'Invia', done: 'Grazie. Ti risponderemo al più presto.', subject: 'Contatto', inquiry: 'Messaggio', closed: 'Al momento questo modulo non accetta messaggi.',
    kinds: ['Nome', 'Lettura del nome', 'E-mail', 'Telefono', 'CAP', 'Indirizzo', 'Data', 'Scelta', 'Testo', 'Messaggio'],
    errRequired: 'Inserisci: {label}.', errMax: '{label}: al massimo {max} caratteri.', errEmail: 'L’indirizzo e-mail non è valido.', errTel: 'Il numero di telefono non è valido.', errPostal: 'Inserisci il CAP di 7 cifre.', errDate: 'La data non è valida.', errSelect: '{label}: scegli tra le opzioni.',
    client: { fieldRequired: 'Compila questo campo.', missing: 'Alcuni campi non sono compilati.', sending: 'Invio in corso…', check: 'Controlla i dati inseriti.', busy: 'Sono stati inviati troppi messaggi. Riprova più tardi.', closed: 'Al momento questo modulo non accetta messaggi.', failed: 'Impossibile inviare il messaggio. Riprova più tardi.' },
  },
  es: {
    card: 'Formulario de contacto', tag: 'Formulario', required: 'Obligatorio', choose: 'Elige una opción', trap: 'Deja este campo vacío', nojs: 'Activa JavaScript para enviar este formulario.',
    submit: 'Enviar', done: 'Gracias. Te responderemos pronto.', subject: 'Contacto', inquiry: 'Mensaje', closed: 'Este formulario no admite mensajes en este momento.',
    kinds: ['Nombre', 'Lectura del nombre', 'Correo electrónico', 'Teléfono', 'Código postal', 'Dirección', 'Fecha', 'Opción', 'Texto', 'Mensaje'],
    errRequired: 'Introduce: {label}.', errMax: '{label}: como máximo {max} caracteres.', errEmail: 'El correo electrónico no es válido.', errTel: 'El número de teléfono no es válido.', errPostal: 'Introduce el código postal de 7 dígitos.', errDate: 'La fecha no es válida.', errSelect: '{label}: elige entre las opciones.',
    client: { fieldRequired: 'Rellena este campo.', missing: 'Hay campos sin rellenar.', sending: 'Enviando…', check: 'Revisa los datos introducidos.', busy: 'Se han enviado demasiados mensajes. Inténtalo más tarde.', closed: 'Este formulario no admite mensajes en este momento.', failed: 'No se pudo enviar el mensaje. Inténtalo más tarde.' },
  },
  zh: {
    card: '咨询表单', tag: '表单', required: '必填', choose: '请选择', trap: '请留空', nojs: '要发送此表单，请启用 JavaScript。',
    submit: '发送', done: '已发送。我们会尽快与您联系。', subject: '咨询', inquiry: '咨询内容', closed: '此表单目前不接受咨询。',
    kinds: ['姓名', '姓名读音', '电子邮箱', '电话号码', '邮政编码', '地址', '日期', '选择', '单行文字', '多行文字'],
    errRequired: '请输入{label}。', errMax: '{label}请控制在 {max} 个字符以内。', errEmail: '电子邮箱格式不正确。', errTel: '电话号码格式不正确。', errPostal: '请输入 7 位邮政编码。', errDate: '日期格式不正确。', errSelect: '请从选项中选择{label}。',
    client: { fieldRequired: '请填写。', missing: '有未填写的项目。', sending: '正在发送…', check: '请检查填写内容。', busy: '发送过于频繁，暂时无法受理。请稍后再试。', closed: '此表单目前不接受咨询。', failed: '发送失败。请稍后再试。' },
  },
  ko: {
    card: '문의 양식', tag: '양식', required: '필수', choose: '선택하세요', trap: '비워 두세요', nojs: '이 양식을 보내려면 JavaScript를 켜 주세요.',
    submit: '보내기', done: '보냈습니다. 담당자가 연락드리겠습니다.', subject: '문의', inquiry: '문의 내용', closed: '현재 이 양식에서는 문의를 받지 않습니다.',
    kinds: ['이름', '이름 읽는 법', '이메일 주소', '전화번호', '우편번호', '주소', '날짜', '선택', '한 줄 텍스트', '여러 줄 텍스트'],
    errRequired: '{label}을(를) 입력하세요.', errMax: '{label}은(는) {max}자 이내로 입력하세요.', errEmail: '이메일 주소 형식이 올바르지 않습니다.', errTel: '전화번호 형식이 올바르지 않습니다.', errPostal: '우편번호는 7자리로 입력하세요.', errDate: '날짜 형식이 올바르지 않습니다.', errSelect: '{label}은(는) 선택지에서 고르세요.',
    client: { fieldRequired: '입력하세요.', missing: '입력하지 않은 항목이 있습니다.', sending: '보내는 중…', check: '입력 내용을 확인하세요.', busy: '전송이 계속되어 잠시 받을 수 없습니다. 잠시 후 다시 시도하세요.', closed: '현재 이 양식에서는 문의를 받지 않습니다.', failed: '보내지 못했습니다. 잠시 후 다시 시도하세요.' },
  },
  uk: {
    card: 'Контактна форма', tag: 'Форма', required: 'Обов’язково', choose: 'Виберіть', trap: 'Залиште це поле порожнім', nojs: 'Щоб надіслати цю форму, увімкніть JavaScript.',
    submit: 'Надіслати', done: 'Дякуємо. Ми зв’яжемося з вами.', subject: 'Звернення', inquiry: 'Повідомлення', closed: 'Наразі ця форма не приймає повідомлень.',
    kinds: ['Ім’я', 'Читання імені', 'Ел. пошта', 'Телефон', 'Поштовий індекс', 'Адреса', 'Дата', 'Вибір', 'Текст', 'Повідомлення'],
    errRequired: 'Заповніть поле «{label}».', errMax: 'Поле «{label}» має містити не більше {max} символів.', errEmail: 'Адреса ел. пошти неправильна.', errTel: 'Номер телефону неправильний.', errPostal: 'Введіть поштовий індекс із 7 цифр.', errDate: 'Дата неправильна.', errSelect: 'Виберіть «{label}» зі списку.',
    client: { fieldRequired: 'Заповніть це поле.', missing: 'Деякі поля не заповнено.', sending: 'Надсилання…', check: 'Перевірте введені дані.', busy: 'Надіслано забагато повідомлень. Спробуйте пізніше.', closed: 'Наразі ця форма не приймає повідомлень.', failed: 'Не вдалося надіслати. Спробуйте пізніше.' },
  },
  de: {
    card: 'Kontaktformular', tag: 'Formular', required: 'Pflichtfeld', choose: 'Bitte wählen', trap: 'Dieses Feld leer lassen', nojs: 'Bitte aktivieren Sie JavaScript, um dieses Formular zu senden.',
    submit: 'Senden', done: 'Vielen Dank. Wir melden uns bei Ihnen.', subject: 'Kontakt', inquiry: 'Nachricht', closed: 'Dieses Formular nimmt derzeit keine Nachrichten an.',
    kinds: ['Name', 'Lesung des Namens', 'E-Mail', 'Telefon', 'Postleitzahl', 'Adresse', 'Datum', 'Auswahl', 'Text', 'Nachricht'],
    errRequired: 'Bitte ausfüllen: {label}.', errMax: '{label}: höchstens {max} Zeichen.', errEmail: 'Die E-Mail-Adresse ist ungültig.', errTel: 'Die Telefonnummer ist ungültig.', errPostal: 'Geben Sie die Postleitzahl mit 7 Ziffern ein.', errDate: 'Das Datum ist ungültig.', errSelect: '{label}: bitte aus den Optionen wählen.',
    client: { fieldRequired: 'Bitte ausfüllen.', missing: 'Einige Felder sind nicht ausgefüllt.', sending: 'Wird gesendet…', check: 'Bitte prüfen Sie Ihre Eingaben.', busy: 'Es wurden zu viele Nachrichten gesendet. Bitte später erneut versuchen.', closed: 'Dieses Formular nimmt derzeit keine Nachrichten an.', failed: 'Die Nachricht konnte nicht gesendet werden. Bitte später erneut versuchen.' },
  },
  pt: {
    card: 'Formulário de contato', tag: 'Formulário', required: 'Obrigatório', choose: 'Escolha', trap: 'Deixe este campo vazio', nojs: 'Ative o JavaScript para enviar este formulário.',
    submit: 'Enviar', done: 'Obrigado. Entraremos em contato.', subject: 'Contato', inquiry: 'Mensagem', closed: 'Este formulário não está aceitando mensagens no momento.',
    kinds: ['Nome', 'Leitura do nome', 'E-mail', 'Telefone', 'Código postal', 'Endereço', 'Data', 'Escolha', 'Texto', 'Mensagem'],
    errRequired: 'Preencha: {label}.', errMax: '{label}: no máximo {max} caracteres.', errEmail: 'O e-mail não é válido.', errTel: 'O telefone não é válido.', errPostal: 'Digite o código postal com 7 dígitos.', errDate: 'A data não é válida.', errSelect: '{label}: escolha entre as opções.',
    client: { fieldRequired: 'Preencha este campo.', missing: 'Há campos não preenchidos.', sending: 'Enviando…', check: 'Verifique os dados informados.', busy: 'Muitas mensagens foram enviadas. Tente novamente mais tarde.', closed: 'Este formulário não está aceitando mensagens no momento.', failed: 'Não foi possível enviar. Tente novamente mais tarde.' },
  },
  ar: {
    card: 'نموذج تواصل', tag: 'نموذج', required: 'إلزامي', choose: 'اختر', trap: 'اترك هذا الحقل فارغًا', nojs: 'فعّل JavaScript لإرسال هذا النموذج.',
    submit: 'إرسال', done: 'شكرًا لك. سنتواصل معك قريبًا.', subject: 'تواصل', inquiry: 'الرسالة', closed: 'لا يستقبل هذا النموذج رسائل حاليًا.',
    kinds: ['الاسم', 'قراءة الاسم', 'البريد الإلكتروني', 'الهاتف', 'الرمز البريدي', 'العنوان', 'التاريخ', 'اختيار', 'نص', 'الرسالة'],
    errRequired: 'أدخل {label}.', errMax: 'يجب ألا يتجاوز {label} عدد {max} حرفًا.', errEmail: 'البريد الإلكتروني غير صحيح.', errTel: 'رقم الهاتف غير صحيح.', errPostal: 'أدخل الرمز البريدي من 7 أرقام.', errDate: 'التاريخ غير صحيح.', errSelect: 'اختر {label} من الخيارات.',
    client: { fieldRequired: 'املأ هذا الحقل.', missing: 'هناك حقول لم تُملأ.', sending: 'جارٍ الإرسال…', check: 'تحقّق من البيانات المدخلة.', busy: 'أُرسلت رسائل كثيرة. حاول مرة أخرى لاحقًا.', closed: 'لا يستقبل هذا النموذج رسائل حاليًا.', failed: 'تعذّر الإرسال. حاول مرة أخرى لاحقًا.' },
  },
}

const fillText = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] === undefined ? m : String(v[k])))

/** 文の表(言語ごと)。ホストが公開ページの文(受け付けていない旨など)に使う。 */
export function contactText(lang) {
  return CONTACT_TEXT[contactLang(lang)]
}

/** 項目の種類の既定の名前(本文の言語)。 */
export function fieldKindLabel(kind, lang) {
  const i = FIELD_KINDS.findIndex(([k]) => k === kind)
  return i < 0 ? '' : CONTACT_TEXT[contactLang(lang)].kinds[i]
}

/** 公開ページのフォームのボタンと送信後の文の既定(本文の言語)。 */
export function contactDefaults(lang) {
  const T = CONTACT_TEXT[contactLang(lang)]
  return { submitLabel: T.submit, doneMessage: T.done }
}


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

/** 誤りの文(日本語)。エディタは画面の辞書の contactErr.<鍵> で引き直す(#spec-i18n)。 */
const CONTACT_FORM_ERRORS = {
  unreadable: 'フォームの内容が読み取れません。',
  subject: '件名を入力してください。',
  subjectMax: '件名は {max} 文字以内で入力してください。',
  fieldsMin: '項目を 1 つ以上置いてください。',
  fieldsMax: '項目は {max} 個までです。',
  fieldKind: '{n} 番目の項目の種類が読み取れません。',
  fieldLabel: '{n} 番目の項目の名前を入力してください。',
  fieldLabelMax: '{n} 番目の項目の名前は {max} 文字以内で入力してください。',
  optionsCount: '{n} 番目の項目の選択肢は 1〜{max} 個で入力してください。',
  optionMax: '{n} 番目の項目の選択肢は 1 つ {max} 文字以内で入力してください。',
  reply: '返事ができるよう、メールアドレスか電話番号の項目を 1 つ以上置いてください。',
  submitMax: 'ボタンの文は {max} 文字以内で入力してください。',
  doneMax: '送信後の文は {max} 文字以内で入力してください。',
  noteMax: '案内の文は {max} 文字以内で入力してください。',
  toMax: '送り先は {max} か所までです。',
  toName: '送り先の名前が読み取れません。',
}

/**
 * 保存してよい形か。正規化済みを渡す。
 * @param {(key: string, vars?: object) => string} [tr] 文を作る関数(省くと日本語)
 */
export function validateContactForm(c, tr) {
  const errors = []
  const L = CONTACT_LIMITS
  const msg = (key, vars) => tr ? tr(key, vars) : CONTACT_FORM_ERRORS[key].replace(/\{(\w+)\}/g, (m, k) => String(vars?.[k] ?? m))
  const e = (key, vars) => errors.push(msg(key, vars))
  if (!c || typeof c !== 'object') return [msg('unreadable')]
  if (!c.subject) e('subject')
  else if (c.subject.length > L.subjectMax) e('subjectMax', { max: L.subjectMax })
  const fields = Array.isArray(c.fields) ? c.fields : []
  if (fields.length < 1) e('fieldsMin')
  if (fields.length > L.fieldsMax) e('fieldsMax', { max: L.fieldsMax })
  fields.forEach((f, i) => {
    const n = i + 1
    if (!KIND_KEYS.has(f.kind)) e('fieldKind', { n })
    if (!f.label) e('fieldLabel', { n })
    else if (f.label.length > L.labelMax) e('fieldLabelMax', { n, max: L.labelMax })
    if (f.kind === 'select') {
      const o = f.options ?? []
      if (o.length < 1 || o.length > L.optionsMax) e('optionsCount', { n, max: L.optionsMax })
      if (o.some((x) => x.length > L.optionMax)) e('optionMax', { n, max: L.optionMax })
    }
  })
  if (!fields.some((f) => f.kind === 'email' || f.kind === 'tel')) e('reply')
  if ((c.submitLabel ?? '').length > L.submitMax) e('submitMax', { max: L.submitMax })
  if ((c.doneMessage ?? '').length > L.doneMax) e('doneMax', { max: L.doneMax })
  if ((c.note ?? '').length > L.noteMax) e('noteMax', { max: L.noteMax })
  const to = Array.isArray(c.to) ? c.to : []
  if (to.length > L.toMax) e('toMax', { max: L.toMax })
  if (to.some((x) => !RECIPIENT_NAME_RE.test(x))) e('toName')
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
function fieldHtml(f, i, live, T) {
  const id = `kc-f${i}`
  const req = f.required ? `<span class="kuro-contact__req">${_escapeHtml(T.required)}</span>` : ''
  const dis = live ? '' : ' disabled tabindex="-1"'
  const reqAttr = live && f.required ? ' required' : ''
  const name = live ? ` name="f${i}" id="${id}"` : ''
  let control
  if (f.kind === 'textarea') {
    control = `<textarea class="kuro-contact__input" rows="5" maxlength="${CONTACT_LIMITS.textareaMax}"${name}${reqAttr}${dis}></textarea>`
  } else if (f.kind === 'select') {
    const opts = (f.options ?? []).map((o) => `<option>${_escapeHtml(o)}</option>`).join('')
    control = `<select class="kuro-contact__input"${name}${reqAttr}${dis}><option value="">${_escapeHtml(T.choose)}</option>${opts}</select>`
  } else {
    const ac = AUTOCOMPLETE[f.kind] ? ` autocomplete="${AUTOCOMPLETE[f.kind]}"` : ''
    control = `<input class="kuro-contact__input" type="${INPUT_TYPE[f.kind] ?? 'text'}" maxlength="${CONTACT_LIMITS.valueMax}"${ac}${name}${reqAttr}${dis}>`
  }
  const forAttr = live ? ` for="${id}"` : ''
  return `<div class="kuro-contact__row"><label class="kuro-contact__label"${forAttr}>${_escapeHtml(f.label)}${req}</label>${control}</div>`
}

function bodyHtml(c, live, T) {
  const note = c.note ? `<p class="kuro-contact__note">${_escapeHtml(c.note).replace(/\r?\n/g, '<br>')}</p>` : ''
  const rows = c.fields.map((f, i) => fieldHtml(f, i, live, T)).join('')
  const btn = `<button type="${live ? 'submit' : 'button'}" class="kuro-contact__submit"${live ? '' : ' disabled tabindex="-1"'}>${_escapeHtml(c.submitLabel || T.submit)}</button>`
  return `<div class="kuro-contact__head"><span class="kuro-contact__label-tag">${_escapeHtml(T.tag)}</span><span class="kuro-contact__subject">${_escapeHtml(c.subject)}</span></div>${note}${rows}<div class="kuro-contact__actions">${btn}</div>`
}

/** エディタのプレビュー(押せない見本)の内側 HTML。opt.lang = 本文の言語。 */
export function renderContactPreview(c, opt = {}) {
  return bodyHtml(c, false, CONTACT_TEXT[contactLang(opt.lang)])
}

/** ContactForm ブロック 1 個ぶんの HTML(保存形式)。 */
export function buildContactCardHtml(c, opt = {}) {
  return `<div data-kuro-block="${CONTACT_BLOCK}"` +
    ` data-contact-version="${CONTACT_VERSION}"` +
    ` data-contact="${encodeContactForm(c)}"` +
    ` contenteditable="false" role="group" aria-label="${_escapeHtml(CONTACT_TEXT[contactLang(opt.lang)].card)}">` +
    renderContactPreview(c, opt) +
    `</div>`
}

/**
 * 公開ページの本物のフォーム。ホストが公開のときに作る。
 * @param {object} c 正規化・検証済みの形
 * @param {{ form: string, sig: string, endpoint: string, lang?: string }} host 署名した形(base64url)・署名・送り先の根(自分のサイト)・頁の言語
 *   ブラウザで出す案内(送信中・誤りなど)は data-messages に載せ、送るときに頁の言語(data-lang)を添えさせる。
 */
export function renderContactFormHtml(c, host) {
  const lang = contactLang(host.lang)
  const T = CONTACT_TEXT[lang]
  const done = _escapeHtml(c.doneMessage || T.done)
  return `<form class="kuro-contact kuro-contact--live" data-kuro-contact="1" novalidate` +
    ` data-form="${_escapeHtml(host.form)}" data-sig="${_escapeHtml(host.sig)}" data-endpoint="${_escapeHtml(host.endpoint)}"` +
    ` data-lang="${lang}" data-messages="${_escapeHtml(JSON.stringify(T.client))}">` +
    bodyHtml(c, true, T) +
    // 罠の欄(人には見えない。値があればロボット)
    `<div class="kuro-contact__trap" aria-hidden="true"><label>${_escapeHtml(T.trap)}<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>` +
    `<p class="kuro-contact__status" role="status" aria-live="polite"></p>` +
    `<p class="kuro-contact__done" hidden>${done}</p>` +
    `<noscript><p class="kuro-contact__nojs">${_escapeHtml(T.nojs)}</p></noscript>` +
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
 * @param {string} [lang] 誤りの文の言語(頁の言語・空は日本語)
 * @returns {{ ok: boolean, errors: Record<string, string>, clean: {label: string, kind: string, value: string}[] }}
 */
export function validateSubmission(c, values, lang) {
  const T = CONTACT_TEXT[contactLang(lang)]
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
      if (f.required) errors[key] = fillText(T.errRequired, { label: f.label })
    } else if (v.length > max) {
      errors[key] = fillText(T.errMax, { label: f.label, max })
    } else if (f.kind === 'email' && !isEmail(v)) {
      errors[key] = T.errEmail
    } else if (f.kind === 'tel' && !TEL_RE.test(v)) {
      errors[key] = T.errTel
    } else if (f.kind === 'postal' && !POSTAL_RE.test(v)) {
      errors[key] = T.errPostal
    } else if (f.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      errors[key] = T.errDate
    } else if (f.kind === 'select' && !(f.options ?? []).includes(v)) {
      errors[key] = fillText(T.errSelect, { label: f.label })
    }
    clean.push({ label: f.label, kind: f.kind, value: v })
  })
  return { ok: Object.keys(errors).length === 0, errors, clean }
}

/** 新しく置くときの初期値(よく使う 4 項目・lang = 本文の言語)。 */
export function emptyContactForm(lang) {
  const T = CONTACT_TEXT[contactLang(lang)]
  return {
    version: CONTACT_VERSION,
    subject: T.subject,
    fields: [
      { kind: 'name', label: fieldKindLabel('name', lang), required: true },
      { kind: 'email', label: fieldKindLabel('email', lang), required: true },
      { kind: 'tel', label: fieldKindLabel('tel', lang), required: false },
      { kind: 'textarea', label: T.inquiry, required: true },
    ],
  }
}
