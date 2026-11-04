# ELMP changes to upstream files

Fork of the Open edX app for the **Mission Hospital Learning Classroom** (ELMP Plan 3). Branch `elmp/verawood`, based on `release/verawood`.
Our own code lives in `src/elmp/`, shared pieces in [`elmp-classroom-kit`](https://github.com/Praweechai/elmp-classroom-kit).
Rule (C-8): plugin slots first; an upstream file is edited only when no slot or config can do the job, and every such file is listed here. CI fails if a changed upstream file is missing from this table or if more than 25 are changed (NFR-C11).

| Upstream file | Change | Why | Undo |
|---------------|--------|-----|------|
| `src/index.jsx` | `import './elmp';` (1 line) | Loads our slot wiring. tutor-mfe overwrites `env.config.jsx` at build time and `mergeConfig` is shallow, so slots are merged after config load (P3-1.03) | Delete the line |
