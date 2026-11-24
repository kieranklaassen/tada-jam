// The cover pictures of the home page, taken from the games themselves by
// scripts/covers.mjs. A game without one shows its tile or its emoji.
const files = import.meta.glob<string>('./covers/*.webp', { eager: true, query: '?url', import: 'default' })

const COVERS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.slice('./covers/'.length, -'.webp'.length), url]))

export const coverOf = (key: string): string | undefined => COVERS[key]
