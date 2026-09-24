// Games import the contract from here. In Tada this path is
// app/frontend/cartridges/types.ts, so `import type { ... } from '../types'`
// survives a port unchanged.
export type {
  Cartridge,
  CartridgeContext,
  CartridgeFace,
  CartridgeIconIdentity,
  CartridgeManifest,
  CartridgeStatus,
  CartridgeStorage,
  IconContrast,
  IconFamily,
  JamGame,
  JamTile,
  Permission,
  WindowShape,
} from '../harness/contract'
