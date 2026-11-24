// The jam's build publishes this player under /lab/. There a visitor plays in
// the jam, full screen, and the rating strip and the rated list are only for
// someone who asks for them with ?chrome=1. A link to the player without it
// (an old one, or one typed by hand) belongs in the jam; ?chrome=0 is the jam
// framing a demo. The lab's own server publishes nothing and keeps its list.

import type { Route } from '../../shell/routes.ts'

/** The jam page an address of the published player belongs to, or null to stay. */
export function jamAddress(pathname: string, search: string, route: Route): string | null {
  if (!pathname.includes('/lab/') || new URLSearchParams(search).has('chrome')) return null
  if (route.view === 'list') return '../../index.html'
  return route.chrome ? `../../index.html#/demo/${route.key}` : null
}
