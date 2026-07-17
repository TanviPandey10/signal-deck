import { useEffect, useMemo, useRef, useState } from 'react'
import { streamEngine } from '../../store/streamEngine'
import type { RawEvent } from '../../types'

const ROW_HEIGHT = 26
const OVERSCAN = 8
const REFRESH_MS = 200

/**
 * Windowed list: with thousands of live-updating rows, mounting one DOM
 * node per row would tank layout/paint. Instead we keep a single
 * absolutely-positioned block per visible row, sized by a spacer div, and
 * recompute the visible slice from scrollTop + container height only.
 */
export function VirtualizedTable({ filterChannel }: { filterChannel: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(400)
  const [rows, setRows] = useState<RawEvent[]>([])
  const [autoFollow, setAutoFollow] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      const all = streamEngine.getRawLogOrdered()
      const filtered = filterChannel === 'all' ? all : all.filter((r) => r.channelId === filterChannel)
      setRows(filtered)
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [filterChannel])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setViewportH(entries[0].contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (autoFollow && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [rows.length, autoFollow])

  const totalHeight = rows.length * ROW_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + OVERSCAN * 2
  const endIndex = Math.min(rows.length, startIndex + visibleCount)

  const visibleRows = useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex])

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setScrollTop(el.scrollTop)
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoFollow(atBottom)
  }

  return (
    <div className="vtable">
      <div className="vtable-head">
        <span style={{ width: 90 }}>TIME</span>
        <span style={{ width: 130 }}>CHANNEL</span>
        <span style={{ flex: 1 }}>VALUE</span>
      </div>
      <div className="vtable-body" ref={containerRef} onScroll={onScroll}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleRows.map((row, i) => (
            <div
              key={row.id}
              className="vtable-row"
              style={{ position: 'absolute', top: (startIndex + i) * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              <span style={{ width: 90 }}>{formatTime(row.t)}</span>
              <span style={{ width: 130 }}>{row.channelId.toUpperCase()}</span>
              <span style={{ flex: 1 }}>{row.v.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="vtable-foot">
        {rows.length.toLocaleString()} events buffered · rendering {visibleRows.length} DOM rows
        {!autoFollow && <button onClick={() => setAutoFollow(true)}>resume follow</button>}
      </div>
    </div>
  )
}

function formatTime(ms: number) {
  const d = new Date(ms)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d
    .getSeconds()
    .toString()
    .padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}
