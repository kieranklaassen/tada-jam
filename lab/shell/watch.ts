// Watch mode: a seeded persona driving a prototype's sim, so Kieran can see
// what the panel measured. This is a stub. The panel builder replaces this
// file with the real watcher, built on the same driver the panel measures
// with. The shell (play.ts) only calls createWatcher and handles a throw.

import type { CreateWatcher } from '../kit/proto.ts'

export const createWatcher: CreateWatcher = () => {
  throw new Error('watch mode is provided by the panel')
}
