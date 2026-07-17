import { lttb, stride } from '../utils/lttb'
import type { DownsampleRequest, DownsampleResponse } from '../types'

// Runs entirely off the main thread. The chart posts raw ring-buffer
// snapshots here on every animation tick; this worker reduces each series
// to ~2 points per horizontal pixel before sending it back, so the main
// thread never touches more geometry than it can actually paint.

export type IncomingMessage =
  | { kind: 'downsample'; payload: DownsampleRequest; algo: 'lttb' | 'stride' }

self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data
  if (msg.kind === 'downsample') {
    const { requestId, channelId, t, v, targetPoints } = msg.payload
    const start = performance.now()
    const result = msg.algo === 'lttb' ? lttb(t, v, targetPoints) : stride(t, v, targetPoints)
    const ms = performance.now() - start

    const response: DownsampleResponse = {
      requestId,
      channelId,
      t: result.t,
      v: result.v,
      rawCount: t.length,
      outCount: result.t.length,
      ms,
    }
    ;(self as unknown as Worker).postMessage(response)
  }
}
