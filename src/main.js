// v2 CSS architecture: editor2.css = editor UI (chrome) only; all CONTENT
// styling lives in content.css (imported by editor2.css), shared with the
// published page so the output is WYSIWYG. To fall back to the old monolithic
// stylesheet, change this import back to './editor.css'. See README.
import './editor2.css'
import { KuroEditor, VERSION } from './editor.js'

// Expose as globals so KuroCMS (and other embedders) can use KuroEditor after
// loading kuro-editor.js dynamically via <script>
window.KuroEditor = KuroEditor
window.KUROEDITOR_VERSION = VERSION

// ── Mock media store (mid → blob URL) ────────────────────────────────────────
// 実際の KuroCMS ではサーバーにアップロードして mid を返すが、
// デモ環境ではブラウザ内のマップで代替する。
const mediaStore = new Map()

// ── Mount ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // バージョンバッジ（ヘッダー右上）
  const versionEl = document.getElementById('kuro-version')
  if (versionEl) versionEl.textContent = `v${VERSION}`

  const mount = document.getElementById('kuro-editor-mount')
  if (!mount) return

  window._kuroEditor = new KuroEditor(mount, {

    initialContent: [
      '<p>KuroEditor 開発デモへようこそ。上のモーダルメニューから各機能をお試しください。</p>',
      '<p>🖼 メディアボタンでは <strong>URL 入力</strong>と<strong>ファイル選択</strong>が使えます。</p>',
    ].join(''),

    // ── slug / mid → 表示 URL ─────────────────────────────────────────────
    urlResolver(slug) {
      // ① mock store に mid がある → blob URL を返す
      if (mediaStore.has(slug)) return mediaStore.get(slug)
      // ② 外部 URL はそのまま
      if (slug.startsWith('http')) return slug
      // ③ mid-xxx 形式（store にない場合）→ プレースホルダー画像
      if (slug.startsWith('mid-')) return `https://placehold.co/600x400?text=${slug}`
      // ④ 記事 slug → /articles/ へ
      return `/articles/${slug}`
    },

    // ── 保存 ──────────────────────────────────────────────────────────────
    onSave(html) {
      console.log('[KuroEditor] 保存:', html)
      const el = document.getElementById('output')
      if (el) el.textContent = html
      showLog(`💾 保存しました (${new Date().toLocaleTimeString()})`)
    },

    // ── メディアアップロード（モック）────────────────────────────────────
    // 実際の KuroCMS では fetch('/api/media', { method:'POST', body: FormData }) する。
    // ここでは 1.5 秒の遅延後に mid を返し、ブラウザ内の map に blob URL を保存する。
    async onMediaUpload(file) {
      showLog(`⏳ アップロード中: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

      // サーバー通信のシミュレーション（1.5 秒待つ）
      await new Promise(r => setTimeout(r, 1500))

      // mid を発行して blob URL を紐づけ
      const mid    = `mid-${Math.random().toString(36).slice(2, 10)}`
      const blobUrl = URL.createObjectURL(file)
      mediaStore.set(mid, blobUrl)

      showLog(`✅ アップロード完了: ${file.name} → ${mid}`)
      addMediaLog(mid, file.name, blobUrl)
      return mid
    },

    autoSaveInterval: 60_000,
  })
})

// ── デバッグ UI ───────────────────────────────────────────────────────────────

function showLog(msg) {
  const el = document.getElementById('log')
  if (!el) return
  el.textContent = msg
  el.style.opacity = '1'
  clearTimeout(el._timer)
  el._timer = setTimeout(() => { el.style.opacity = '0' }, 3000)
}

function addMediaLog(mid, name, blobUrl) {
  const list = document.getElementById('media-list')
  if (!list) return
  const item = document.createElement('li')
  item.className = 'flex items-center gap-3 py-1.5 border-b border-neutral-800 text-xs'
  item.innerHTML = `
    <img src="${blobUrl}" alt="${name}"
         class="w-10 h-10 object-cover rounded border border-neutral-700 flex-shrink-0">
    <div class="min-w-0">
      <div class="text-neutral-200 font-mono truncate">${mid}</div>
      <div class="text-neutral-500 truncate">${name}</div>
    </div>
  `
  list.prepend(item)
  document.getElementById('media-section')?.classList.remove('hidden')
}

// Live preview of editor content
setInterval(() => {
  const ed  = window._kuroEditor
  const el  = document.getElementById('output')
  if (ed && el && document.getElementById('auto-preview')?.checked) {
    el.textContent = ed.getContent()
  }
}, 800)
