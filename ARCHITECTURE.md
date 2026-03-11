# Architecture Context: practicum-banners

Purpose: keep a stable, high-signal context for safe changes.

## A) System Model
- App type: vanilla JavaScript, browser-only, ES modules.
- Rendering target: HTML canvas (multiple preview canvases + export canvases).
- State model: centralized store with explicit mutation methods.
- Asset model: runtime discovery of files (logos/KV/bg/fonts) via HEAD checks.

## B) Non-Negotiable Invariants
1. State is mutated only via store API (`setKey`, `setState`).
2. Do not use direct external writes to internal store state.
3. Keep `data-key` / `data-value` / delegated event patterns intact.
4. Size definitions come from preset/custom config sources; avoid hardcoded size logic.
5. Asset scanner must keep cache-aware HEAD checks (`checkFileExists` + `fileExistsCache`).

## C) Render Pipeline (Operational)
1. Resolve current state and selected preview sizes.
2. Categorize formats (narrow/wide/square) in canvas manager.
3. For each canvas: call `renderToCanvas(canvas, width, height, stateWithPlatform)`.
4. Inside renderer:
   - Compute safe-area context (if configured for platform/size).
   - Compute multipliers and geometry (logo/KV/text/legal/age).
   - Draw in order: background -> overlays -> text/legal/age -> KV/logo -> guides/debug.
5. Return render metadata for downstream consumers.

## D) Fragile Zones
- Safe-area coordinate transforms in `src/renderer.js`.
- Pair synchronization and async pair switching in `src/state/store.js`.
- Logo positioning edge-cases in `src/renderer/layout.js`.
- Scanner request fan-out and probe strategy in `src/utils/assetScanner.js`.

## E) Current Conventions / Debt to Preserve
- Some state keys are intentionally lazily initialized (legacy compatibility):
  - `formatMultipliers`
  - top-level `bgImageSelected`
- For **new** state keys: always declare explicitly in `createInitialState()`.
- Preserve semantic differences between `undefined` and `null` where existing logic depends on it.

## F) Safety Checklist Before Any Change
1. Confirm target logic is not in a fragile zone; if it is, use minimal diff.
2. Check async writes for stale context guards (pair/size changes).
3. Ensure bounds and draw coordinates use the same coordinate space.
4. Avoid introducing additional scanner fan-out or uncached existence checks.
5. Keep UI behavior unchanged unless explicitly requested.
6. Re-run syntax checks for touched files (`node --check <file>`).

## G) Fast Debug Playbook
- Wrong preview asset after rapid switching:
  - Inspect async guard conditions around image load completions.
- Misaligned debug bounds vs rendered text/logo/KV:
  - Compare bounds origin and actual draw origin.
- Console flooded with 404:
  - Inspect scanner probe strategy and fallback ordering.
- KV unexpectedly hidden:
  - Validate render-context checks before delayed `setState({ showKV: false })`.

## H) Where to Start for Common Tasks
- Add/change UI behavior: `src/ui/ui.js` + relevant `src/ui/components/*`.
- Add state fields/derived behavior: `src/state/store.js`.
- Adjust visual layout rules: `src/renderer/layout.js` and `src/renderer.js`.
- Optimize startup/network discovery: `src/utils/assetScanner.js`.
- Export behavior changes: `src/exporter.js`.
