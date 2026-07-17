import type { DownsampleRequest, DownsampleResponse } from '../types'
import DataWorker from '../workers/dataProcessor.worker?worker'

type Handler = (res: DownsampleResponse) => void

/**
 * A single dedicated worker handles every channel's downsampling. One
 * worker (rather than one-per-channel) keeps memory bounded and lets the
 * browser schedule the work on one background thread while five+ charts
 * share it, which is plenty for the point-reduction workload here.
 */
class WorkerClient {
  private worker: Worker
  private requestId = 0
  private pending: Map<number, Handler> = new Map()
  lastProcessingMs = 0

  constructor() {
    this.worker = new DataWorker()
    this.worker.onmessage = (e: MessageEvent<DownsampleResponse>) => {
      const res = e.data
      this.lastProcessingMs = res.ms
      const handler = this.pending.get(res.requestId)
      if (handler) {
        handler(res)
        this.pending.delete(res.requestId)
      }
    }
  }

  downsample(
    channelId: string,
    t: Float64Array,
    v: Float64Array,
    targetPoints: number,
    algo: 'lttb' | 'stride',
    onResult: Handler
  ) {
    const requestId = this.requestId++
    this.pending.set(requestId, onResult)
    const payload: DownsampleRequest = {
      requestId,
      channelId,
      t: Array.from(t),
      v: Array.from(v),
      targetPoints,
    }
    this.worker.postMessage({ kind: 'downsample', payload, algo })
  }
}

export const workerClient = new WorkerClient()
