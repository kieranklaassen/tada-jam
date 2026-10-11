import { AGE_RANGE } from './contract'

// What the grown-up has told the jam about the child. The home page and the
// strip above a game both read and write it, and a game sees it as
// ctx.childAge and ctx.language.

// No age, then every whole age a jam game can be made for.
export const AGES: readonly (number | null)[] = [null, ...Array.from({ length: AGE_RANGE[1] - AGE_RANGE[0] + 1 }, (_, index) => AGE_RANGE[0] + index)]

export type Prefs = { childAge: number | null; language: string; theme: string }

export const PREFS_KEY = 'tada-jam:prefs'
const FALLBACK: Prefs = { childAge: 4, language: 'en', theme: 'meadow' }

export function readPrefs(themes: readonly string[] = [FALLBACK.theme]): Prefs {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<Prefs> | null
    if (!parsed) return FALLBACK
    return {
      childAge: parsed.childAge !== undefined && AGES.includes(parsed.childAge) ? parsed.childAge : FALLBACK.childAge,
      language: typeof parsed.language === 'string' ? parsed.language : FALLBACK.language,
      theme: typeof parsed.theme === 'string' && themes.includes(parsed.theme) ? parsed.theme : FALLBACK.theme,
    }
  } catch {
    return FALLBACK
  }
}

export function writePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // A full or blocked store only means the choice is not remembered.
  }
}
