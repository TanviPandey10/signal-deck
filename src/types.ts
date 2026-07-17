export interface DataPoint {
  t: number // ms timestamp
  v: number // value
}

export interface ChannelMeta {
  id: string
  label: string
  unit: string
  color: string
  baseline: number
  volatility: number
  freqHz: number // simulated samples per second
}

export interface ChannelState extends ChannelMeta {
  buffer: Float64Array // ring buffer of timestamps, paired with values
  values: Float64Array
  writeIndex: number
  count: number
  capacity: number
  visible: boolean
  lastValue: number
}

export interface DownsampleRequest {
  requestId: number
  channelId: string
  t: number[]
  v: number[]
  targetPoints: number
}

export interface DownsampleResponse {
  requestId: number
  channelId: string
  t: number[]
  v: number[]
  rawCount: number
  outCount: number
  ms: number
}

export interface PerfSample {
  fps: number
  frameMs: number
  droppedFrames: number
  ts: number
}

export interface RawEvent {
  id: number
  channelId: string
  t: number
  v: number
}
