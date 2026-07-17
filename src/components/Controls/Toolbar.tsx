import { useDashboardStore } from '../../store/useDashboardStore'
import { CHANNEL_DEFS } from '../../utils/dataGenerator'
import { streamEngine } from '../../store/streamEngine'

interface Props {
  windowMs: number
  setWindowMs: (ms: number) => void
}

const WINDOW_OPTIONS = [
  { label: '5s', ms: 5_000 },
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '60s', ms: 60_000 },
]

export function Toolbar({ windowMs, setWindowMs }: Props) {
  const {
    running,
    speedMultiplier,
    downsampleAlgo,
    targetPoints,
    visibleChannels,
    setRunning,
    setSpeed,
    setDownsampleAlgo,
    setTargetPoints,
    toggleChannel,
  } = useDashboardStore()

  const handleRunToggle = () => {
    const next = !running
    setRunning(next)
    if (next) streamEngine.start()
    else streamEngine.stop()
  }

  const handleSpeed = (mult: number) => {
    setSpeed(mult)
    streamEngine.setSpeed(mult)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className={`btn ${running ? 'btn-active' : ''}`} onClick={handleRunToggle}>
          {running ? '⏸ PAUSE' : '▶ RESUME'} STREAM
        </button>
        <div className="btn-set">
          {[0.5, 1, 2, 5].map((m) => (
            <button key={m} className={`btn-chip ${speedMultiplier === m ? 'chip-active' : ''}`} onClick={() => handleSpeed(m)}>
              {m}×
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">WINDOW</span>
        <div className="btn-set">
          {WINDOW_OPTIONS.map((o) => (
            <button key={o.ms} className={`btn-chip ${windowMs === o.ms ? 'chip-active' : ''}`} onClick={() => setWindowMs(o.ms)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">DOWNSAMPLE</span>
        <div className="btn-set">
          {(['lttb', 'stride', 'none'] as const).map((a) => (
            <button key={a} className={`btn-chip ${downsampleAlgo === a ? 'chip-active' : ''}`} onClick={() => setDownsampleAlgo(a)}>
              {a.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={targetPoints}
          onChange={(e) => setTargetPoints(Number(e.target.value))}
          disabled={downsampleAlgo === 'none'}
        />
        <span className="toolbar-value">{targetPoints}pts</span>
      </div>

      <div className="toolbar-group toolbar-channels">
        <span className="toolbar-label">CHANNELS</span>
        {CHANNEL_DEFS.map((c) => (
          <label key={c.id} className="channel-toggle" style={{ borderColor: visibleChannels[c.id] ? c.color : 'transparent' }}>
            <input type="checkbox" checked={visibleChannels[c.id]} onChange={() => toggleChannel(c.id)} />
            <span style={{ color: c.color }}>{c.id.toUpperCase()}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
