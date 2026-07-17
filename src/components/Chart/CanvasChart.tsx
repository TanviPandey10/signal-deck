import { useEffect, useRef, useState } from 'react'
import { streamEngine } from '../../store/streamEngine'
import { workerClient } from '../../store/workerClient'
import type { ChannelMeta } from '../../types'
import type { DownsampleAlgo } from '../../store/useDashboardStore'

interface Props {
  channel: ChannelMeta
  index: number
  targetPoints: number
  algo: DownsampleAlgo
  windowMs: number
  running: boolean
}

const REFRESH_MS = 120 // how often we ask the worker for a fresh downsample

export function CanvasChart({ channel, index, targetPoints, algo, windowMs, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const downsampledRef = useRef<{ t: number[]; v: number[] }>({ t: [], v: [] })
  const [outCount, setOutCount] = useState(0)
  const [rawCount, setRawCount] = useState(0)
  const [procMs, setProcMs] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 600, h: 120 })

  // Resize observer keeps the canvas crisp at the panel's actual rendered size.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect
      setDims({ w: Math.max(200, box.width), h: Math.max(80, box.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Periodically request a fresh downsample of the visible window from the worker.
  useEffect(() => {
    if (!running) return
    let cancelled = false
    const tick = () => {
      const buf = streamEngine.buffers.get(channel.id)
      if (!buf || buf.count < 2) return
      const snap = buf.snapshot(Math.min(buf.count, 20000))
      // trim to the requested time window
      const cutoff = Date.now() - windowMs
      let startIdx = 0
      while (startIdx < snap.t.length && snap.t[startIdx] < cutoff) startIdx++
      const t = snap.t.slice(startIdx)
      const v = snap.v.slice(startIdx)
      if (t.length < 2) return

      if (algo === 'none') {
        downsampledRef.current = { t: Array.from(t), v: Array.from(v) }
        setOutCount(t.length)
        setRawCount(t.length)
        setProcMs(0)
        return
      }

      workerClient.downsample(channel.id, t, v, targetPoints, algo, (res) => {
        if (cancelled) return
        downsampledRef.current = { t: res.t, v: res.v }
        setOutCount(res.outCount)
        setRawCount(res.rawCount)
        setProcMs(res.ms)
      })
    }
    tick()
    const id = setInterval(tick, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [channel.id, targetPoints, algo, windowMs, running])

  // Draw every animation frame using the last downsampled data plus any
  // newer raw samples, so the line's leading edge never looks stale even
  // though the bulk of the series only refreshes every REFRESH_MS.
  useEffect(() => {
    let raf = 0
    const draw = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const w = dims.w
        const h = dims.h
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr
          canvas.height = h * dpr
        }
        const ctx = canvas.getContext('2d')!
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        renderChart(ctx, w, h, downsampledRef.current, channel)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [dims, channel])

  const latest = streamEngine.buffers.get(channel.id)?.latest()

  return (
    <div className="channel-panel">
      <div className="channel-header">
        <span className="channel-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="channel-dot" style={{ background: channel.color }} />
        <span className="channel-label">{channel.label}</span>
        <span className="channel-value">
          {latest !== null && latest !== undefined ? latest.toFixed(2) : '—'}
          <span className="channel-unit">{channel.unit}</span>
        </span>
      </div>
      <div className="channel-canvas-wrap" ref={containerRef}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div className="channel-footer">
        <span>{rawCount.toLocaleString()} raw → {outCount.toLocaleString()} pts</span>
        <span>{procMs > 0 ? `${procMs.toFixed(2)}ms downsample` : algo === 'none' ? 'downsampling off' : 'idle'}</span>
      </div>
    </div>
  )
}

function renderChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: { t: number[]; v: number[] },
  channel: ChannelMeta
) {
  const padding = { top: 10, right: 10, bottom: 4, left: 10 }
  const plotW = w - padding.left - padding.right
  const plotH = h - padding.top - padding.bottom

  // grid
  ctx.strokeStyle = 'rgba(232, 236, 240, 0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (plotH / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(w - padding.right, y)
    ctx.stroke()
  }

  if (data.t.length < 2) return

  let min = Infinity
  let max = -Infinity
  for (const val of data.v) {
    if (val < min) min = val
    if (val > max) max = val
  }
  if (min === max) {
    min -= 1
    max += 1
  }
  const pad = (max - min) * 0.15
  min -= pad
  max += pad

  const t0 = data.t[0]
  const t1 = data.t[data.t.length - 1]
  const tSpan = Math.max(1, t1 - t0)

  const xAt = (t: number) => padding.left + ((t - t0) / tSpan) * plotW
  const yAt = (v: number) => padding.top + plotH - ((v - min) / (max - min)) * plotH

  // filled area under the line for a signal/oscilloscope feel
  ctx.beginPath()
  ctx.moveTo(xAt(data.t[0]), yAt(data.v[0]))
  for (let i = 1; i < data.t.length; i++) {
    ctx.lineTo(xAt(data.t[i]), yAt(data.v[i]))
  }
  ctx.lineTo(xAt(data.t[data.t.length - 1]), padding.top + plotH)
  ctx.lineTo(xAt(data.t[0]), padding.top + plotH)
  ctx.closePath()
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH)
  gradient.addColorStop(0, hexToRgba(channel.color, 0.28))
  gradient.addColorStop(1, hexToRgba(channel.color, 0))
  ctx.fillStyle = gradient
  ctx.fill()

  // line
  ctx.beginPath()
  ctx.moveTo(xAt(data.t[0]), yAt(data.v[0]))
  for (let i = 1; i < data.t.length; i++) {
    ctx.lineTo(xAt(data.t[i]), yAt(data.v[i]))
  }
  ctx.strokeStyle = channel.color
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.stroke()

  // live edge dot
  const lastX = xAt(data.t[data.t.length - 1])
  const lastY = yAt(data.v[data.v.length - 1])
  ctx.beginPath()
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
  ctx.fillStyle = channel.color
  ctx.shadowColor = channel.color
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
