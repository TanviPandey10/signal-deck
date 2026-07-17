import { create } from 'zustand'
import { CHANNEL_DEFS } from '../utils/dataGenerator'

export type DownsampleAlgo = 'lttb' | 'stride' | 'none'

interface DashboardState {
  running: boolean
  speedMultiplier: number
  downsampleAlgo: DownsampleAlgo
  targetPoints: number
  visibleChannels: Record<string, boolean>
  selectedChannelForTable: string | 'all'
  setRunning: (r: boolean) => void
  setSpeed: (s: number) => void
  setDownsampleAlgo: (a: DownsampleAlgo) => void
  setTargetPoints: (n: number) => void
  toggleChannel: (id: string) => void
  setSelectedChannelForTable: (id: string) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  running: true,
  speedMultiplier: 1,
  downsampleAlgo: 'lttb',
  targetPoints: 800,
  visibleChannels: Object.fromEntries(CHANNEL_DEFS.map((c) => [c.id, true])),
  selectedChannelForTable: 'all',
  setRunning: (r) => set({ running: r }),
  setSpeed: (s) => set({ speedMultiplier: s }),
  setDownsampleAlgo: (a) => set({ downsampleAlgo: a }),
  setTargetPoints: (n) => set({ targetPoints: n }),
  toggleChannel: (id) =>
    set((s) => ({ visibleChannels: { ...s.visibleChannels, [id]: !s.visibleChannels[id] } })),
  setSelectedChannelForTable: (id) => set({ selectedChannelForTable: id }),
}))
