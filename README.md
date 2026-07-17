 Signal Deck
A performance-critical, real-time data visualization dashboard. It streams five
simulated telemetry channels at up to ~250 samples/sec each, keeps a rolling
buffer of hundreds of thousands of points in memory, and renders all of it at
60fps — without ever handing React a large array to reconcile.
Live demo: signal-deck-phi.vercel.app


Why this exists
The brief asked for a "performance-critical data visualization dashboard."
Rather than wrap a charting library around some mock JSON, this project treats
performance as the actual design problem: how do you keep a UI fluid when the
data underneath it never stops moving and can outgrow what the DOM, or even a
single thread, can comfortably handle?
The chosen subject is a plant telemetry console — reactor core temp,
coolant flow, turbine vibration, grid frequency, bus voltage — because
instrumentation panels are the canonical real-world case for this problem:
dense, continuous, multi-channel signals that someone is actually watching
in real time.
Performance techniques used, and why
TechniqueWhereProblem it solvesCanvas 2D rendering instead of SVG/DOMCanvasChart.tsxAn SVG <path> or DOM node per data point falls over well before 10k points. Canvas draws the whole frame as one raster operation, independent of point count.Typed-array ring buffersringBuffer.tsPushing onto a growing Array for an unbounded stream causes GC pressure and unbounded memory growth. A pre-allocated Float64Array ring buffer keeps memory flat regardless of stream duration.LTTB downsampling in a Web Workerlttb.ts, dataProcessor.worker.ts, workerClient.tsYou cannot usefully paint more line segments than there are horizontal pixels. Largest-Triangle-Three-Buckets reduces a 20k-point series to ~800 points while preserving its visual shape (peaks, spikes) far better than naive stride sampling — and it runs off the main thread so it never competes with rendering or input handling.Decoupled data engine vs. render loopstreamEngine.tsData generation runs on its own requestAnimationFrame loop, completely outside React state. Components read snapshots only when they're about to paint, so 60k+ samples/sec of throughput never triggers a single React re-render.Live-edge compositingCanvasChart.tsxThe worker only refreshes a chart's downsampled history every ~120ms (no point recomputing more often than the eye can register a shape change), but the chart still redraws every frame so the newest point never looks stalled.Hand-rolled list virtualizationVirtualizedTable.tsxThe raw event log can hold thousands of rows. Only the rows intersecting the scroll viewport (plus a small overscan) are ever mounted as DOM nodes; a spacer div preserves correct scrollbar geometry.ResizeObserver over window resize listenersCanvasChart.tsx, VirtualizedTable.tsxCharts and the table size themselves to their actual container, and only recompute layout when that container changes — not on every global resize/scroll event.Real frame-timing instrumentationuseFPS.ts, PerfMonitor.tsxThe dashboard measures its own requestAnimationFrame deltas rather than trusting React DevTools' render timings, so the FPS/frame-time/dropped-frame readout in the header reflects what's actually happening on screen.
Try the performance controls yourself

DOWNSAMPLE: NONE vs LTTB vs STRIDE — switch to NONE on a fast speed
multiplier and watch frame time climb in the header as the canvas is asked
to draw raw, unreduced series. Switch back to LTTB and it flattens out.
Speed multiplier (0.5×–5×) — scales the simulated sample rate per
channel, so you can push the pipeline well past real-world telemetry rates.
Target points slider — controls how aggressively each series is
reduced before painting; watch the "raw → pts" readout and worker latency
update live.

Architecture
src/
├── store/
│   ├── streamEngine.ts     # data generation + ring buffers, outside React
│   ├── workerClient.ts     # single shared Web Worker for downsampling
│   └── useDashboardStore.ts# Zustand store for UI-facing settings only
├── workers/
│   └── dataProcessor.worker.ts
├── utils/
│   ├── lttb.ts             # LTTB + naive stride downsampling
│   ├── ringBuffer.ts       # fixed-capacity typed-array ring buffer
│   └── dataGenerator.ts    # deterministic synthetic signal generator
├── hooks/
│   └── useFPS.ts           # real frame-timing measurement
├── components/
│   ├── Chart/CanvasChart.tsx
│   ├── Table/VirtualizedTable.tsx
│   ├── Controls/Toolbar.tsx
│   └── PerfMonitor.tsx
└── App.tsx
Data flow: streamEngine generates samples every animation frame and
writes them straight into per-channel RingBuffers (no React involved). Each
CanvasChart independently pulls a windowed snapshot from its channel's
buffer on a ~120ms interval, ships it to the shared worker for LTTB
reduction, and repaints its own <canvas> every frame using the latest
reduced series. The VirtualizedTable polls the shared raw event log on its
own interval and only ever mounts the rows currently in view.
Nothing here blocks on anything else — a slow chart never stalls the table,
and a paused stream never stalls the UI.
Stack

React 18 + TypeScript, built with Vite
Zustand for the small slice of state that's actually UI-facing
Canvas 2D (no charting library) for rendering
Native Web Workers (no library) for off-thread computation
Zero UI component libraries — all styling is hand-written CSS

Running locally
bashnpm install
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint
Requires Node 18+.
Deployment
The app is a static SPA (npm run build → dist/) and needs no backend, so
any static host works. Pick one:
Option A — Vercel (recommended, vercel.json already included)

 

Built by Tanvi Pandey
