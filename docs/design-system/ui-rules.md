# UI Rules

## Enforceable Constraints

These rules are mandatory for all future UI work.

### 1. No inline styles

- Do not add React `style={...}` objects in new product or shared UI code.
- Do not set `element.style.*` in new `apps/web` code.
- Do not use `style=` HTML attributes in generated markup.

Allowed temporary exceptions:

- root legacy `src/*`
- existing transitional code in `packages/ui/src/primitives.tsx`
- existing preview swatch backgrounds where data-driven color preview is unavoidable until migrated

Those exceptions are migration debt and must not be copied.

### 2. Shared components first

- All reusable buttons, fields, dialogs, cards, tabs, segmented controls, banners, and similar controls must come from `packages/ui`.
- Product code may wrap shared components, but must not silently fork them.

### 3. Tokens only

- All reusable styling must resolve from shared tokens in `packages/ui/src/theme.css` or `packages/ui/src/sds-tokens.css`.
- Hardcoded colors, spacing, radii, and typography are forbidden in new reusable UI code.

### 4. No duplicate components

- Before creating a new UI primitive, check `packages/ui/src/*`.
- If an equivalent already exists, extend that component instead of creating a sibling implementation.

### 5. CSS ownership

- Shared component styling belongs in `packages/ui/src/theme.css`.
- Product-specific styling belongs in feature-level CSS modules inside `apps/web/src/components/*`.
- Global app styling belongs only in `apps/web/src/app/globals.css`.

### 6. Product components must stay semantic

- Business workflows belong in product components.
- Reusable visual behavior belongs in the UI package.
- App-specific state and data loading must not leak into the shared UI package.

### 7. Legacy UI patterns are not canonical

- Do not copy patterns from root `src/*`.
- Do not introduce DOM-string templating or direct DOM mutation into `apps/web`.

## Review Checklist

Before merging UI changes, verify:

- no new inline styles were added
- shared tokens were used
- shared primitives were reused where appropriate
- no duplicate UI primitive was created
- CSS landed in the correct ownership layer
