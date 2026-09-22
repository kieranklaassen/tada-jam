// Egress and boundary scan for the jam (Tada R20 plus the persistence rule).
//
//   node scripts/egress-check.ts          scan games/ and harness/ source
//   node scripts/egress-check.ts --built  scan the built dist/ assets too
//
// Games may talk to nothing: no absolute URL to a foreign host, no CDN font,
// no fetch/XHR/WebSocket/beacon, no localStorage/IndexedDB, no sample players
// that load URLs, and no imports outside their own folder, ../types, and the
// allowed package list. The harness gets the URL rule only (it owns the fake
// server, so it may use localStorage). The scanner core is exported so
// test/egress.test.ts can prove it flags what it claims to flag.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type Finding = { file: string; line: number; rule: string; match: string }

export const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']
export const NAMESPACE_HOSTS = ['www.w3.org']
// Documentation strings inside bundled vendor code; never requested. Built assets only.
export const BUILT_BENIGN_HOSTS = [
  'react.dev',
  'github.com',
  'reactjs.org',
  'fb.me',
  'opensource.org',
  'jcgt.org', // paper citation in a three.js shader comment
  'opencollective.com', // react-three-fiber's bundled package.json metadata
  'docs.pmnd.rs', // react-three-fiber error-message link
]

export const ALLOWED_GAME_PACKAGES = [
  'react',
  'react-dom',
  'tone',
  'matter-js',
  'three',
  'pixi.js',
  'gsap',
  'zustand',
  'vitest',
  // Jam-only (outside Tada's menu, which asks for raw three.js): see AGENTS.md "Jam allowances".
  '@react-three/fiber',
  '@react-three/postprocessing',
  'postprocessing',
  'cannon-es',
]

const URL_PATTERN = /(?:https?|wss?):\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*/g
const PROTOCOL_RELATIVE = /(?:src|href|url)\s*[=(]\s*['"]?\/\/[a-zA-Z0-9]/g

const GAME_API_RULES: ReadonlyArray<{ rule: string; pattern: RegExp }> = [
  { rule: 'no-fetch', pattern: /\bfetch\s*\(/ },
  { rule: 'no-xhr', pattern: /\bXMLHttpRequest\b/ },
  { rule: 'no-websocket', pattern: /\bWebSocket\b/ },
  { rule: 'no-eventsource', pattern: /\bEventSource\b/ },
  { rule: 'no-beacon', pattern: /\bsendBeacon\b/ },
  { rule: 'no-localstorage', pattern: /\b(?:localStorage|sessionStorage)\b/ },
  { rule: 'no-indexeddb', pattern: /\bindexedDB\b/ },
  { rule: 'no-sample-player', pattern: /\bTone\.(?:Player|Sampler|Buffer|Players|GrainPlayer)\b/ },
  { rule: 'no-font-face-url', pattern: /@font-face|@import\s+url/ },
  { rule: 'no-shell-import', pattern: /from\s+['"](?:\.\.\/)+harness\b/ },
]

const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.html', '.json', '.svg', '.md'])

function isTestFile(file: string): boolean {
  return /\.test\.tsx?$/.test(file)
}

export function scanUrls(text: string, file: string, allowedHosts: readonly string[]): Finding[] {
  const findings: Finding[] = []
  text.split('\n').forEach((lineText, index) => {
    for (const match of lineText.matchAll(URL_PATTERN)) {
      const host = match[0].replace(/^(?:https?|wss?):\/\//, '').toLowerCase()
      if (LOCAL_HOSTS.includes(host) || NAMESPACE_HOSTS.includes(host) || allowedHosts.includes(host)) continue
      findings.push({ file, line: index + 1, rule: 'no-external-url', match: match[0] })
    }
    for (const match of lineText.matchAll(PROTOCOL_RELATIVE)) {
      findings.push({ file, line: index + 1, rule: 'no-external-url', match: match[0] })
    }
  })
  return findings
}

export function scanGameSource(text: string, file: string): Finding[] {
  const findings = scanUrls(text, file, [])
  const lines = text.split('\n')
  lines.forEach((lineText, index) => {
    const code = lineText.replace(/\/\/.*$/, '')
    for (const { rule, pattern } of GAME_API_RULES) {
      const match = code.match(pattern)
      if (match) findings.push({ file, line: index + 1, rule, match: match[0] })
    }
    for (const match of code.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      const specifier = match[1]
      if (specifier.startsWith('.')) {
        const gameRoot = file.split('/').slice(0, 2).join('/')
        const target = posix.normalize(posix.join(posix.dirname(file), specifier))
        const insideGame = target.startsWith(`${gameRoot}/`)
        if (!insideGame && target !== 'games/types') findings.push({ file, line: index + 1, rule: 'import-outside-game', match: specifier })
        continue
      }
      const pkg = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
      if (!ALLOWED_GAME_PACKAGES.includes(pkg)) {
        findings.push({ file, line: index + 1, rule: 'package-not-on-menu', match: specifier })
      }
    }
  })
  return findings
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules') return []
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

export function scanTree(root: string, options: { built: boolean }): Finding[] {
  const findings: Finding[] = []
  const gamesDir = join(root, 'games')
  for (const path of walk(gamesDir)) {
    if (!TEXT_EXTENSIONS.has(extname(path))) continue
    const file = relative(root, path)
    const text = readFileSync(path, 'utf8')
    const isGameCode = /\.(?:ts|tsx|js|jsx|css)$/.test(path) && !isTestFile(path) && relative(gamesDir, path).includes('/')
    findings.push(...(isGameCode ? scanGameSource(text, file) : scanUrls(text, file, [])))
  }
  for (const path of walk(join(root, 'harness'))) {
    if (!TEXT_EXTENSIONS.has(extname(path))) continue
    findings.push(...scanUrls(readFileSync(path, 'utf8'), relative(root, path), []))
  }
  if (options.built) {
    const dist = join(root, 'dist')
    if (!existsSync(dist)) {
      findings.push({ file: 'dist', line: 0, rule: 'missing-build', match: 'run npm run build first' })
    }
    for (const path of walk(dist)) {
      if (!TEXT_EXTENSIONS.has(extname(path))) continue
      findings.push(...scanUrls(readFileSync(path, 'utf8'), relative(root, path), BUILT_BENIGN_HOSTS))
    }
  }
  return findings
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const findings = scanTree(root, { built: process.argv.includes('--built') })
  if (findings.length > 0) {
    for (const f of findings) console.error(`${f.file}:${f.line}  ${f.rule}  ${f.match}`)
    console.error(`\negress check failed: ${findings.length} finding(s)`)
    process.exit(1)
  }
  console.log('egress check passed')
}
