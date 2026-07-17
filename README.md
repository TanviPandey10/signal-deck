# Signal Deck

**Signal Deck** is a **performance-critical, real-time telemetry visualization dashboard** built with **React 18, TypeScript, and Canvas 2D**. It streams five simulated telemetry channels at **up to 250 samples/second each**, maintains a rolling in-memory buffer containing **hundreds of thousands of data points**, and renders smoothly at **60 FPS**—without ever passing large datasets through React's rendering pipeline.

**Live Demo:** https://signal-deck-phi.vercel.app

---

# Why Signal Deck?

The objective was to build a **performance-critical data visualization dashboard**, where performance itself becomes the primary engineering challenge.

Instead of relying on a charting library with static datasets, Signal Deck continuously processes high-frequency telemetry streams similar to those found in industrial monitoring systems.

The dashboard simulates:

* 🌡 Reactor Core Temperature
* 💧 Coolant Flow Rate
* ⚙ Turbine Vibration
* ⚡ Grid Frequency
* 🔋 Bus Voltage

These continuously updating signals represent a realistic instrumentation panel where maintaining responsiveness under heavy load is essential.

---

# Key Performance Optimizations

| Technique                          | Purpose                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Canvas 2D Rendering**            | Renders thousands of points as a single raster operation, avoiding DOM/SVG bottlenecks.                      |
| **TypedArray Ring Buffers**        | Uses pre-allocated `Float64Array` buffers for constant memory usage with zero array growth.                  |
| **LTTB Downsampling (Web Worker)** | Reduces large datasets while preserving visual fidelity. Runs off the main thread to keep the UI responsive. |
| **Separate Streaming Engine**      | Data generation runs independently of React, preventing high-frequency updates from triggering re-renders.   |
| **Live-Edge Rendering**            | Displays the latest incoming samples immediately while historical data is refreshed asynchronously.          |
| **Custom Virtualized Table**       | Only renders visible rows from large datasets, dramatically reducing DOM size.                               |
| **ResizeObserver Layouts**         | Components respond only to their own container size changes instead of global resize events.                 |
| **Real FPS Instrumentation**       | Measures actual animation frame timing instead of relying on React render metrics.                           |

---

# Performance Playground

Experiment with different rendering strategies using the built-in controls.

### Downsampling Modes

* **LTTB** – Preserves spikes and trends while minimizing rendered points.
* **Stride Sampling** – Simple fixed-interval sampling.
* **None** – Draws every point to demonstrate rendering costs.

### Speed Multiplier

Adjust the simulated sample rate from **0.5× to 5×** to stress-test the rendering pipeline.

### Target Points

Control the number of points retained after downsampling and observe:

* Raw → Rendered point count
* Worker latency
* Frame time
* FPS

---

# Architecture

```text
src/
├── components/
│   ├── Chart/
│   │   └── CanvasChart.tsx
│   ├── Controls/
│   │   └── Toolbar.tsx
│   ├── Table/
│   │   └── VirtualizedTable.tsx
│   └── PerfMonitor.tsx
│
├── hooks/
│   └── useFPS.ts
│
├── store/
│   ├── streamEngine.ts
│   ├── workerClient.ts
│   └── useDashboardStore.ts
│
├── utils/
│   ├── dataGenerator.ts
│   ├── lttb.ts
│   └── ringBuffer.ts
│
├── workers/
│   └── dataProcessor.worker.ts
│
└── App.tsx
```

---

# Data Flow

1. **streamEngine** continuously generates telemetry samples.
2. Samples are written directly into **TypedArray Ring Buffers**.
3. Each chart periodically captures a snapshot of recent data.
4. Snapshots are sent to a **shared Web Worker**.
5. The worker performs **LTTB downsampling**.
6. Canvas charts redraw every animation frame using the latest reduced dataset.
7. The event log is displayed using a custom **virtualized table**, rendering only visible rows.

Each subsystem operates independently, ensuring that expensive operations never block rendering or user interaction.

---

# Tech Stack

* React 18
* TypeScript
* Vite
* Zustand
* Canvas 2D API
* Native Web Workers
* Typed Arrays
* Custom Virtualization
* Vanilla CSS (No UI Libraries)

---

# Running Locally

```bash
npm install

npm run dev
# http://localhost:5173

npm run build

npm run preview

npm run lint
```

**Requirements**

* Node.js 18+

---

# Deployment

Signal Deck is a static Single Page Application.

```bash
npm run build
```

The generated `dist/` folder can be deployed to any static hosting provider.

Recommended platforms:

* Vercel
* Netlify
* GitHub Pages
* Cloudflare Pages

---

# Built By

**Tanvi Pandey**

Performance-focused Full Stack & Machine Learning Engineer passionate about building scalable, high-performance web applications.

