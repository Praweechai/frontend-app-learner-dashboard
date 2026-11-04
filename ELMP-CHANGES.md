# ELMP changes to upstream files

Fork of the Open edX app for the **Mission Hospital Learning Classroom** (ELMP Plan 3). Branch `elmp/verawood`, based on `release/verawood`.
Our own code lives in `src/elmp/`, shared pieces in [`elmp-classroom-kit`](https://github.com/Praweechai/elmp-classroom-kit).
Rule (C-8): plugin slots first; an upstream file is edited only when no slot or config can do the job, and every such file is listed here. CI fails if a changed upstream file is missing from this table or if more than 25 are changed (NFR-C11).

| Upstream file | Change | Why | Undo |
|---------------|--------|-----|------|
| `src/index.jsx` | `import './elmp';` (1 line); route `path="/"` → `"/*"` (1 line) | Loads our slot wiring (tutor-mfe overwrites `env.config.jsx`, `mergeConfig` is shallow; P3-1.03). `/*` lets `elmp/ClassroomPages` own nested routes `/certificates`, `/hours` (S-72, S-73) | Delete the import; restore `path="/"` |
| `src/index.test.jsx` | `jest.mock('./elmp', () => ({}))` (1 line) | Upstream test reads `subscribe` calls by position; our module adds one | Delete the line |
| `src/App.jsx` | Header import → `elmp/ClassroomHeader`; `Dashboard` import → `elmp/ClassroomPages` (2 lines) | Classroom header + pages (S-70…S-74); upstream `containers/LearnerDashboardHeader` and `containers/Dashboard` stay untouched, so their tests still run | Restore both imports |
| `src/App.test.jsx` | `jest.mock('elmp/ClassroomHeader', …)`, `jest.mock('elmp/ClassroomPages', …)` (2 lines) | Same stubs as the upstream header/dashboard mocks | Delete the lines |
| `package.json` | dependency `@elmp/classroom-kit` (git tag) | Shared Classroom kit (R-15 §3) | Remove the dependency |
| `package-lock.json` | lock entry for the kit (`git+https`, pinned commit) | `npm ci` in CI and in the Tutor image build (no SSH there) | `npm uninstall @elmp/classroom-kit` |
