import { useFrame, useThree } from '@react-three/fiber'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { TIERS, type QualityGovernor, type QualitySettings } from '../quality'

// Applies the quality governor inside the canvas: measures every frame
// (interval since the last frame and the CPU time this frame took), feeds
// the governor, and applies its tier (DPR, post mode, fur; never physics). The
// canvas runs on demand, driven by a pacer that renders every display frame
// while anything happens and every other frame once the table has rested a
// while, which spares an iPad's battery and heat without visible cost.

const QualityContext = createContext<QualitySettings>(TIERS[0])

export function useQuality(): QualitySettings {
  return useContext(QualityContext)
}

/** Seconds of rest (untouched, still, no demonstration) before rendering drops to half rate. */
const REST_BEFORE_PACING = 20

export function QualityProvider({
  governor,
  running,
  restingFor,
  children,
}: {
  governor: QualityGovernor
  running: boolean
  restingFor: () => number
  children: ReactNode
}) {
  const [tier, setTier] = useState(governor.tier)
  const settings = TIERS[tier]
  const gl = useThree((state) => state.gl)
  const setDpr = useThree((state) => state.setDpr)
  const invalidate = useThree((state) => state.invalidate)
  const frame = useRef({ start: 0, last: 0, work: 0, skip: 2 })

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, settings.dpr))
    gl.domElement.dataset.quality = settings.name
    frame.current.skip = 2
  }, [settings, gl, setDpr])

  useEffect(() => {
    if (!running) return
    let handle = 0
    let count = 0
    const loop = () => {
      count += 1
      const paced = restingFor() > REST_BEFORE_PACING
      if (paced) frame.current.skip = 2
      if (!paced || count % 2 === 0) invalidate()
      handle = requestAnimationFrame(loop)
    }
    handle = requestAnimationFrame(loop)
    frame.current.last = 0
    return () => cancelAnimationFrame(handle)
  }, [running, restingFor, invalidate])

  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  useFrame(() => {
    gl.info.reset()
    const now = performance.now()
    const f = frame.current
    if (f.skip > 0) f.skip -= 1
    else if (f.last > 0) governor.sample(now - f.last, f.work)
    f.last = now
    f.start = now
    if (governor.tier !== tier) setTier(governor.tier)
  }, -2)

  useFrame(() => {
    frame.current.work = performance.now() - frame.current.start
    governor.render.calls = gl.info.render.calls
    governor.render.triangles = gl.info.render.triangles
    gl.domElement.dataset.calls = String(gl.info.render.calls)
    gl.domElement.dataset.triangles = String(gl.info.render.triangles)
  }, 2)

  return <QualityContext.Provider value={settings}>{children}</QualityContext.Provider>
}
