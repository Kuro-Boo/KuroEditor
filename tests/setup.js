/**
 * Global test setup for KuroEditor
 * Uses happy-dom (set in vite.config.js → test.environment)
 */

// Stub execCommand — not implemented in happy-dom
document.execCommand = vi.fn(() => true)
document.queryCommandState = vi.fn(() => false)

// ── 作った editor を必ず destroy する（全テストファイル共通） ───────────────
// destroy し忘れた editor は dirty 検知の setTimeout(_histTimer, 400ms) を抱えた
// まま生き延び、happy-dom の teardown 後に発火して「document is not defined」の
// 未処理例外になる。テスト自体は pass しているのに vitest が非ゼロ終了するので
// リリーススクリプトが止まる（実際に v2.20.5 のリリースが blockids.test.js の
// 残タイマーで中断した）。個々のテストに afterEach を書かせるのは漏れるので、
// 生成を prototype 側で捕まえて一括で片付ける。
//   _build() を使うのは「必ず 1 度だけ通るコンストラクタ経路」だから。
//   destroy() は既に destroy 済み / DOM を消された editor では投げうるので握る。
import { KuroEditor } from '../src/editor.js'

const _liveEditors = []
const _origBuild = KuroEditor.prototype._build
KuroEditor.prototype._build = function (...args) {
  _liveEditors.push(this)
  return _origBuild.apply(this, args)
}
afterEach(() => {
  while (_liveEditors.length) {
    try { _liveEditors.pop().destroy() } catch { /* 既に片付いた／DOM が無い */ }
  }
})

// Stub localStorage — happy-dom の window.localStorage は getItem 等が未実装。
// エディタ本体は try/catch で握り潰すが、テストから設定の保存/非保存を
// 検証できるよう in-memory 実装を差し込む。
if (typeof window.localStorage?.getItem !== 'function') {
  const store = new Map()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)) },
      removeItem: (k) => { store.delete(k) },
      clear: () => { store.clear() },
    },
  })
}
