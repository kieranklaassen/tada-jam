import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { alienFrontierManifest } from './manifest'

// SHOWCASE ONLY: Alien Frontier is a standalone keyboard-and-mouse space western
// (source: ../../midwestalien, rebuilt into public/alien-frontier with
// `npm run showcase:jam`). It runs in a same-origin iframe and does not follow
// the cartridge rules (it has XP, money and a range timer, saves to
// localStorage and loads Google Fonts), so it is not meant to be ported to Tada.

type GameWindow = Window & { game?: { setAttended?: (on: boolean) => void } }

function AlienFrontier({ ctx }: { ctx: CartridgeContext }) {
  const frameRef = useRef<HTMLIFrameElement>(null)

  // park the game (no simulation, rendering or audio) while unattended or hidden
  useEffect(() => {
    const apply = () => {
      const win = frameRef.current?.contentWindow as GameWindow | null
      win?.game?.setAttended?.(ctx.attention.attended && !document.hidden)
    }
    apply()
    const frame = frameRef.current
    frame?.addEventListener('load', apply)
    document.addEventListener('visibilitychange', apply)
    const poll = window.setInterval(apply, 1000) // the game object appears after its world is built
    return () => {
      frame?.removeEventListener('load', apply)
      document.removeEventListener('visibilitychange', apply)
      window.clearInterval(poll)
    }
  }, [ctx.attention.attended])

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
