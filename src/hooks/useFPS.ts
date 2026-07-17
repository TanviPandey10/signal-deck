import { useEffect, useRef, useState } from 'react'
import type { PerfSample } from '../types'

const HISTORY_LEN = 90

/**
 * Samples real frame timing (not React render timing) so the on-screen
 * FPS readout reflects what the user's eyes actually see, including
 * jank caused by heavy main-thread work elsewhere in the app.
 */
export function useFPS() {
  const [sample, setSample] = useState<PerfSample>({ fps: 60, frameMs: 16.6, droppedFrames: 0, ts: 0 })
  const historyRef = useRef<number[]>([])
  const [history, setHistory] = useState<number[]>([])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let dropped = 0
    let windowStart = last

    const loop = (now: number) => {
      const delta = now - last
      last = now
      if (delta > 33) dropped++ // missed a 30fps-equivalent budget

      historyRef.current.push(delta)
      if (historyRef.current.length > HISTORY_LEN) historyRef.current.shift()

      if (now - windowStart >= 250) {
        const avgDelta = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length
        setSample({
          fps: Math.round(1000 / avgDelta),
          frameMs: Math.round(avgDelta * 100) / 100,
          droppedFrames: dropped,
          ts: now,
        })
        setHistory([...historyRef.current])
        windowStart = now
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return { sample, history }
}
