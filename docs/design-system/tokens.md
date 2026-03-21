# Tokens

## Canonical Token Sources

The design token source of truth for code is:

- `packages/ui/src/sds-tokens.css`
- `packages/ui/src/theme.css`

Supporting generation path:

- `scripts/generate-sds-theme.mjs`
- token inputs under `design/tokens/`

## Token Layers

### Raw SDS tokens

`packages/ui/src/sds-tokens.css` contains generated CSS custom properties such as:

- color tokens: `--sds-color-*`
- spacing and size tokens: `--sds-size-*`
- typography tokens: `--sds-typography-*`
- responsive tokens: `--sds-responsive-*`

This file is generated and must not be hand-edited.

### Semantic UI tokens

`packages/ui/src/theme.css` maps generated SDS tokens into semantic UI tokens such as:

- `--ui-color-border`
- `--ui-color-panel`
- `--ui-color-text`
- `--ui-font-family-body`
- `--ui-font-size-body`
- `--ui-space-2`
- `--ui-radius-control`

This is the canonical token layer consumed by shared components and app CSS.

The current SDS baseline is aligned against:

- the Figma Simple Design System community file
- the reference implementation in `https://github.com/figma/sds`

## Token Usage Rules

- Use `--ui-*` tokens in product styling by default.
- Use `--sds-*` tokens only when defining or extending the shared theme layer.
- Do not hardcode colors, spacing, radii, or typography in new product styles.
- Do not create duplicate token names in `apps/web`.
- Do not hand-edit `packages/ui/src/sds-tokens.css`.

## Approved Styling Stack

1. Generated SDS tokens
2. Semantic UI theme variables
3. Shared component classes in `packages/ui/src/theme.css`
4. Product CSS modules in `apps/web`

## Current Token Characteristics

The current shared theme is SDS-aligned and uses:

- grayscale neutrals
- brand/background contrast driven by SDS tokens
- spacing scale from `--sds-size-space-*`
- typography driven by `--sds-typography-*`
- semantic status colors mapped from SDS danger/positive token groups

These values are already wired into:

- `packages/ui/src/theme.css`
- `apps/web/src/app/globals.css`

Preview surfaces with data-driven colors must not bypass the token system with inline styles. When a product screen needs to show a user-defined color swatch or document preview, represent that value as content data, for example via generated preview media, rather than as ad hoc inline styling.

## Enforceable Constraints

- No new hardcoded design values in reusable UI components.
- Any new reusable visual decision must first become a token or semantic variable.
- Product-specific exceptions belong in CSS modules and still must resolve from shared tokens.
- Legacy inline colors in root `src/*` are migration debt and must not be copied into `apps/web` or `packages/ui`.
