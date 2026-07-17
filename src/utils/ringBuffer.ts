/**
 * Fixed-capacity ring buffer backed by typed arrays.
 *
 * Streaming dashboards that push every incoming sample onto a growing JS
 * array will eventually stall the GC. Pre-allocating a Float64Array and
 * wrapping the write pointer keeps memory flat regardless of stream
 * duration, at the cost of a bounded look-back window.
 */
export class RingBuffer {
  readonly capacity: number
  readonly t: Float64Array
  readonly v: Float64Array
  private writeIndex = 0
  private filled = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.t = new Float64Array(capacity)
    this.v = new Float64Array(capacity)
  }

  push(t: number, v: number) {
    this.t[this.writeIndex] = t
    this.v[this.writeIndex] = v
    this.writeIndex = (this.writeIndex + 1) % this.capacity
    if (this.filled < this.capacity) this.filled++
  }

  get count() {
    return this.filled
  }

  /** Returns chronologically-ordered snapshots (oldest -> newest). Allocates; call sparingly (e.g. once per render tick, not per sample). */
  snapshot(maxPoints = this.filled): { t: Float64Array; v: Float64Array } {
    const n = Math.min(maxPoints, this.filled)
    const outT = new Float64Array(n)
    const outV = new Float64Array(n)
    const start = this.filled < this.capacity ? 0 : this.writeIndex
    const total = this.filled
    const skip = total - n
    for (let i = 0; i < n; i++) {
      const srcIdx = (start + skip + i) % this.capacity
      outT[i] = this.t[srcIdx]
      outV[i] = this.v[srcIdx]
    }
    return { t: outT, v: outV }
  }

  latest(): number | null {
    if (this.filled === 0) return null
    const idx = (this.writeIndex - 1 + this.capacity) % this.capacity
    return this.v[idx]
  }
}
