import { useCallback, useRef } from 'react'
import type { Launch } from './GameCard'

const LAUNCH_MS = 380

/**
 * Opening a game: its picture grows from where it was touched until it fills
 * the screen, and the game opens behind it. The copy that grows is removed
 * when the page that made it goes, or when the growing is done.
 */
export function useLaunch(open: (id: string) => void): Launch {
  const busy = useRef(false)
  return useCallback(
    (id, from) => {
      if (busy.current) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof from.animate !== 'function') {
        open(id)
        return
      }
      busy.current = true
      const rect = from.getBoundingClientRect()
      const copy = from.cloneNode(true) as HTMLElement
      copy.classList.add('is-opening')
      document.body.append(copy)
      const at = (top: number, right: number, bottom: number, left: number, round: string) => ({ clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${round})` })
      // The copy already fills the screen; a window over it opens, so nothing is laid out again on the way.
      const grown = copy.animate([at(rect.top, window.innerWidth - rect.right, window.innerHeight - rect.bottom, rect.left, '22px'), at(0, 0, 0, 0, '0px')], { duration: LAUNCH_MS, easing: 'cubic-bezier(0.5, 0, 0.1, 1)', fill: 'forwards' })
      let opened = false
      const finish = () => {
        if (opened) return
        opened = true
        open(id)
        const gone = copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 120, fill: 'forwards' })
        gone.onfinish = () => copy.remove()
        // An animation that never runs (a page put in the background) must not leave a picture over the game.
        window.setTimeout(() => copy.remove(), 800)
        busy.current = false
      }
      grown.onfinish = finish
      window.setTimeout(finish, LAUNCH_MS + 300)
    },
    [open],
  )
}
