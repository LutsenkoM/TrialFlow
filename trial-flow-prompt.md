# Trial Flow — autonomous build brief for Claude Code

## Role and mode of work

You are a senior frontend engineer building a portfolio-grade project end to end, **autonomously**.

- Do not stop to ask me questions. When something is ambiguous, pick the most reasonable option, record it in `DECISIONS.md` (one line: decision + why), and keep going.
- Work in milestones (below). After each milestone, run the quality gate, then **commit and push**.
- If a step fails, fix it yourself. If you are truly blocked after 3 different attempts, write the problem to `BLOCKERS.md`, commit it, push, and move on to the next milestone that doesn't depend on it.
- Never commit secrets, `.env` files, or `node_modules`.
- At the very end, print a short summary: what was built, what's left, and the live URL.

## The product

**Trial Flow** is an interactive 2D visualization of a (fictional) clinical trial. Thousands of patient particles flow through the stages of a study over time:

`Screening → (Screen fail | Randomization) → Treatment arms → Scheduled visits → Completed | Discontinued`

The viewer can scrub a timeline (week 0 → week 52), watch where patients accumulate or drop out, compare arms, filter the population, and click any particle to inspect one patient.

All data is **synthetic and generated in the browser** from a fixed seed. No backend, no real patient data. Show a small "Synthetic data — for demonstration only" badge in the UI.

## Tech stack (use these, latest stable versions)

- Vite + React 19 + TypeScript (`strict: true`)
- `pixi.js` v8 for rendering, `@pixi/react` v8 for the React bridge
- `pixi-viewport` for pan / zoom / pinch
- `pixi-filters` for glow / blur effects
- `gsap` (with PixiPlugin) for transitions between states
- `zustand` for app state (single source of truth shared by React UI and the Pixi ticker)
- `motion` (Framer Motion) for React UI animation, `lucide-react` for icons
- Playwright (dev only) for design-review screenshots
- Vitest for unit tests, ESLint + Prettier
- Plain CSS modules or a minimal CSS setup for the UI shell — no heavy UI kit

If a library version conflicts with Pixi v8 / React 19, choose a compatible alternative and note it in `DECISIONS.md`.

## Synthetic data spec

Write a deterministic generator in `src/data/` using a seeded PRNG (implement mulberry32 or similar; no `Math.random` in data code).

Study config (put it in one `studyConfig.ts`):
- Study: "TF-301", a Phase III, 52-week, double-blind study
- Arms: Placebo, Low Dose, High Dose (1:1:1 randomization)
- Sites: 8 sites with fictional names and countries
- Patients screened: ~8,000 (configurable; must also run at 15,000)
- Enrollment ramp: screening spread over weeks 0–20, heavier at sites with higher "capacity"
- Screen-fail rate ~25%
- Visit schedule: weeks 2, 4, 8, 12, 16, 24, 32, 40, 52
- Discontinuation: per-arm weekly hazard that differs (High Dose more adverse-event dropouts, Placebo more lack-of-efficacy dropouts). Reasons: Adverse event, Lack of efficacy, Withdrawal of consent, Lost to follow-up
- Patient fields: `id`, `siteId`, `age` (18–80), `sex`, `arm | null`, `screeningWeek`, and an ordered `events[]` timeline (`screened`, `screen_failed`, `randomized`, `visit`, `discontinued{reason}`, `completed`), each with a week (fractional allowed)

Expose a pure function `getPatientStateAt(patient, week)` → current stage + progress within it. Unit-test the generator (determinism with the same seed, rates within tolerance, events are chronologically ordered) and `getPatientStateAt`.

## Visual design — this is a showcase, design quality is a top priority

The result must look like a premium, award-site-level data experience (think Linear / Vercel / Stripe-level polish, data-art sensibility), not a default dashboard. Visual richness and motion are core features, not decoration. Every screen should look good in a screenshot.

**Art direction**
- Dark, deep background (near-black navy, not pure black) with a subtle animated gradient mesh / noise-grain layer behind the scene
- One luminous accent per arm (e.g. cyan, violet, amber) on top of desaturated neutrals; define everything as design tokens in one `theme.ts` + CSS variables (colors, radii, spacing, shadows, durations, easings)
- Typography: a modern variable sans (Inter or Geist) for UI, a tabular mono for numbers; strong hierarchy, generous spacing, tabular figures in all stats
- UI panels: glassmorphism (translucent, backdrop blur, 1px inner border, soft shadow), rounded corners, consistent 8px grid
- Icons: `lucide-react`

**The scene (Pixi)**
- Stages are labelled zones laid out left → right; arms split into three glowing lanes after randomization; visits are luminous tick marks along each lane; Completed and Discontinued are "sinks" at the right / bottom
- Faint flow ribbons (Sankey-like bands drawn with Pixi Graphics) under the particles, whose thickness reflects how many patients passed through each path up to the current week; they grow smoothly as time advances
- Particles: soft glowing dots from one shared radial-gradient texture, additive blending; color = arm (neutral grey before randomization); short motion trails for moving particles (e.g. a fading trail buffer or a render-texture feedback pass)
- Bloom on the particle layer (`AdvancedBloomFilter` / `GlowFilter` from `pixi-filters`), tuned to stay tasteful
- Organic motion: smooth bezier paths between zones, per-particle jitter, eased speed, slight swarm/noise drift while idling in a zone
- Event bursts: a small ripple / sparkle when a patient is randomized, a soft upward pulse on completion, a dim fade-and-fall when discontinued (grouped by reason in the sink)
- Zones pulse subtly when activity in them spikes
- Ambient background particles / starfield with slow parallax tied to the camera

**Data visualizations (in addition to the scene)**
- Live KPI cards with animated count-up numbers and sparklines
- Retention curves per arm (Kaplan–Meier style) that draw themselves as the timeline plays, with a moving "now" cursor
- Discontinuation reasons as an animated donut or stacked bar per arm
- Enrollment by site: a small heatmap (sites × weeks) highlighting the current week column
- Minimap of the whole scene with the current viewport rectangle
- Patient card: animated vertical event timeline, arm-colored accent, mini "journey" path showing where this patient went
- Charts can be Pixi Graphics or React + SVG with `motion` animations; no heavy chart library. All charts share the theme tokens.

**Motion design**
- Use `motion` (Framer Motion) for React UI and GSAP for Pixi. Define shared easing curves and durations in tokens and use them everywhere
- Cinematic intro on first load (~2.5 s, skippable): title reveal, zones draw in with line animations, particles stream in from the left, camera eases into the default view
- Staggered entrance for panels and cards; spring animations on hover/press; smooth layout transitions when panels open or filters change
- Selecting a patient: camera smoothly flies to the particle, the particle gets a halo ring, others dim, then the card slides in
- Changing filters: matching particles brighten and gently scale, non-matching ones fade and blur (animated, never instant)
- Respect `prefers-reduced-motion`: keep the data, drop non-essential animation

**Performance guard for effects**
Visual quality must not break the 60 fps target. Implement a quality setting (High / Medium / Low) that toggles bloom, trails, ambient layer and particle count; auto-drop one level if FPS stays below 50 for 3 seconds.

**Responsive**
Works from 1440px desktop down to a 390px phone; on mobile, panels become a draggable bottom sheet and charts collapse into swipeable cards.

**Self-review of design**
After M2, M5 and M6, take screenshots of the app (install Playwright as a dev dependency and write a small script `scripts/screenshot.ts` for desktop and mobile viewports), look at them, critique them honestly against this section (hierarchy, spacing, contrast, color harmony, clutter, "does this look premium?"), fix the top issues, and save the final screenshots to `docs/screenshots/` for the README.

## Features by milestone

Commit + push at the end of every milestone (see Git workflow).

**M0 — Scaffold**
Vite React TS project, lint/format/test scripts, folder structure, `README.md` stub, `DECISIONS.md`, `.gitignore`. Empty Pixi stage rendering via `@pixi/react`.

**M1 — Data**
Seeded generator, study config, `getPatientStateAt`, unit tests. A tiny debug panel prints counts per stage for a given week.

**M2 — Scene and particles**
Stage zones with labels, all patients rendered as particles in a `ParticleContainer` (or the v8-appropriate high-performance container), positions computed from `getPatientStateAt` for the current week. Static week first.

**M3 — Timeline**
Play / pause, speed (0.5×, 1×, 2×, 4×), scrubber from week 0 to 52 with visit markers. Particle movement interpolated in the Pixi ticker, not in React renders. Scrubbing backwards must work.

**M4 — Camera and interaction**
`pixi-viewport` pan / zoom / pinch with sensible clamps. Hover highlights a particle; click opens a side panel with the patient card: id, site, age, sex, arm, event timeline as a mini vertical list, current status. Efficient hit-testing (spatial grid or similar — do not iterate 15k display objects per pointer move).

**M5 — Filters and insights**
Filters: arm, site, sex, age range, status. Non-matching particles dim (alpha + optional blur filter), matching ones get a subtle glow. A live stats bar: screened, randomized, active, completed, discontinued by reason, per arm, for the current week. A small Kaplan–Meier-style retention line chart per arm (draw it with Pixi Graphics or plain SVG in React — no chart library needed).

**M6 — Polish**
GSAP transitions when filters change and when jumping on the timeline; intro animation on first load; keyboard controls (space = play/pause, ←/→ = step a week, +/- = zoom); accessible UI controls (labels, focus states, `prefers-reduced-motion` disables non-essential animation); loading state while data generates (use a Web Worker if generation takes > 100 ms).

**M7 — Performance pass**
Target: steady 60 fps with 15,000 particles on a mid-range laptop. Add a hidden FPS / particle-count overlay toggled with `F`. Avoid per-frame allocations in the ticker, reuse typed arrays for positions, batch updates. Write what you measured and changed to `PERFORMANCE.md`.

**M8 — Ship**
GitHub Actions workflow that runs lint + test + build on every push and deploys `main` to GitHub Pages (set Vite `base` correctly). Final `README.md`: one-paragraph pitch, live link, feature list, architecture section (how React, Zustand and the Pixi ticker share state and why particles bypass React), data-generation section, performance notes, how to run locally, "synthetic data" disclaimer.

## Architecture rules

- React owns UI chrome; Pixi owns the canvas. React never re-renders per frame.
- Zustand store holds: current week, playing state, speed, filters, selected patient id. The Pixi ticker reads from the store via `getState()` / subscriptions, not via props.
- Pure, testable logic (data, state-at-week, layout math, hit-testing) lives outside components in `src/core/` or `src/data/`.
- No `any`. Small files, clear names.

Suggested structure:
```
src/
  app/          # App shell, layout, panels
  scene/        # Pixi stage, layers, particle system, viewport
  core/         # layout math, interpolation, hit-testing
  data/         # PRNG, generator, study config, types
  store/        # zustand store
  ui/           # timeline, filters, patient card, stats
  workers/      # data generation worker (if needed)
```

## Quality gate (before every commit)

1. `npm run lint` passes
2. `npm run test` passes
3. `npm run build` passes
4. Start the dev/preview server briefly and confirm there are no runtime errors in the console for the main flow (if you can't run a browser, at least ensure the build output loads without errors in a quick smoke check)

Do not commit code that fails the gate. Fix first.

## Git workflow

- The repository already exists and has a remote named `origin`. Check with `git remote -v` at the start. If there is no remote, create the repo with `gh repo create trial-flow --public --source=. --push` (if `gh` is available and authenticated); otherwise keep committing locally and note it in `BLOCKERS.md`.
- Work directly on `main` (solo portfolio project).
- Small, logical commits using Conventional Commits, e.g. `feat(scene): render patient particles`, `test(data): verify screen-fail rate`, `perf(scene): reuse typed arrays in ticker`, `docs: add architecture section`.
- At the end of every milestone: quality gate → commit → `git push origin main`.
- If a push fails, pull with rebase, resolve, and push again.

## Definition of done

- Live on GitHub Pages, CI green
- All milestones M0–M8 complete or explicitly listed in `BLOCKERS.md` with a reason
- 15k particles at ~60 fps, timeline scrubbing works both directions, click-to-inspect works, filters work
- It looks premium and alive: bloom, trails, flow ribbons, cinematic intro, animated charts, smooth camera and UI transitions all in place, and it still holds ~60 fps on High or auto-degrades gracefully
- README opens with a hero screenshot (or GIF) and reads well for a hiring manager in under 2 minutes

Start now with M0.
