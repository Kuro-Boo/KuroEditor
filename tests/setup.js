/**
 * Global test setup for KuroEditor
 * Uses happy-dom (set in vite.config.js → test.environment)
 */

// Stub execCommand — not implemented in happy-dom
document.execCommand = vi.fn(() => true)
document.queryCommandState = vi.fn(() => false)

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
