import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../../harness/contract'
import { alienFrontierManifest } from './manifest'

// SHOWCASE ONLY: Alien Frontier is a standalone keyboard-and-mouse space western
// (source: ../../midwestalien, rebuilt into public/alien-frontier with
// `npm run showcase:jam`). It runs in a same-origin iframe and does not follow
// the cartridge rules (it has XP, money and a range timer, and saves to
// localStorage), so it is not meant to be ported to Tada. Its fonts are bundled.

type GameWindow = Window & { game?: { setAttended?: (on: boolean) => void } }

function AlienFrontier({ ctx }: { ctx: CartridgeContext }) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  // Park the game (no simulation, rendering or audio) while unattended or hidden.
  // Only changes are passed on: waking the game resumes its audio, which should
  // not happen every second. The poll covers the game object appearing late.
  useEffect(() => {
    let sent: boolean | null = null
    const apply = () => {
      const win = frameRef.current?.contentWindow as GameWindow | null
      if (!win?.game?.setAttended) { sent = null; return }
      const on = ctx.attention.attended && !document.hidden
      if (on !== sent) { win.game.setAttended(on); sent = on }
    }
    apply()
    const frame = frameRef.current
    frame?.addEventListener('load', apply)
    document.addEventListener('visibilitychange', apply)
    const poll = window.setInterval(apply, 1000)
    return () => {
      frame?.removeEventListener('load', apply)
      document.removeEventListener('visibilitychange', apply)
      window.clearInterval(poll)
    }
  }, [ctx.attention.attended])

  // Give the game the keyboard as soon as it opens, so WASD works without a first click.
  useEffect(() => {
    const frame = frameRef.current
    const focus = () => frame?.contentWindow?.focus()
    frame?.addEventListener('load', focus)
    return () => frame?.removeEventListener('load', focus)
  }, [])

  return (
    <iframe
      ref={frameRef}
      title="Alien Frontier"
      src={`${import.meta.env.BASE_URL}alien-frontier/index.html`}
      allow="autoplay; fullscreen"
      style={{ display: 'block', width: '100%', height: '100%', border: 0, background: '#140c18' }}
    />
  )
}

export const alienFrontier: Cartridge = {
  manifest: alienFrontierManifest,
  Mount: AlienFrontier,
}
