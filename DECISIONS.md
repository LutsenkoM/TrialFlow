# Decisions

- Remote is `git@github.com-LutsenkoM:LutsenkoM/TrialFlow.git` (SSH alias for the personal account); repo name is `TrialFlow`, so Vite `base` is `/TrialFlow/`.
- ESLint 9 instead of 10: `typescript-eslint` and `eslint-plugin-react-hooks` peer ranges resolve cleanly with 9.
- TypeScript pinned to `~6.0` because `typescript-eslint` supports `<6.1`.
- Vitest 5 (not 3): Vitest 3 types don't accept Vite 8 config.
- Installs use npm 11 (`npx npm@11 install`): local npm 10.9.2 crashes in arborist (`reading 'edgesOut'`) on Vitest 5's optional peers.
- Screenshot / smoke script runs as plain TS via Node type stripping (no tsx dependency).
- Prettier skips Markdown so the docs keep hand-written formatting.
- Timeline vs. protocol time: enrollment runs to week ~23 but treatment lasts 52 protocol weeks, which can't fit a 0–52 calendar axis. Treatment is drawn at `treatmentTimeScale = 0.55` calendar weeks per protocol week, so everyone resolves by week 52. Visit labels and KM curves use protocol weeks.
- Screening takes 1–3 calendar weeks; screen-fail vs. randomization is decided at its end.
- Enrollment ramp: per-site activation week + `sqrt(u)` density (rising toward week 20); site picked by capacity weight.
- Randomization: permuted blocks of 6 per site in order of randomization date → near-exact 1:1:1.
- Dropout: constant weekly competing-risks hazards per arm and reason (exponential draw); a dropout attends only visits strictly before the dropout time.
- Patients are kept as plain objects in the zustand store (set once); per-frame rendering will use derived typed arrays, not the store.
