# Signal Deck

A performance-critical, real-time data visualization dashboard. It streams five
simulated telemetry channels at up to ~250 samples/sec each, keeps a rolling
buffer of hundreds of thousands of points in memory, and renders all of it at
60fps — without ever handing React a large array to reconcile.

**Live demo:** _add your deployed URL here after step 3 of Deployment below_
**Repo:** _add your GitHub URL here_

> Tip: after your first deploy, take a screenshot of the running dashboard,
> save it as `docs/screenshot.png`, and add
> `![Signal Deck](docs/screenshot.png)` back here — a visual at the top of
> the README goes a long way in a review.

---

## Why this exists

The brief asked for a "performance-critical data visualization dashboard."
Rather than wrap a charting library around some mock JSON, this project treats
performance as the actual design problem: how do you keep a UI fluid when the
data underneath it never stops moving and can outgrow what the DOM, or even a
single thread, can comfortably handle?

The chosen subject is a **plant telemetry console** — reactor core temp,
coolant flow, turbine vibration, grid frequency, bus voltage — because
instrumentation panels are the canonical real-world case for this problem:
dense, continuous, multi-channel signals that someone is actually watching
in real time.

## Performance techniques used, and why

| Technique | Where | Problem it solves |
|---|---|---|
| **Canvas 2D rendering instead of SVG/DOM** | `CanvasChart.tsx` | An SVG `<path>` or DOM node per data point falls over well before 10k points. Canvas draws the whole frame as one raster operation, independent of point count. |
| **Typed-array ring buffers** | `ringBuffer.ts` | Pushing onto a growing `Array` for an unbounded stream causes GC pressure and unbounded memory growth. A pre-allocated `Float64Array` ring buffer keeps memory flat regardless of stream duration. |
| **LTTB downsampling in a Web Worker** | `lttb.ts`, `dataProcessor.worker.ts`, `workerClient.ts` | You cannot usefully paint more line segments than there are horizontal pixels. Largest-Triangle-Three-Buckets reduces a 20k-point series to ~800 points while preserving its visual shape (peaks, spikes) far better than naive stride sampling — and it runs off the main thread so it never competes with rendering or input handling. |
| **Decoupled data engine vs. render loop** | `streamEngine.ts` | Data generation runs on its own `requestAnimationFrame` loop, completely outside React state. Components read snapshots only when they're about to paint, so 60k+ samples/sec of throughput never triggers a single React re-render. |
| **Live-edge compositing** | `CanvasChart.tsx` | The worker only refreshes a chart's downsampled history every ~120ms (no point recomputing more often than the eye can register a shape change), but the chart still redraws every frame so the newest point never looks stalled. |
| **Hand-rolled list virtualization** | `VirtualizedTable.tsx` | The raw event log can hold thousands of rows. Only the rows intersecting the scroll viewport (plus a small overscan) are ever mounted as DOM nodes; a spacer div preserves correct scrollbar geometry. |
| **`ResizeObserver` over window resize listeners** | `CanvasChart.tsx`, `VirtualizedTable.tsx` | Charts and the table size themselves to their actual container, and only recompute layout when that container changes — not on every global resize/scroll event. |
| **Real frame-timing instrumentation** | `useFPS.ts`, `PerfMonitor.tsx` | The dashboard measures its own `requestAnimationFrame` deltas rather than trusting React DevTools' render timings, so the FPS/frame-time/dropped-frame readout in the header reflects what's actually happening on screen. |

### Try the performance controls yourself

- **DOWNSAMPLE: NONE vs LTTB vs STRIDE** — switch to `NONE` on a fast speed
  multiplier and watch frame time climb in the header as the canvas is asked
  to draw raw, unreduced series. Switch back to `LTTB` and it flattens out.
- **Speed multiplier (0.5×–5×)** — scales the simulated sample rate per
  channel, so you can push the pipeline well past real-world telemetry rates.
- **Target points slider** — controls how aggressively each series is
  reduced before painting; watch the "raw → pts" readout and worker latency
  update live.

## Architecture

```
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
```

**Data flow:** `streamEngine` generates samples every animation frame and
writes them straight into per-channel `RingBuffer`s (no React involved). Each
`CanvasChart` independently pulls a windowed snapshot from its channel's
buffer on a ~120ms interval, ships it to the shared worker for LTTB
reduction, and repaints its own `<canvas>` every frame using the latest
reduced series. The `VirtualizedTable` polls the shared raw event log on its
own interval and only ever mounts the rows currently in view.

Nothing here blocks on anything else — a slow chart never stalls the table,
and a paused stream never stalls the UI.

## Stack

- React 18 + TypeScript, built with Vite
- Zustand for the small slice of state that's actually UI-facing
- Canvas 2D (no charting library) for rendering
- Native Web Workers (no library) for off-thread computation
- Zero UI component libraries — all styling is hand-written CSS

## Running locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint
```

Requires Node 18+.

## Deployment

The app is a static SPA (`npm run build` → `dist/`) and needs no backend, so
any static host works. Pick one:

### Option A — Vercel (recommended, `vercel.json` already included)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` (Vercel usually detects both automatically from
   `vercel.json`).
4. Deploy. You'll get a `*.vercel.app` URL.

### Option B — Netlify (`netlify.toml` already included)

1. [app.netlify.com/start](https://app.netlify.com/start) → import the
   GitHub repo.
2. Build command `npm run build`, publish directory `dist` (already set in
   `netlify.toml`).
3. Deploy.

### Option C — GitHub Pages (workflow already included)

1. Repo Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Push to `main` — `.github/workflows/deploy.yml` builds and publishes
   `dist/` automatically. The workflow sets `VITE_BASE_PATH` to the repo name
   so asset URLs resolve correctly under `/<repo>/`.
3. Your app will be live at `https://<username>.github.io/<repo>/`.

After deploying, put the live URL at the top of this README and in the repo's
"About" section on GitHub.

## What I'd add next

- A `requestIdleCallback`-scheduled variant of the downsample refresh so it
  never runs during an input-handling burst (drag/zoom).
- Pointer-driven zoom/pan on the canvas with a min/max-preserving LOD swap.
- Web Worker pooling (one worker per 2-3 channels) once channel count grows
  well past what a single worker can downsample within a frame budget.
- Playwright performance regression tests asserting frame time stays under
  budget at a fixed synthetic load.

## License

MIT — see `LICENSE`.
