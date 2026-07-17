import type { ChannelMeta } from '../types'

export const CHANNEL_DEFS: ChannelMeta[] = [
  { id: 'ch1', label: 'REACTOR CORE TEMP', unit: '°C', color: '#e8934a', baseline: 340, volatility: 2.4, freqHz: 60 },
  { id: 'ch2', label: 'COOLANT FLOW RATE', unit: 'L/s', color: '#4ab8e8', baseline: 120, volatility: 4.5, freqHz: 45 },
  { id: 'ch3', label: 'TURBINE VIBRATION', unit: 'mm/s', color: '#8fe84a', baseline: 8, volatility: 1.8, freqHz: 90 },
  { id: 'ch4', label: 'GRID FREQUENCY', unit: 'Hz', color: '#c94ae8', baseline: 50, volatility: 0.05, freqHz: 30 },
  { id: 'ch5', label: 'BUS VOLTAGE', unit: 'kV', color: '#e8c94a', baseline: 400, volatility: 3.1, freqHz: 20 },
]

/** A tiny deterministic PRNG so demo runs are reproducible across reloads. */
export function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Mean-reverting random walk with an occasional spike, tuned per channel.
 * Produces the kind of noisy-but-bounded signal a real sensor/telemetry
 * feed would emit, which is what makes downsampling fidelity visible.
 */
export class SignalGenerator {
  private rng: () => number
  private state: Record<string, number> = {}

  constructor(seed = 42) {
    this.rng = mulberry32(seed)
    for (const c of CHANNEL_DEFS) this.state[c.id] = c.baseline
  }

  next(channel: ChannelMeta): number {
    const prev = this.state[channel.id]
    const revert = (channel.baseline - prev) * 0.01
    const noise = (this.rng() - 0.5) * channel.volatility
    const spike = this.rng() < 0.002 ? (this.rng() - 0.5) * channel.volatility * 12 : 0
    const next = prev + revert + noise + spike
    this.state[channel.id] = next
    return next
  }
}
