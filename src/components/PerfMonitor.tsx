import { useEffect, useRef, useState } from 'react'
import { useFPS } from '../hooks/useFPS'
import { streamEngine } from '../store/streamEngine'
import { workerClient } from '../store/workerClient'

export function PerfMonitor() {
  const { sample, history } = useFPS()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [totalSamples, setTotalSamples] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTotalSamples(streamEngine.totalSamples()), 300)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = 160
    const h = 36
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (history.length < 2) return
    const max = Math.max(33, ...history)
    ctx.beginPath()
    history.forEach((d, i) => {
      const x = (i / (history.length - 1)) * w
      const y = h - (Math.min(d, max) / max) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = sample.fps >= 55 ? '#8fe84a' : sample.fps >= 30 ? '#e8c94a' : '#e85a4a'
    ctx.lineWidth = 1.4
    ctx.stroke()
    // 16.6ms (60fps) reference line
    const refY = h - (16.6 / max) * h
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(0, refY)
    ctx.lineTo(w, refY)
    ctx.stroke()
    ctx.setLineDash([])
  }, [history, sample.fps])

  const fpsColor = sample.fps >= 55 ? 'var(--good)' : sample.fps >= 30 ? 'var(--warn)' : 'var(--bad)'

  return (
    <div className="perf-monitor">
      <div className="perf-item">
        <span className="perf-label">FPS</span>
        <span className="perf-value" style={{ color: fpsColor }}>{sample.fps}</span>
      </div>
      <canvas ref={canvasRef} className="perf-sparkline" />
      <div className="perf-item">
        <span className="perf-label">FRAME</span>
        <span className="perf-value">{sample.frameMs.toFixed(1)}ms</span>
      </div>
      <div className="perf-item">
        <span className="perf-label">DROPPED</span>
        <span className="perf-value">{sample.droppedFrames}</span>
      </div>
      <div className="perf-item">
        <span className="perf-label">BUFFERED</span>
        <span className="perf-value">{totalSamples.toLocaleString()}</span>
      </div>
      <div className="perf-item">
        <span className="perf-label">WORKER</span>
        <span className="perf-value">{workerClient.lastProcessingMs.toFixed(2)}ms</span>
      </div>
    </div>
  )
}
