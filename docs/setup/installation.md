# Installation

## Requirements

- Node.js 22 or newer
- npm 11 or newer

## Install

```bash
npm install
```

## Start Development

Run the whole monorepo dev pipeline:

```bash
npm run dev
```

Run only the web app:

```bash
npm --prefix apps/web run dev
```

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run typecheck:references
npm run test:unit
npm run test:workspace
npm run test:renderer
npm run build
```

## Notes

- The previous Python static-server workflow is legacy-only and is not the canonical local setup for the active architecture.
- Root `src/*` may still be used for legacy parity checks, but active development should start from the monorepo commands above.
