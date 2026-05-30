#!/usr/bin/env node
/**
 * bump.js — version incrementer for KuroEditor
 *
 * Single source of truth: root/VERSION  (format: KUROEDITOR_VERSION=x.y.z)
 *
 * Keeps these files in sync on every run:
 *   1. VERSION          → KUROEDITOR_VERSION=x.y.z
 *   2. package.json     → "version" field
 *   3. src/editor.js    → export const VERSION = 'x.y.z'
 *
 * Usage:
 *   node scripts/bump.js           # patch  0.3.1 → 0.3.2
 *   node scripts/bump.js minor     # minor  0.3.1 → 0.4.0
 *   node scripts/bump.js major     # major  0.3.1 → 1.0.0
 *   node scripts/bump.js sync      # sync only — no increment (fixes drift between files)
 *
 * npm aliases (package.json):
 *   npm run bup           → patch
 *   npm run bup:minor     → minor
 *   npm run bup:major     → major
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

// ── 1. Read canonical version from root/VERSION ───────────────────────────────
const versionFilePath = resolve(root, 'VERSION')
const versionFileText = readFileSync(versionFilePath, 'utf8').trim()
const vfMatch = versionFileText.match(/^KUROEDITOR_VERSION=(\d+\.\d+\.\d+)$/)
if (!vfMatch) {
  console.error(`⚠ VERSION file format unrecognised.\n  Expected: KUROEDITOR_VERSION=x.y.z\n  Got:      ${versionFileText}`)
  process.exit(1)
}

let [major, minor, patch] = vfMatch[1].split('.').map(Number)
const prev = vfMatch[1]

// ── 2. Increment ──────────────────────────────────────────────────────────────
const bump = process.argv[2] ?? 'patch'
if      (bump === 'major') { major++; minor = 0; patch = 0 }
else if (bump === 'minor') {          minor++;    patch = 0 }
else if (bump === 'patch') {                      patch++   }
else if (bump === 'sync')  { /* no increment — just sync */ }
else {
  console.error(`⚠ Unknown bump type: "${bump}". Use patch | minor | major | sync.`)
  process.exit(1)
}

const next = `${major}.${minor}.${patch}`

// ── 3. Write VERSION file ─────────────────────────────────────────────────────
writeFileSync(versionFilePath, `KUROEDITOR_VERSION=${next}\n`)

// ── 4. Write package.json ─────────────────────────────────────────────────────
const pkgPath = resolve(root, 'package.json')
const pkg     = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.version   = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// ── 5. Write src/editor.js VERSION constant ───────────────────────────────────
const editorPath = resolve(root, 'src', 'editor.js')
const src        = readFileSync(editorPath, 'utf8')
const updated    = src.replace(
  /^export const VERSION = '[^']*'/m,
  `export const VERSION = '${next}'`,
)
if (updated === src) {
  console.error('⚠ Could not find VERSION constant in src/editor.js — update manually.')
  process.exit(1)
}
writeFileSync(editorPath, updated)

console.log(`✓ ${pkg.name}  ${prev} → ${next}`)
console.log(`  VERSION        KUROEDITOR_VERSION=${next}`)
console.log(`  package.json   "version": "${next}"`)
console.log(`  src/editor.js  export const VERSION = '${next}'`)

// ── 6. Git commit (no push — remote may not be configured) ───────────────────
const label = bump === 'sync' ? `sync version to ${next}` : `bump version ${prev} → ${next}`
try {
  execSync('git add VERSION package.json src/editor.js', { cwd: root, stdio: 'inherit' })
  execSync(`git commit -m "chore: ${label}"`, { cwd: root, stdio: 'inherit' })
  console.log('✓ Committed')
} catch (e) {
  // Not fatal — files are already written correctly
  console.warn('⚠ git commit skipped (nothing to commit or error):', e.message.split('\n')[0])
}
