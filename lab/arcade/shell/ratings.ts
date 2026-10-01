// The owner's ratings. The lab's Vite server (dev and preview) keeps them in
// lab/arcade/RATINGS.json through /__arcade/ratings, so they land in the repo
// where the next session can read them. localStorage is the fallback when the
// page is served by something else.

export type Verdict = 'build' | 'maybe' | 'no' | ''

export interface Rating {
  // 0 is unrated, 1 to 5 stars.
  stars: number
  verdict: Verdict
  note: string
  at: string
}

export type Ratings = Record<string, Rating>

const ENDPOINT = '/__arcade/ratings'
const LOCAL_KEY = 'tada-jam-arcade-ratings'

export function emptyRating(): Rating {
  return { stars: 0, verdict: '', note: '', at: '' }
}

function clean(raw: unknown): Ratings {
  const out: Ratings = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const v = value as Partial<Rating>
    const stars = typeof v.stars === 'number' && v.stars >= 0 && v.stars <= 5 ? Math.round(v.stars) : 0
    const verdict: Verdict = v.verdict === 'build' || v.verdict === 'maybe' || v.verdict === 'no' ? v.verdict : ''
    out[key] = { stars, verdict, note: typeof v.note === 'string' ? v.note.slice(0, 2000) : '', at: typeof v.at === 'string' ? v.at : '' }
  }
  return out
}

function readLocal(): Ratings {
  try {
    return clean(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'))
  } catch {
    return {}
  }
}

function writeLocal(ratings: Ratings): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ratings))
  } catch {
    // Private mode or a full store: the server copy is the one that matters.
  }
}

export async function loadRatings(): Promise<Ratings> {
  const local = readLocal()
  try {
    const response = await fetch(ENDPOINT, { cache: 'no-store' })
    if (!response.ok) return local
    const server = clean(await response.json())
    // The newer of the two wins per prototype.
    const merged: Ratings = { ...local }
    for (const [key, rating] of Object.entries(server)) {
      const mine = merged[key]
      if (!mine || rating.at >= mine.at) merged[key] = rating
    }
    writeLocal(merged)
    return merged
  } catch {
    return local
  }
}

export async function saveRating(ratings: Ratings, key: string, rating: Rating): Promise<void> {
  ratings[key] = { ...rating, at: new Date().toISOString() }
  writeLocal(ratings)
  try {
    await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, rating: ratings[key] }) })
  } catch {
    // Offline or a static host: localStorage has it.
  }
}

export function ratingsAsText(ratings: Ratings, names: ReadonlyMap<string, string>): string {
  const rows = Object.entries(ratings)
    .filter(([, r]) => r.stars > 0 || r.verdict !== '' || r.note !== '')
    .sort((a, b) => b[1].stars - a[1].stars)
  if (rows.length === 0) return 'No ratings yet.'
  return rows
    .map(([key, r]) => `${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)} ${names.get(key) ?? key} (${key})${r.verdict ? ` [${r.verdict}]` : ''}${r.note ? `: ${r.note}` : ''}`)
    .join('\n')
}
