# Performance

Target: steady 60 fps with 15,000 particles on a mid-range laptop, with graceful degradation below that.

## How it was measured

- `npm run bench -- <url> <patients> <quality|auto> <speed> <cpuThrottle>` (`scripts/bench.ts`) starts headless Chromium with the **real GPU** (ANGLE → Metal on macOS), loads the production build (`vite preview`), plays the timeline from week 0 and samples the in-app `PerfMonitor` every 500 ms for 12 s, after a 2 s warm-up.
- `fps` and frame time come from the Pixi ticker. `sceneCpuMs` is the CPU time of the scene's own per-frame work (playback clock, particle model, drift, trails, bursts, picking state, minimap), so it excludes Pixi's buffer upload and React.
- A "mid-range laptop" is emulated with CDP `Emulation.setCPUThrottlingRate` at 4× on an Apple M1 Pro (10-core, 16 GB). That's a rough CPU proxy: the GPU stays fast, which suits this workload because it's CPU-bound (15k particles updated every frame).
- In-app overlay: press **F** (or open with `?stats`) to see FPS, frame time, scene CPU time, the worst frame in the last second, the particle count, and the quality and population controls.

## Results (15,000 particles, Apple M1 Pro, Chromium + Metal)

| Scenario | Before | After |
| --- | --- | --- |
| High, 1×, no throttle | 60 fps, scene CPU 2.98 ms | **60 fps**, scene CPU **1.55 ms** |
| High, 4× speed, no throttle | 59.7 fps avg, min 53, worst frame **100 ms** | **60 fps**, min 60, worst frame **16.8 ms** |
| High, 4× CPU throttle | 42.6 fps avg, min 31 | 49–52 fps avg |
| Medium, 4× CPU throttle | n/a | 53–55 fps avg |
| Low, 4× CPU throttle | 50.7 fps avg | **58.9 fps avg**, min 55 |
| Auto, 4× CPU throttle | n/a | auto-degrades High → Medium → Low within ~6 s |
| 8,000 particles, High, 4× CPU throttle | n/a | 57 fps avg |

Throttled runs are noisy (±3 fps between runs); unthrottled runs are pinned at the 60 Hz vsync cap.

## What changed, and why

1. **Writing particle colour directly.** `Particle.tint`/`alpha` setters parse the colour through `Color.shared` and clamp on every call. The scene now writes the packed ABGR `particle.color` field itself.
2. **Static vertex buffer.** `vertex` (scale) was a dynamic ParticleContainer property, so Pixi re-computed 4 corners × 15k particles every frame. Scale only changes on filter/selection transitions and hover now, so it's static and re-uploaded via `container.update()` only when a particle's scale actually changed.
3. **Incremental particle model.** `computeFrameIncremental` skips particles that are static at both the previous and the current week (not yet screened, or settled in a sink). It's tested to produce bit-identical output to a full recompute, forwards and backwards.
4. **Sine lookup table for swarm drift.** 30k `Math.sin`/`Math.cos` calls per frame became 1024-entry LUT lookups.
5. **No Text re-rasterisation per frame.** Zone counters only touch the Pixi `Text` when the number changes (each change re-renders a texture).
6. **Ribbon geometry throttled.** Sankey bands are rebuilt at most every 0.1 week while playing (immediately when scrubbing).
7. **React update cadence tied to real time, not weeks.** Charts and KPIs re-render at ~2–3 Hz at any playback speed (the coarse week step scales with speed). Before this, 4× playback meant 4× the React work and caused the 100 ms spikes.
8. **Kaplan–Meier without per-patient objects.** Observations are packed into `Float64Array` sort keys (`time × 2 + censored`) and sorted natively, instead of 11k `{time, event}` objects per recompute.
9. **No per-frame allocations in the ticker.** All per-particle state lives in reused typed arrays (`FrameBuffers`, emphasis, offsets); trails evaluate ghosts into a 1-slot scratch buffer; the selection layer takes scalars; zone activity iterates with `forEach`; hit-testing uses a counting-sort grid in preallocated `Int32Array`s and rebuilds only when queried after the week changes.

## Quality levels

| | High | Medium | Low |
| --- | --- | --- | --- |
| Bloom | AdvancedBloom, quality 5, blur 6 | quality 3, blur 4 | off |
| Motion-trail ghosts | 6,000 | 2,500 | 0 |
| Ambient starfield | on | on | off |
| Event bursts | on | on | off |

Auto-degrade (`PerfMonitor`): if the smoothed FPS stays below 50 for 3 s, drop one level, then wait another 3 s window before dropping again. It's paused during the intro and while the tab is hidden. Picking a level manually (F overlay, or `?quality=`) turns auto-degrade off.

## Not measured / known limits

- Only Chromium was measured, and only on one machine. Firefox and Safari weren't benchmarked.
- CPU throttling is an approximation of a slower laptop; integrated-GPU fill rate (bloom at 2× DPR) isn't captured by it.
- Data generation runs in a Web Worker (~40 ms for 15k patients in Node), so it doesn't block the intro.
