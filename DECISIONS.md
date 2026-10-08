# Decisions

- Remote is `git@github.com-LutsenkoM:LutsenkoM/TrialFlow.git` (SSH alias for the personal account); repo name is `TrialFlow`, so Vite `base` is `/TrialFlow/`.
- ESLint 9 instead of 10: `typescript-eslint` and `eslint-plugin-react-hooks` peer ranges resolve cleanly with 9.
- TypeScript pinned to `~6.0` because `typescript-eslint` supports `<6.1`.
- Vitest 5 (not 3): Vitest 3 types don't accept Vite 8 config.
- Installs use npm 11 (`npx npm@11 install`): local npm 10.9.2 crashes in arborist (`reading 'edgesOut'`) on Vitest 5's optional peers.
- Screenshot / smoke script runs as plain TS via Node type stripping (no tsx dependency).
- Prettier skips Markdown so the docs keep hand-written formatting.
