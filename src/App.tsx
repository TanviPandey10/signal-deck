import { useEffect, useState } from 'react'
import { CanvasChart } from './components/Chart/CanvasChart'
import { VirtualizedTable } from './components/Table/VirtualizedTable'
import { PerfMonitor } from './components/PerfMonitor'
import { Toolbar } from './components/Controls/Toolbar'
import { streamEngine } from './store/streamEngine'
import { useDashboardStore } from './store/useDashboardStore'
import { CHANNEL_DEFS } from './utils/dataGenerator'

export default function App() {
  const { running, downsampleAlgo, targetPoints, visibleChannels, selectedChannelForTable, setSelectedChannelForTable } =
    useDashboardStore()
  const [windowMs, setWindowMs] = useState(15_000)

  useEffect(() => {
    streamEngine.start()
    return () => streamEngine.stop()
  }, [])

  const visible = CHANNEL_DEFS.filter((c) => visibleChannels[c.id])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div>
            <h1>SIGNAL DECK</h1>
            <p>real-time telemetry console</p>
          </div>
        </div>
        <PerfMonitor />
      </header>

      <Toolbar windowMs={windowMs} setWindowMs={setWindowMs} />

      <main className="main-grid">
        <section className="chart-column">
          {visible.length === 0 && <div className="empty-state">No channels selected — enable one above to see live data.</div>}
          {visible.map((channel) => (
            <CanvasChart
              key={channel.id}
              channel={channel}
              index={CHANNEL_DEFS.findIndex((c) => c.id === channel.id)}
              targetPoints={targetPoints}
              algo={downsampleAlgo}
              windowMs={windowMs}
              running={running}
            />
          ))}
        </section>

        <aside className="table-column">
          <div className="table-column-head">
            <span className="toolbar-label">EVENT LOG</span>
            <select value={selectedChannelForTable} onChange={(e) => setSelectedChannelForTable(e.target.value)}>
              <option value="all">ALL CHANNELS</option>
              {CHANNEL_DEFS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <VirtualizedTable filterChannel={selectedChannelForTable} />
        </aside>
      </main>

      <footer className="app-footer">
        <span>React 18 · Canvas 2D · Web Worker (LTTB) · Typed-array ring buffers</span>
        <span>Built as a frontend performance R&amp;D exercise</span>
      </footer>
    </div>
  )
}
