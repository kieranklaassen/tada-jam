import type { ComponentType } from 'react'

// The Tada cartridge contract, restated for the jam harness from the public
// contract document (docs/cartridges.md in kieranklaassen/tada.computer).
// Games import these through games/types.ts, which sits at the same relative
// path as app/frontend/cartridges/types.ts in Tada, so a ported game needs no
// import changes. Keep this file free of JSX and Vite globals: the manifest
// validator runs under plain Node.

export const PERMISSIONS = ['storage', 'camera', 'creations', 'weather', 'ai'] as const
export type Permission = (typeof PERMISSIONS)[number]

export const WINDOW_SHAPES = ['full', 'square'] as const
export type WindowShape = (typeof WINDOW_SHAPES)[number]

export const ICON_FAMILIES = ['make', 'learn', 'play', 'life'] as const
export type IconFamily = (typeof ICON_FAMILIES)[number]

export const ICON_CONTRASTS = ['ink', 'paper'] as const
export type IconContrast = (typeof ICON_CONTRASTS)[number]

export type CartridgeIconIdentity = {
  family: IconFamily
  contrast: IconContrast
}

export type CartridgeFace = {
  minAge: number
  name: string
  emoji?: string
  windowShape?: WindowShape
}

export type CartridgeManifest = {
  key: string
  name: string
  ageBand: readonly [number, number]
  permissions: readonly Permission[]
  iconIdentity?: CartridgeIconIdentity
  windowShape?: WindowShape
  faces?: readonly CartridgeFace[]
  devOnly?: boolean
  author?: string
  version?: string
}

export type CartridgeStatus = 'loading' | 'ready' | 'error'

export type CartridgeStorage = {
  load<T>(): Promise<T | null>
  save(state: unknown): void
  flush(): Promise<void>
}

export type CartridgeContext = {
  childNickname: string
  childAge: number | null
  language: string
  childCountry?: string | null
  childClass?: string | null
  theme: string
  status: CartridgeStatus
  storage: CartridgeStorage
  attention: { attended: boolean }
}

export type Cartridge = {
  manifest: CartridgeManifest
  Mount: ComponentType<{ ctx: CartridgeContext }>
}

/** Launcher art for the jam's home page: an image on a two-colour gradient. */
export type JamTile = {
  /** URL of a repo-committed image (import it: `import art from './tile.svg'`). */
  art: string
  /** Gradient behind the art, bottom-left to top-right. */
  from: string
  to: string
}

/**
 * A showcase: a finished game shown in the jam but not a Tada cartridge (it may
 * need a keyboard and mouse, or keep its own saves). It lives in showcases/,
 * outside cartridge discovery, and the home page lists it separately.
 */
export type JamShowcase = JamGame & {
  /** What a grown-up should know before opening it, shown on the home page. */
  requires: string
}

/** The jam's launcher entry: a cartridge plus the emoji Tada keeps in CARTRIDGE_EMOJI. */
export type JamGame = {
  cartridge: Cartridge
  emoji: string
  /** Optional jam-only tile art; games without one show their emoji. */
  tile?: JamTile
}

export const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/

/** The youngest and the oldest age a jam game can be made for, in whole years. */
export const AGE_RANGE = [2, 12] as const
/** The widest band a jam game may declare: a game is designed for one audience. */
export const MAX_BAND_YEARS = 5

/**
 * The jam's own band rule, which is stricter than the contract's: whole years,
 * inside AGE_RANGE, youngest first, at most MAX_BAND_YEARS wide. Returns
 * human-readable problems; an empty list means the band names one jam audience.
 * The generator, the games test and the shell's age list all read it from here.
 */
export function ageBandProblems(band: readonly [number, number]): string[] {
  const [youngest, oldest] = band
  const named = `ageBand [${youngest}, ${oldest}]`
  const problems: string[] = []
  if (!Number.isInteger(youngest) || !Number.isInteger(oldest)) problems.push(`${named} is not in whole years`)
  if (youngest < AGE_RANGE[0] || oldest > AGE_RANGE[1]) problems.push(`${named} does not lie within ${AGE_RANGE[0]} to ${AGE_RANGE[1]}`)
  if (oldest < youngest) problems.push(`${named} does not put the youngest age first`)
  if (oldest - youngest > MAX_BAND_YEARS) problems.push(`${named} is wider than ${MAX_BAND_YEARS} years; a game is designed for one audience, so split a wider range into faces or a second game`)
  return problems
}

/** Returns human-readable problems; an empty list means the manifest is valid. */
export function validateManifest(manifest: CartridgeManifest): string[] {
  const problems: string[] = []
  if (!KEY_PATTERN.test(manifest.key)) problems.push(`key "${manifest.key}" is not a kebab-case slug`)
  if (!manifest.name || manifest.name.trim() === '') problems.push('name is blank')
  const [min, max] = manifest.ageBand
  if (!(min >= 0) || !(max >= min)) problems.push(`ageBand [${min}, ${max}] is invalid`)
  for (const permission of manifest.permissions) {
    if (!(PERMISSIONS as readonly string[]).includes(permission)) problems.push(`unknown permission "${permission}"`)
  }
  if (manifest.windowShape !== undefined && !(WINDOW_SHAPES as readonly string[]).includes(manifest.windowShape)) {
    problems.push(`unknown windowShape "${manifest.windowShape}"`)
  }
  if (manifest.iconIdentity) {
    if (!(ICON_FAMILIES as readonly string[]).includes(manifest.iconIdentity.family)) problems.push('bad icon family')
    if (!(ICON_CONTRASTS as readonly string[]).includes(manifest.iconIdentity.contrast)) problems.push('bad icon contrast')
  } else if (!manifest.devOnly) {
    problems.push('iconIdentity is required for non-dev cartridges')
  }
  if (manifest.faces) {
    let last = -Infinity
    for (const face of manifest.faces) {
      if (face.minAge < last) problems.push('faces must ascend by minAge')
      last = face.minAge
    }
  }
  if (manifest.author !== undefined && manifest.author.trim() === '') problems.push('author is blank')
  if (manifest.version !== undefined && !SEMVER_PATTERN.test(manifest.version)) problems.push('version is not semver')
  return problems
}
