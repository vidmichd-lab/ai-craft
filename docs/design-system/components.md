# Components

## Canonical Component Library

Shared reusable UI components live in `packages/ui/src/*`.

Export entry:

- `packages/ui/src/index.ts`

Current component groups:

- primitives: `packages/ui/src/primitives.tsx`
- fields: `packages/ui/src/fields.tsx`
- components: `packages/ui/src/components.tsx`
- recipes: `packages/ui/src/recipes.tsx`

## Shared Component Responsibilities

### Primitives

Examples:

- `Button`
- `Surface`
- `Stack`
- `Inline`
- `SectionHeader`

These define the smallest reusable visual building blocks.

### Fields

Examples:

- input shells
- textareas
- selects
- labeled field wrappers

These define canonical form inputs and validation affordances.

### Components

Examples visible in current code:

- `Dialog`
- `SegmentedControl`
- `SegmentedControlItem`
- `StatCard`
- `Banner`
- `Avatar`
- `Tag`
- `Tabs`

### Recipes

These should contain reusable composed patterns rather than raw product pages.

## Product Components

Product-specific components belong in `apps/web/src/components/*`.

Examples:

- `apps/web/src/components/auth/workspace-content.tsx`
- `apps/web/src/components/auth/team-settings.tsx`
- `apps/web/src/components/auth/templates-library.tsx`
- `apps/web/src/components/auth/media-library.tsx`
- `apps/web/src/components/editor/public-editor-workbench.tsx`

Product components may compose shared UI primitives, but they must not redefine them.

## Component Ownership Rules

- If a component is reused across features, move it into `packages/ui`.
- If a component is business-domain specific, keep it in `apps/web/src/components`.
- If a component owns editor document logic, it may depend on `@ai-craft/editor-model`.
- If a component owns rendering output, it may depend on `@ai-craft/editor-renderer`.

## Canonical Usage Rules

- Use shared `Button` instead of raw styled button variants when possible.
- Use shared `Dialog` for modal shells.
- Use shared field wrappers and controls for forms.
- Reuse shared cards, banners, and stat components before creating new variants.
- Do not duplicate a shared component under a new name with the same behavior.

## Migration Notes

The current `packages/ui/src/primitives.tsx` still contains transitional inline style usage. That is migration debt, not a pattern to repeat.

All new shared component work must move toward:

- class-based styling
- token-based styling
- stable variant APIs

New product code must not introduce additional inline-style-driven components.
