import { useEffect, useRef } from 'react'
import type { Cartridge } from '../types'
import { bottomPortraitsManifest } from './manifest'
import { CAST } from './cast'
import { EASEL, SHOWN, SPOTS, STEPS } from './layout'
import { restMaestro, restPose } from './pose'
import { Stage } from './view/stage'
function Mount() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const st = new Stage(ref.current!)
    st.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio)
    const q = new URLSearchParams(location.search)
    const arr = JSON.parse(q.get('arr') ?? '[["elephant",0],null,null,["pig",2]]')
    const rot = Number(q.get('rot') ?? 0)
    const poses: any = {}, keys: any = {}; let s = 0
    for (const id of CAST) { const p = restPose(); const i = arr.findIndex((a: any) => a?.[0] === id); if (i >= 0) { Object.assign(p, SPOTS[i]); p.yaw = (arr[i][1]+rot) * Math.PI / 2 } else { const t = STEPS[s++]; Object.assign(p, t); p.yaw = rot*Math.PI/2+(t.x < 0 ? 0.45 : -0.45) } poses[id] = p; keys[id] = 0.3 }
    st.portrait(arr, 0)
    for (let i = 1; i < 6; i++) st.portrait(JSON.parse(["","[[\"elephant\",0],null,null,null]","[[\"elephant\",0],null,[\"board\",2],null]","[[\"giraffe\",2],null,[\"pig\",2],null]","[[\"hen\",2],[\"hippo\",0],[\"board\",2],[\"giraffe\",2]]","[null,[\"crocodile\",1],null,null]"][i]), i)
    const shown = q.get('shown') !== '0'
    st.update({ poses, keys, maestro: restMaestro(), tableYaw: 0, tableKey: { up: 1, spin: 0.4, squash: 1 }, easel: shown ? { ...SHOWN, yaw: 0, roll: 0, tile: 0 } : { ...EASEL, roll: 0, size: 1, tile: -1 }, wall: [0, 1, 2, 3, 4, 5].map((i) => ({ hung: true, swing: 0, drop: 0 })), flecks: [], glow: [], hand: null })
    st.render(); (window as any).ready = st.counts
  }, [])
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}
export const bottomPortraitsCartridge: Cartridge = { manifest: bottomPortraitsManifest, Mount }
