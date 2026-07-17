/**
 * Largest-Triangle-Three-Buckets downsampling.
 *
 * Reduces an ordered (t, v) series to `threshold` points while preserving
 * the visual shape of the signal far better than naive stride/decimation
 * sampling. Runs in O(n) and is cheap enough to execute per-frame on a
 * worker thread for series in the 10k-200k point range.
 *
 * Reference: Sveinn Steinarsson, "Downsampling Time Series for Visual
 * Representation" (2013).
 */
export function lttb(t: Float64Array | number[], v: Float64Array | number[], threshold: number): { t: number[]; v: number[] } {
  const n = t.length
  if (threshold >= n || threshold <= 2) {
    return { t: Array.from(t), v: Array.from(v) }
  }

  const sampledT: number[] = new Array(threshold)
  const sampledV: number[] = new Array(threshold)

  const bucketSize = (n - 2) / (threshold - 2)

  let a = 0 // index of last selected point
  sampledT[0] = t[0]
  sampledV[0] = v[0]

  for (let i = 0; i < threshold - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n)

    // average point of next bucket, used as the triangle's third vertex
    let avgT = 0
    let avgV = 0
    const nextStart = bucketEnd
    const nextEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, n)
    const avgRangeLength = Math.max(nextEnd - nextStart, 1)
    for (let j = nextStart; j < nextEnd; j++) {
      avgT += t[j] ?? t[n - 1]
      avgV += v[j] ?? v[n - 1]
    }
    avgT /= avgRangeLength
    avgV /= avgRangeLength

    const pointAT = t[a]
    const pointAV = v[a]

    let maxArea = -1
    let maxAreaIndex = bucketStart

    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (pointAT - avgT) * (v[j] - pointAV) - (pointAT - t[j]) * (avgV - pointAV)
      ) * 0.5

      if (area > maxArea) {
        maxArea = area
        maxAreaIndex = j
      }
    }

    sampledT[i + 1] = t[maxAreaIndex]
    sampledV[i + 1] = v[maxAreaIndex]
    a = maxAreaIndex
  }

  sampledT[threshold - 1] = t[n - 1]
  sampledV[threshold - 1] = v[n - 1]

  return { t: sampledT, v: sampledV }
}

/** Naive stride decimation — kept for the on-screen "downsampling off" comparison mode. */
export function stride(t: Float64Array | number[], v: Float64Array | number[], threshold: number): { t: number[]; v: number[] } {
  const n = t.length
  if (threshold >= n) return { t: Array.from(t), v: Array.from(v) }
  const step = n / threshold
  const outT: number[] = []
  const outV: number[] = []
  for (let i = 0; i < threshold; i++) {
    const idx = Math.min(n - 1, Math.floor(i * step))
    outT.push(t[idx])
    outV.push(v[idx])
  }
  return { t: outT, v: outV }
}
