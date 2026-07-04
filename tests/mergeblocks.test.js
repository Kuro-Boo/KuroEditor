/**
 * splitTopLevelBlocks / mergeBlocks — string-based (DOM-free) block 3-way merge.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { splitTopLevelBlocks, mergeBlocks } from '../src/editor.js'

const P = (bid, text) => `<p data-bid="${bid}">${text}</p>`

// ─── splitTopLevelBlocks ──────────────────────────────────────────────────────

describe('splitTopLevelBlocks', () => {
  it('splits flat blocks and extracts data-bid', () => {
    const { segments, ok } = splitTopLevelBlocks(P('a', 'x') + '<h2 data-bid="b">y</h2>')
    expect(ok).toBe(true)
    expect(segments.map(s => s.bid)).toEqual(['a', 'b'])
    expect(segments[0].html).toBe(P('a', 'x'))
  })

  it('handles nested same-name tags via depth counting', () => {
    const block = '<div data-bid="r" class="kuro-roundbox"><div><p>in</p></div></div>'
    const { segments, ok } = splitTopLevelBlocks(block + P('p2', 'after'))
    expect(ok).toBe(true)
    expect(segments.length).toBe(2)
    expect(segments[0].html).toBe(block)
    expect(segments[0].bid).toBe('r')
  })

  it('handles void elements and tables', () => {
    const table = '<table data-bid="t"><tbody><tr><td>c<br></td></tr></tbody></table>'
    const { segments, ok } = splitTopLevelBlocks('<hr>' + table + '<p data-bid="z"><img src="x.png">i</p>')
    expect(ok).toBe(true)
    expect(segments.map(s => s.bid)).toEqual([null, 't', 'z'])
  })

  it("ignores '>' inside quoted attribute values", () => {
    const block = '<p data-bid="q"><a href="/x?a>b" title=\'2>1\'>link</a></p>'
    const { segments, ok } = splitTopLevelBlocks(block)
    expect(ok).toBe(true)
    expect(segments.length).toBe(1)
    expect(segments[0].html).toBe(block)
  })

  it('treats top-level text runs as their own segments', () => {
    const { segments, ok } = splitTopLevelBlocks('\n' + P('a', 'x') + '\n  ' + P('b', 'y'))
    expect(ok).toBe(true)
    expect(segments.map(s => s.bid)).toEqual([null, 'a', null, 'b'])
  })

  it('flags malformed input (unclosed block)', () => {
    expect(splitTopLevelBlocks('<div><p>never closed').ok).toBe(false)
    expect(splitTopLevelBlocks('</p>stray close').ok).toBe(false)
  })
})

// ─── mergeBlocks ──────────────────────────────────────────────────────────────

describe('mergeBlocks', () => {
  afterEach(() => vi.restoreAllMocks())

  const base = P('1', 'alpha') + P('2', 'beta') + P('3', 'gamma')

  it('applies a remote-only change (AI edit preserved)', () => {
    const remote = P('1', 'alpha') + P('2', 'BETA-AI') + P('3', 'gamma')
    const { html, conflicts } = mergeBlocks(base, base, remote)
    expect(html).toBe(remote)
    expect(conflicts).toEqual([])
  })

  it('keeps a local-only change', () => {
    const local = P('1', 'ALPHA-ME') + P('2', 'beta') + P('3', 'gamma')
    const { html, conflicts } = mergeBlocks(base, local, base)
    expect(html).toBe(local)
    expect(conflicts).toEqual([])
  })

  it('combines disjoint local and remote changes', () => {
    const local  = P('1', 'ALPHA-ME') + P('2', 'beta') + P('3', 'gamma')
    const remote = P('1', 'alpha') + P('2', 'beta') + P('3', 'GAMMA-AI')
    const { html, conflicts } = mergeBlocks(base, local, remote)
    expect(html).toBe(P('1', 'ALPHA-ME') + P('2', 'beta') + P('3', 'GAMMA-AI'))
    expect(conflicts).toEqual([])
  })

  it('reports a conflict when both changed the same block differently (local wins in html)', () => {
    const local  = base.replace('beta', 'BETA-ME')
    const remote = base.replace('beta', 'BETA-AI')
    const { html, conflicts } = mergeBlocks(base, local, remote)
    expect(html).toContain('BETA-ME')
    expect(html).not.toContain('BETA-AI')
    expect(conflicts).toEqual([{
      bid: '2',
      base: P('2', 'beta'),
      local: P('2', 'BETA-ME'),
      remote: P('2', 'BETA-AI'),
    }])
  })

  it('is not a conflict when both made the identical change', () => {
    const both = base.replace('beta', 'SAME')
    const { html, conflicts } = mergeBlocks(base, both, both)
    expect(html).toBe(both)
    expect(conflicts).toEqual([])
  })

  it('applies a remote deletion of a locally-untouched block', () => {
    const remote = P('1', 'alpha') + P('3', 'gamma')
    const { html, conflicts } = mergeBlocks(base, base, remote)
    expect(html).toBe(remote)
    expect(conflicts).toEqual([])
  })

  it('conflicts when remote deleted a block local edited (local kept)', () => {
    const local  = base.replace('beta', 'BETA-ME')
    const remote = P('1', 'alpha') + P('3', 'gamma')
    const { html, conflicts } = mergeBlocks(base, local, remote)
    expect(html).toContain('BETA-ME')
    expect(conflicts).toEqual([{
      bid: '2',
      base: P('2', 'beta'),
      local: P('2', 'BETA-ME'),
      remote: null,
    }])
  })

  it('conflicts when local deleted a block remote edited (remote kept)', () => {
    const local  = P('1', 'alpha') + P('3', 'gamma')
    const remote = base.replace('beta', 'BETA-AI')
    const { html, conflicts } = mergeBlocks(base, local, remote)
    expect(html).toContain('BETA-AI')
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].local).toBe(null)
  })

  it('inserts a remote addition after its remote-side predecessor', () => {
    const remote = P('1', 'alpha') + P('2', 'beta') + P('9', 'NEW-AI') + P('3', 'gamma')
    const { html, conflicts } = mergeBlocks(base, base, remote)
    expect(html).toBe(remote)
    expect(conflicts).toEqual([])
  })

  it('keeps a local addition in place', () => {
    const local = P('1', 'alpha') + P('8', 'NEW-ME') + P('2', 'beta') + P('3', 'gamma')
    const { html, conflicts } = mergeBlocks(base, local, base)
    expect(html).toBe(local)
    expect(conflicts).toEqual([])
  })

  it('matches id-less blocks by content (raw REST addition)', () => {
    const remote = base + '<p>raw ai paragraph</p>'
    const { html, conflicts } = mergeBlocks(base, base, remote)
    expect(html).toBe(remote)
    expect(conflicts).toEqual([])
  })

  it('normalizes inter-block whitespace away', () => {
    const pretty = '\n' + P('1', 'alpha') + '\n' + P('2', 'beta') + '\n' + P('3', 'gamma') + '\n'
    const { html, conflicts } = mergeBlocks(base, pretty, base)
    expect(html).toBe(base)
    expect(conflicts).toEqual([])
  })

  it('refuses to merge malformed input: returns local + warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const local = base.replace('beta', 'BETA-ME')
    const { html, conflicts, warnings } = mergeBlocks(base, local, '<div><p>broken')
    expect(html).toBe(local)
    expect(conflicts).toEqual([])
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('remote')
    expect(warn).toHaveBeenCalled()
  })

  it('warns on duplicated data-bid and uses the first occurrence', () => {
    const dup = P('1', 'alpha') + P('1', 'copy') + P('2', 'beta') + P('3', 'gamma')
    const { html, warnings } = mergeBlocks(base, dup, base)
    expect(warnings.some(w => w.includes('"1"'))).toBe(true)
    expect(html).toContain('alpha')
  })
})
