# AI-Craft Design System Canonical Scope

This document defines which parts of [`/Users/vidmich/Desktop/prac/packages/ui`](#/Users/vidmich/Desktop/prac/packages/ui) are considered canonical for the React runtime in [`/Users/vidmich/Desktop/prac/apps/web`](#/Users/vidmich/Desktop/prac/apps/web).

## Canonical package

- `@ai-craft/ui` is the only design-system package for active React product surfaces.
- New product UI in [`/Users/vidmich/Desktop/prac/apps/web`](#/Users/vidmich/Desktop/prac/apps/web) should not introduce parallel primitives outside this package.
- Legacy files in [`/Users/vidmich/Desktop/prac/src/ui`](#/Users/vidmich/Desktop/prac/src/ui) remain reference-only during migration and are not canonical.

## Canonical primitives

These exports are safe to build product screens on top of.

### Base controls
- [`/Users/vidmich/Desktop/prac/packages/ui/src/primitives.tsx`](#/Users/vidmich/Desktop/prac/packages/ui/src/primitives.tsx)
  - `Button`
  - `Input`
  - `TextArea`
  - `Select`
  - `Field`
  - `Surface`
  - `SectionHeader`
  - `Banner`
  - `TabButton`

### Form wrappers
- [`/Users/vidmich/Desktop/prac/packages/ui/src/fields.tsx`](#/Users/vidmich/Desktop/prac/packages/ui/src/fields.tsx)
  - `InputField`
  - `TextareaField`
  - `SelectField`
  - `SearchField`

### Higher-level product primitives
- [`/Users/vidmich/Desktop/prac/packages/ui/src/components.tsx`](#/Users/vidmich/Desktop/prac/packages/ui/src/components.tsx)
  - `Dialog`
  - `Card`
  - `Notification`
  - `IconButton`
  - `Tabs`
  - `Tab`
  - `Tag`
  - `TagToggle`
  - `NavigationList`
  - `Menu`
  - `Accordion`
  - `CheckboxField`
  - `RadioField`
  - `SwitchField`
  - `SliderField`
  - `SegmentedControl`
  - `SegmentedControlItem`
  - `StatCard`

## Studio-specific tokens

The React studio shell should use the token layer in:

- [`/Users/vidmich/Desktop/prac/packages/ui/src/sds-tokens.css`](#/Users/vidmich/Desktop/prac/packages/ui/src/sds-tokens.css)
- [`/Users/vidmich/Desktop/prac/packages/ui/src/theme.css`](#/Users/vidmich/Desktop/prac/packages/ui/src/theme.css)

Studio-specific shell tokens currently live in `theme.css` as:

- `--studio-shell-bg`
- `--studio-surface-bg`
- `--studio-surface-soft-bg`
- `--studio-canvas-bg`
- `--studio-control-bg`
- `--studio-pill-active-bg`
- `--studio-pill-active-fg`
- `--studio-overlay-width`
- `--studio-left-rail-width`
- `--studio-right-rail-width`
- `--studio-bottom-strip-height`

## Non-canonical / demo-only exports

These files may stay in the repo, but they should not define product architecture.

- [`/Users/vidmich/Desktop/prac/packages/ui/src/recipes.tsx`](#/Users/vidmich/Desktop/prac/packages/ui/src/recipes.tsx)
  - demo layout recipes and examples
- [`/Users/vidmich/Desktop/prac/packages/ui/src/button.figma.tsx`](#/Users/vidmich/Desktop/prac/packages/ui/src/button.figma.tsx)
  - figma/code-connect helper, not runtime product UI

## Product rule

When a new screen or overlay is added in [`/Users/vidmich/Desktop/prac/apps/web`](#/Users/vidmich/Desktop/prac/apps/web):

1. Build it from canonical `@ai-craft/ui` primitives.
2. Extend tokens in `theme.css` only if the existing semantic layer is insufficient.
3. Do not recreate buttons, fields, pills, tabs, dialogs, or shell surfaces locally if a canonical variant already exists.
