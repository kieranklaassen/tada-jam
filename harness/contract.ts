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

/** The jam's launcher entry: a cartridge plus the emoji Tada keeps in CARTRIDGE_EMOJI. */
export type JamGame = {
  cartridge: Cartridge
  emoji: string
  /** Optional jam-only tile art; games without one show their emoji. */
  tile?: JamTile
}

export const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/

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
