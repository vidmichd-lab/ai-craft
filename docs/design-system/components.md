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
- schema renderer: `packages/ui/src/schema.tsx`

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
- `EmptyState`
- `Banner`
- `Avatar`
- `Tag`
- `Tabs`

### Recipes

These should contain reusable composed patterns rather than raw product pages.

Canonical screen-level recipes now include:

- `PageLayout`
- `PageHeader`
- `Section`
- `FormSection`
- `SettingsPanel`
- `SidebarSection`
- `InspectorSection`
- `Toolbar`
- `ToolbarGroup`
- `SplitLayout`
- `GridSection`
- `StatGroup`
- `EmptyStateLayout`

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
- Screens must be assembled from recipes in `packages/ui/src/recipes.tsx`, not from ad hoc layout JSX in `apps/web`.
- Product components may provide data, actions, and screen-specific content, but layout composition must come from recipes first.
- AI-generated UI must be emitted as validated JSON schema and rendered through `packages/ui/src/schema.tsx`; it must not emit raw React layout code.

## Migration Notes

`packages/ui/src/primitives.tsx` is the canonical class-based primitive layer. It must stay token-driven and must not regress back to inline-style composition.

Current shared migration targets now covered in `packages/ui`:

- stat summaries via `StatCard`
- empty/loading fallback shells via `EmptyState`
- segmented mode switching via `SegmentedControl`
- canonical preview-neutral primitives via `Surface`, `Stack`, `SectionHeader`, `Field`

All new shared component work must move toward:

- class-based styling
- token-based styling
- stable variant APIs

New product code must not introduce additional inline-style-driven components.
