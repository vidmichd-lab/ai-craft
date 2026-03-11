# Project Map: practicum-banners

This document is a fast navigation map for the codebase.

## 1) Runtime Entry
- `index.html` - page shell, static includes, module entrypoint wiring.
- `src/main.js` - app bootstrap: config load, state defaults, scanners, event wiring, initial render.

## 2) Core Domains

### State
- `src/state/store.js`
  - Single source of truth for app state.
  - Public mutation API: `setKey(key, value)` and `setState(partial)`.
  - Derived-state sync logic (title/subtitle ratio, pair sync, language/default logo effects).

### Rendering
- `src/renderer.js` - orchestration of full canvas render pipeline (`renderToCanvas`).
- `src/renderer/canvas.js` - preview canvas manager, category indices, render scheduling.
- `src/renderer/layout.js` - layout-type detection, multipliers, text area, logo bounds.
- `src/renderer/kv.js` - KV placement math for vertical/horizontal/ultrawide/superwide.
- `src/renderer/background.js` - bg color/gradient/image drawing.
- `src/renderer/text.js` - wrapping, measuring, spacing-aware drawing.
- `src/renderer/textGradient.js` - readability overlay under text.
- `src/renderer/utils.js` + `src/renderer/constants.js` - geometry helpers and layout constants.

### UI
- `src/ui/ui.js` - high-level UI sync + orchestration across components.
- `src/ui/eventHandler.js` - delegated event system (`data-action`, `data-state-key`).
- `src/ui/domCache.js` - cached DOM node access.
- `src/ui/components/*`
  - `logoSelector.js`, `backgroundSelector.js`, `kvSelector.js` - asset selectors/upload.
  - `fontSelector.js` - family/weight/custom font logic.
  - `sizeManager.js`, `sizesAdmin.js` - size selection/admin controls.
  - `logoAssetsAdmin.js`, `fileManager.js` - admin/asset management flows.

### Assets, Config, Export
- `src/utils/assetScanner.js` - dynamic asset/font discovery with HEAD checks + cache.
- `src/utils/sizesConfig.js` - preset sizes load/save/import/export.
- `src/constants.js` - runtime constants and dynamic lists.
- `src/exporter.js` - multi-size export (PNG/JPG) and compression path.

## 3) State/Render/UI Call Flow
1. User action (UI controls / delegated handlers)
2. `setKey()` / `setState()` in `store.js`
3. Subscribers sync controls/UI
4. `renderer.render()` -> `canvasManager.render()`
5. `renderToCanvas()` computes layout + draws to canvas
6. Export path calls renderer internals per selected size

## 4) Infrastructure and Deployment
- `.github/workflows/deploy.yml` - deploy on push to `main`.
- `deploy.sh` - shell deploy flow to Yandex Object Storage.
- `sw.js` - service worker / caching behavior.

## 5) Known Critical Files to Re-read Before Editing
- `src/renderer.js` (safe-area offsets + KV/legal interactions)
- `src/state/store.js` (`createTitleSubtitlePair`, `setActivePairIndex`, derived sync)
- `src/renderer/layout.js` (`calculateLogoBounds`)
- `src/utils/assetScanner.js` (`checkFolderExists`, scan fan-out limits)
