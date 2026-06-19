#!/usr/bin/env node
/**
 * emit-version.js — write dist/version.js exposing window.KUROEDITOR_VERSION
 * from the single source of truth (root/VERSION).
 *
 * The landing page (public/index.html) loads this tiny file so its version
 * badge is read from the repo at RUNTIME instead of being a hardcoded string.
 * Runs as part of `npm run build` (after vite build, which empties dist/).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ver = (readFileSync('VERSION', 'utf8').match(/[0-9]+\.[0-9]+\.[0-9]+/) || [''])[0]
writeFileSync('dist/version.js', `window.KUROEDITOR_VERSION=${JSON.stringify(ver)};\n`)
console.log(`  dist/version.js → ${ver}`)
