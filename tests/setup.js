/**
 * Global test setup for KuroEditor
 * Uses happy-dom (set in vite.config.js → test.environment)
 */

// Stub execCommand — not implemented in happy-dom
document.execCommand = vi.fn(() => true)
document.queryCommandState = vi.fn(() => false)
