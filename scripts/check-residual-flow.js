'use strict'

/*
 * Reports source files that still contain Flow syntax.
 *
 * Detection is behavioural rather than textual: each file is run through
 * `flow-remove-types` (with `all: true`, since this codebase uses no Flow
 * pragmas) and compared against the original. If stripping changed anything,
 * the file contained Flow. That is the same check used to scope the Flow →
 * TypeScript migration, so its numbers stay comparable across steps.
 *
 * For `.vue` files only the `<script>` block is examined.
 *
 * NOTE: `flow-remove-types` also strips the Flow pragma out of comments, so a
 * file that merely mentions it in prose registers as containing Flow. Avoid
 * writing that pragma literally here, and see `--why` when a hit looks wrong.
 *
 * Usage:
 *   node scripts/check-residual-flow.js              # report, always exits 0
 *   node scripts/check-residual-flow.js --gate       # exit 1 if anything remains
 *   node scripts/check-residual-flow.js --json       # machine-readable output
 *   node scripts/check-residual-flow.js --all        # include historical/
 *   node scripts/check-residual-flow.js --why FILE   # show what would be stripped
 *
 * `--gate` is the Step 9 acceptance check: once Flow is removed, no file outside
 * node_modules/, dist/, contracts/ and historical/ may contain Flow syntax.
 */

const fs = require('fs')
const path = require('path')

const flowRemoveTypes = require('flow-remove-types')

// Directory names skipped wherever they appear.
const SKIP_NAMES = new Set(['node_modules', 'dist', 'dist-dashboard', '.git', '.nyc_output', 'ignored'])
// Paths skipped only at the repo root, so `frontend/model/contracts` is still scanned.
const SKIP_ROOT_PATHS = new Set(['contracts'])
// Out of scope for the migration: Flow-ignored and unreachable from any esbuild
// entry point, so its Flow syntax is left intact deliberately.
const HISTORICAL = 'historical'

const SOURCE_EXTENSIONS = /\.(js|ts|vue|flow)$/

const argv = process.argv.slice(2)
const whyIndex = argv.indexOf('--why')
const options = {
  gate: argv.includes('--gate'),
  json: argv.includes('--json'),
  all: argv.includes('--all'),
  why: whyIndex === -1 ? null : argv[whyIndex + 1]
}

const repoRoot = path.resolve(__dirname, '..')

// Pulls the <script> contents out of an SFC. Returns null when there is none.
function extractVueScript (source) {
  const match = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  return match ? match[1] : null
}

function containsFlow (filePath, source) {
  const body = filePath.endsWith('.vue') ? extractVueScript(source) : source
  if (body === null) return { flow: false }
  try {
    return { flow: flowRemoveTypes(body, { all: true, pretty: true }).toString() !== body }
  } catch (err) {
    // A parse failure is itself worth reporting — it usually means syntax the
    // toolchain can no longer handle, which is exactly what this check is for.
    return { flow: true, parseError: err.message.split('\n')[0] }
  }
}

function walk (dir, found) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    return found
  }
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    const relative = path.relative(repoRoot, absolute)
    if (entry.isDirectory()) {
      if (SKIP_NAMES.has(entry.name)) continue
      if (SKIP_ROOT_PATHS.has(relative)) continue
      if (!options.all && relative === HISTORICAL) continue
      walk(absolute, found)
    } else if (SOURCE_EXTENSIONS.test(entry.name)) {
      const result = containsFlow(relative, fs.readFileSync(absolute, 'utf8'))
      if (result.flow) found.push({ file: relative, parseError: result.parseError })
    }
  }
  return found
}

function groupByDirectory (files) {
  const groups = new Map()
  for (const { file } of files) {
    const dir = path.dirname(file)
    groups.set(dir, (groups.get(dir) || 0) + 1)
  }
  return [...groups.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

// Shows the lines `flow-remove-types` would change in a single file, so a
// surprising hit can be explained without re-deriving this by hand.
function explain (target) {
  const absolute = path.resolve(repoRoot, target)
  if (!fs.existsSync(absolute)) {
    console.error(`No such file: ${target}`)
    process.exit(1)
  }
  const source = fs.readFileSync(absolute, 'utf8')
  const body = target.endsWith('.vue') ? extractVueScript(source) : source
  if (body === null) {
    console.log(`${target}: no <script> block.`)
    return
  }
  const stripped = flowRemoveTypes(body, { all: true, pretty: true }).toString()
  if (stripped === body) {
    console.log(`${target}: no Flow syntax.`)
    return
  }
  const before = body.split('\n')
  const after = stripped.split('\n')
  console.log(`${target}: lines that would change\n`)
  for (let i = 0; i < Math.max(before.length, after.length); i++) {
    if (before[i] !== after[i]) {
      console.log(`  line ${i + 1}`)
      console.log(`    -  ${before[i] === undefined ? '' : before[i].trim()}`)
      console.log(`    +  ${after[i] === undefined ? '' : after[i].trim()}`)
    }
  }
}

if (options.why) {
  explain(options.why)
  process.exit(0)
}

const found = walk(repoRoot, []).sort((a, b) => a.file.localeCompare(b.file))

if (options.json) {
  console.log(JSON.stringify({
    total: found.length,
    includesHistorical: options.all,
    files: found.map(f => f.file),
    parseErrors: found.filter(f => f.parseError).map(f => ({ file: f.file, error: f.parseError }))
  }, null, 2))
} else if (found.length === 0) {
  console.log('No residual Flow syntax found.')
} else {
  console.log(`Files still containing Flow syntax: ${found.length}\n`)
  for (const [dir, count] of groupByDirectory(found)) {
    console.log(`  ${String(count).padStart(4)}  ${dir}`)
  }
  const parseErrors = found.filter(f => f.parseError)
  if (parseErrors.length) {
    console.log('\nParse failures (could not be stripped):')
    for (const { file, parseError } of parseErrors) {
      console.log(`  ${file}: ${parseError}`)
    }
  }
  if (!options.all) {
    console.log('\n(historical/ excluded — pass --all to include it)')
  }
  console.log('\nRun with --json for the full file list.')
}

if (options.gate && found.length > 0) {
  console.error(`\nFAILED: expected no Flow syntax, found ${found.length} file(s).`)
  process.exit(1)
}
