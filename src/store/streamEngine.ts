import { CHANNEL_DEFS, SignalGenerator } from '../utils/dataGenerator'
import { RingBuffer } from '../utils/ringBuffer'
import type { ChannelMeta, RawEvent } from '../types'

const CHANNEL_CAPACITY = 20_000 // per-channel ring buffer depth
const RAW_LOG_CAPACITY = 5_000 // shared feed for the virtualized event table

type Listener = () => void

/**
 * Owns all live data outside of React state. Samples are written straight
 * into typed-array ring buffers on every animation frame; React components
 * subscribe and read snapshots only when they actually need to paint,
 * which keeps 100k+ samples/sec of throughput from ever touching the
 * reconciler.
 */
class StreamEngine {
  buffers: Map<string, RingBuffer> = new Map()
  meta: Map<string, ChannelMeta> = new Map()
  rawLog: RawEvent[] = []
  private rawLogHead = 0
  private eventId = 0

  running = false
  speedMultiplier = 1
  private rafHandle: number | null = null
  private lastTick = 0
  private debt: Map<string, number> = new Map()
  private generator = new SignalGenerator()
  private tickListeners: Set<Listener> = new Set()

  constructor() {
    for (const c of CHANNEL_DEFS) {
      this.buffers.set(c.id, new RingBuffer(CHANNEL_CAPACITY))
      this.meta.set(c.id, c)
      this.debt.set(c.id, 0)
    }
  }

  onTick(fn: Listener) {
    this.tickListeners.add(fn)
    return () => this.tickListeners.delete(fn)
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTick = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const dtMs = now - this.lastTick
      this.lastTick = now
      this.produce(dtMs)
      for (const l of this.tickListeners) l()
      this.rafHandle = requestAnimationFrame(loop)
    }
    this.rafHandle = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle)
    this.rafHandle = null
  }

  setSpeed(mult: number) {
    this.speedMultiplier = mult
  }

  /** Emits samples for each channel proportional to elapsed time, catching up via a per-channel time debt so bursts stay evenly spaced instead of clumping. */
  private produce(dtMs: number) {
    const now = Date.now()
    for (const c of CHANNEL_DEFS) {
      const buf = this.buffers.get(c.id)!
      const intervalMs = 1000 / (c.freqHz * this.speedMultiplier)
      let debt = (this.debt.get(c.id) ?? 0) + dtMs
      let produced = 0
      while (debt >= intervalMs && produced < 500) {
        const v = this.generator.next(c)
        buf.push(now - debt, v)
        this.pushRaw(c.id, now - debt, v)
        debt -= intervalMs
        produced++
      }
      this.debt.set(c.id, debt)
    }
  }

  private pushRaw(channelId: string, t: number, v: number) {
    const ev: RawEvent = { id: this.eventId++, channelId, t, v }
    if (this.rawLog.length < RAW_LOG_CAPACITY) {
      this.rawLog.push(ev)
    } else {
      this.rawLog[this.rawLogHead] = ev
      this.rawLogHead = (this.rawLogHead + 1) % RAW_LOG_CAPACITY
    }
  }

  /** Chronologically-ordered snapshot of the raw event feed (newest last). */
  getRawLogOrdered(): RawEvent[] {
    if (this.rawLog.length < RAW_LOG_CAPACITY) return this.rawLog.slice()
    return [...this.rawLog.slice(this.rawLogHead), ...this.rawLog.slice(0, this.rawLogHead)]
  }

  totalSamples(): number {
    let total = 0
    for (const b of this.buffers.values()) total += b.count
    return total
  }
}

export const streamEngine = new StreamEngine()
