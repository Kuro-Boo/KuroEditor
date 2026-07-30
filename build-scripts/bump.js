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
 *   node build-scripts/bump.js           # patch  0.3.1 → 0.3.2
 *   node build-scripts/bump.js minor     # minor  0.3.1 → 0.4.0
 *   node build-scripts/bump.js major     # major  0.3.1 → 1.0.0
 *   node build-scripts/bump.js sync      # sync only — no increment (fixes drift between files)
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
if (updated === src && bump !== 'sync') {
  console.error('⚠ Could not find VERSION constant in src/editor.js — update manually.')
  process.exit(1)
}
writeFileSync(editorPath, updated)

// ── 6. Write public/sample/index.html ?v= cache-buster ───────────────────────
const samplePath = resolve(root, 'public', 'sample', 'index.html')
const sampleSrc  = readFileSync(samplePath, 'utf8')
const sampleUpd  = sampleSrc
  .replace(/(href="\.\.\/kuro-editor\.css)(?:\?v=[^"]*)?(")/g, `$1?v=${next}$2`)
  .replace(/(src="\.\.\/kuro-editor\.js)(?:\?v=[^"]*)?(")/g,  `$1?v=${next}$2`)
writeFileSync(samplePath, sampleUpd)

// ── 7. Write public/index.html hero.badge version (all languages) ─────────────
const promoPath = resolve(root, 'public', 'index.html')
const promoSrc  = readFileSync(promoPath, 'utf8')
const promoUpd  = promoSrc.replace(/v\d+\.\d+\.\d+( — )/g, `v${next}$1`)
writeFileSync(promoPath, promoUpd)

console.log(`✓ ${pkg.name}  ${prev} → ${next}`)
console.log(`  VERSION        KUROEDITOR_VERSION=${next}`)
console.log(`  package.json   "version": "${next}"`)
console.log(`  src/editor.js  export const VERSION = '${next}'`)
console.log(`  sample/index   ?v=${next}`)
console.log(`  public/index   hero.badge v${next}`)

// ── 8. Git commit (no push — remote may not be configured) ───────────────────
const label = bump === 'sync' ? `sync version to ${next}` : `bump version ${prev} → ${next}`
try {
  // Stage the version-sync files PLUS the active editor source (editor.js +
  // the stylesheets editor.css / content.css) PLUS the READMEs PLUS tests/,
  // so a normal "edit code+tests → npm run bup" flow commits the whole change
  // together with the bump in one release commit. tests/ is a directory add
  // (new test files ride along too) — 以前はリスト外で、リリース時に毎回
  // 「deploy 前ガードで中断 → 手で別コミット → 再実行(版がもう1つ進む)」に
  // なっていた。
  execSync('git add VERSION package.json src/editor.js src/blocks.js src/kuro-links.js src/kuro-links.d.ts src/normalize.js src/kuro-normalize.d.ts src/recipe.js src/kuro-blocks.d.ts src/editor.css src/content.css build-scripts/copy-assets.js build-scripts/bump.js public/sample/index.html public/index.html README.md README.ja.md tests', { cwd: root, stdio: 'inherit' })
  execSync(`git commit -m "chore: ${label}"`, { cwd: root, stdio: 'inherit' })
  console.log('✓ Committed')
} catch (e) {
  // Not fatal — files are already written correctly
  console.warn('⚠ git commit skipped (nothing to commit or error):', e.message.split('\n')[0])
}
