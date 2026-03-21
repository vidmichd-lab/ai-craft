# Naming Conventions

## Files

- React components: `kebab-case.tsx`
- CSS modules: match component name, for example `workspace-shell.module.css`
- Route handlers: `route.ts`
- Shared package entry points: `index.ts`
- Markdown docs: `kebab-case.md`

## Symbols

- React components: `PascalCase`
- hooks: `useCamelCase`
- helpers and utilities: `camelCase`
- constants: `UPPER_SNAKE_CASE`
- Zod schemas: `camelCaseSchema`
- type aliases and interfaces: `PascalCase`

## Domain Names

Use domain-explicit names rather than generic placeholders.

Prefer:

- `WorkspaceContent`
- `getWorkspaceDashboard`
- `saveWorkspaceSnapshot`
- `normalizeStoredTemplateState`

Avoid:

- `data`
- `helper`
- `manager`
- `utils` in file names unless the file is truly generic

## API Names

- Route and service names should reflect business intent, not transport detail.
- Workspace and media clients should use verb-plus-domain naming:
  - `getWorkspaceMe`
  - `saveWorkspaceTeamDefaults`
  - `requestPresignedUpload`

## CSS Class Names

- Shared UI classes in `packages/ui` use the `ui-` prefix.
- Product CSS modules use feature-specific names without global leakage.

## Enforceable Rules

- Names must reflect ownership and domain.
- Do not introduce ambiguous names when a domain-qualified name is possible.
- Keep naming consistent with existing package and route vocabulary.
