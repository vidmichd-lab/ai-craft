import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import type { ReactElement, ReactNode } from 'react';
import { Banner, Button, MetaItem, MetaList, MutedText } from './primitives';
import { Card } from './components';
import { InputField, SelectField, TextareaField } from './fields';
import {
  EmptyStateLayout,
  FormSection,
  GridSection,
  InspectorSection,
  PageLayout,
  Section,
  SettingsPanel,
  SidebarSection,
  SplitLayout,
  StatGroup,
  Toolbar,
  ToolbarGroup
} from './recipes';

const uiValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({
    binding: z.string().min(1)
  })
]);

const uiVisibilitySchema = z.object({
  binding: z.string().min(1)
});

const uiOptionSchema = z.object({
  label: uiValueSchema,
  value: z.string()
});

const uiStatItemSchema = z.object({
  label: uiValueSchema,
  value: uiValueSchema,
  hint: uiValueSchema.optional()
});

const uiMetaItemSchema = z.object({
  label: uiValueSchema,
  value: uiValueSchema
});

const baseNodeSchema = z.object({
  className: z.string().optional(),
  when: uiVisibilitySchema.optional()
});

const layoutTypeSchema = z.enum(['page-layout', 'split-layout']);
const sectionTypeSchema = z.enum([
  'section',
  'form-section',
  'settings-panel',
  'sidebar-section',
  'inspector-section',
  'grid-section',
  'toolbar',
  'toolbar-group',
  'stat-group',
  'empty-state-layout'
]);
const componentTypeSchema = z.enum([
  'input-field',
  'select-field',
  'textarea-field',
  'card',
  'button',
  'banner',
  'meta-list'
]);

export const UI_SCHEMA_ALLOWED_LAYOUTS = layoutTypeSchema.options;
export const UI_SCHEMA_ALLOWED_SECTIONS = sectionTypeSchema.options;
export const UI_SCHEMA_ALLOWED_COMPONENTS = componentTypeSchema.options;

const uiNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion('type', [
    baseNodeSchema.extend({
      type: z.literal('page-layout'),
      header: uiNodeSchema.optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('split-layout'),
      variant: z.enum(['content-sidebar', 'sidebar-content', 'balanced', 'inspector-preview', 'preview-rail']).optional(),
      start: uiNodeSchema,
      end: uiNodeSchema
    }),
    baseNodeSchema.extend({
      type: z.literal('section'),
      eyebrow: uiValueSchema.optional(),
      title: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('form-section'),
      eyebrow: uiValueSchema.optional(),
      title: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('settings-panel'),
      eyebrow: uiValueSchema.optional(),
      title: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      stats: z.array(uiStatItemSchema).optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('sidebar-section'),
      eyebrow: uiValueSchema.optional(),
      title: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('inspector-section'),
      eyebrow: uiValueSchema.optional(),
      title: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('grid-section'),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal('auto-fit')]).optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('toolbar'),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('toolbar-group'),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('stat-group'),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal('auto-fit')]).optional(),
      items: z.array(uiStatItemSchema)
    }),
    baseNodeSchema.extend({
      type: z.literal('empty-state-layout'),
      title: uiValueSchema,
      description: uiValueSchema.optional(),
      actionLabel: uiValueSchema.optional(),
      action: z.string().optional()
    }),
    baseNodeSchema.extend({
      type: z.literal('input-field'),
      name: z.string().min(1),
      label: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      message: uiValueSchema.optional(),
      placeholder: uiValueSchema.optional(),
      inputType: z.enum(['text', 'email', 'number', 'password']).optional()
    }),
    baseNodeSchema.extend({
      type: z.literal('select-field'),
      name: z.string().min(1),
      label: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      message: uiValueSchema.optional(),
      placeholder: uiValueSchema.optional(),
      options: z.array(uiOptionSchema)
    }),
    baseNodeSchema.extend({
      type: z.literal('textarea-field'),
      name: z.string().min(1),
      label: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      message: uiValueSchema.optional(),
      placeholder: uiValueSchema.optional()
    }),
    baseNodeSchema.extend({
      type: z.literal('card'),
      title: uiValueSchema.optional(),
      description: uiValueSchema.optional(),
      meta: uiValueSchema.optional(),
      children: z.array(uiNodeSchema).default([])
    }),
    baseNodeSchema.extend({
      type: z.literal('button'),
      label: uiValueSchema,
      variant: z.enum(['primary', 'secondary', 'neutral', 'subtle', 'danger', 'danger-subtle', 'inverted', 'ghost']).optional(),
      buttonType: z.enum(['button', 'submit']).optional(),
      action: z.string().optional()
    }),
    baseNodeSchema.extend({
      type: z.literal('banner'),
      tone: z.enum(['notice', 'error']).optional(),
      text: uiValueSchema
    }),
    baseNodeSchema.extend({
      type: z.literal('meta-list'),
      items: z.array(uiMetaItemSchema)
    })
  ])
);

type ParsedUISchemaNode = UISchemaNode & Record<string, unknown>;

export const uiSchemaDocumentSchema = z.object({
  version: z.literal(1),
  root: uiNodeSchema
});

type ParsedUISchemaDocument = {
  version: 1;
  root: ParsedUISchemaNode;
};

export type UIValue = string | number | boolean | null | { binding: string };
export type UISchemaNode = {
  type: string;
  className?: string;
  when?: { binding: string };
  [key: string]: unknown;
};
export type UISchemaDocument = {
  version: 1;
  root: UISchemaNode;
};

export type UISchemaBindings = {
  values?: Record<string, string | number | boolean | null | undefined>;
  visibility?: Record<string, boolean>;
  actions?: Record<string, () => void>;
  onValueChange?: (name: string, value: string) => void;
};

export function parseUISchemaDocument(input: unknown): ParsedUISchemaDocument {
  return uiSchemaDocumentSchema.parse(input) as ParsedUISchemaDocument;
}

export function UISchemaRenderer({
  schema,
  bindings
}: {
  schema: UISchemaDocument | UISchemaNode;
  bindings?: UISchemaBindings;
}) {
  const document =
    typeof schema === 'object' && schema !== null && 'version' in (schema as object)
      ? (schema as UISchemaDocument)
      : ({ version: 1 as const, root: schema } as UISchemaDocument);
  const parsed = parseUISchemaDocument(document);
  return renderUISchemaNode(parsed.root, bindings);
}

export function renderUISchemaToHtml(schema: UISchemaDocument | UISchemaNode, bindings?: UISchemaBindings) {
  return renderToStaticMarkup(UISchemaRenderer({ schema, bindings }) as ReactElement);
}

function renderUISchemaNode(node: ParsedUISchemaNode, bindings?: UISchemaBindings): ReactElement | null {
  if (node.when && !bindings?.visibility?.[node.when.binding]) {
    return null;
  }

  const typedNode = node as ParsedUISchemaNode;

  switch (typedNode.type) {
    case 'page-layout':
      return (
        <PageLayout className={typedNode.className} header={typedNode.header ? renderUISchemaNode(typedNode.header as ParsedUISchemaNode, bindings) : undefined}>
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </PageLayout>
      );
    case 'split-layout':
      return (
        <SplitLayout
          className={typedNode.className}
          variant={typedNode.variant as 'content-sidebar' | 'sidebar-content' | 'balanced' | 'inspector-preview' | 'preview-rail' | undefined}
          start={renderUISchemaNode(typedNode.start as ParsedUISchemaNode, bindings)}
          end={renderUISchemaNode(typedNode.end as ParsedUISchemaNode, bindings)}
        />
      );
    case 'section':
      return (
        <Section
          className={typedNode.className}
          eyebrow={resolveRenderableValue(typedNode.eyebrow, bindings)}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
        >
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </Section>
      );
    case 'form-section':
      return (
        <FormSection
          className={typedNode.className}
          eyebrow={resolveRenderableValue(typedNode.eyebrow, bindings)}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
        >
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </FormSection>
      );
    case 'settings-panel':
      return (
        <SettingsPanel
          className={typedNode.className}
          eyebrow={resolveRenderableValue(typedNode.eyebrow, bindings)}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
          stats={typedNode.stats ? <StatGroup items={resolveStats(typedNode.stats as Array<z.infer<typeof uiStatItemSchema>>, bindings)} /> : undefined}
        >
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </SettingsPanel>
      );
    case 'sidebar-section':
      return (
        <SidebarSection
          className={typedNode.className}
          eyebrow={resolveRenderableValue(typedNode.eyebrow, bindings)}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
        >
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </SidebarSection>
      );
    case 'inspector-section':
      return (
        <InspectorSection
          className={typedNode.className}
          eyebrow={resolveRenderableValue(typedNode.eyebrow, bindings)}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
        >
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </InspectorSection>
      );
    case 'grid-section':
      return (
        <GridSection className={typedNode.className} columns={typedNode.columns as 2 | 3 | 4 | 'auto-fit' | undefined}>
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </GridSection>
      );
    case 'toolbar':
      return <Toolbar className={typedNode.className}>{renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}</Toolbar>;
    case 'toolbar-group':
      return <ToolbarGroup className={typedNode.className}>{renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}</ToolbarGroup>;
    case 'stat-group':
      return <StatGroup className={typedNode.className} columns={typedNode.columns as 2 | 3 | 4 | 'auto-fit' | undefined} items={resolveStats(typedNode.items as Array<z.infer<typeof uiStatItemSchema>>, bindings)} />;
    case 'empty-state-layout':
      return (
        <EmptyStateLayout
          className={typedNode.className}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
          action={
            typedNode.action && typedNode.actionLabel ? (
              <Button type="button" onClick={bindings?.actions?.[typedNode.action as string]}>
                {resolveUIValue(typedNode.actionLabel, bindings)}
              </Button>
            ) : undefined
          }
        />
      );
    case 'input-field':
      return (
        <InputField
          className={typedNode.className}
          label={resolveRenderableValue(typedNode.label, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
          message={resolveRenderableValue(typedNode.message, bindings)}
          placeholder={stringOrUndefined(resolveUIValue(typedNode.placeholder, bindings))}
          type={typedNode.inputType as 'text' | 'email' | 'number' | 'password' | undefined}
          value={stringOrUndefined(bindings?.values?.[typedNode.name as string]) ?? ''}
          onChange={(event) => bindings?.onValueChange?.(typedNode.name as string, event.target.value)}
        />
      );
    case 'select-field':
      return (
        <SelectField
          className={typedNode.className}
          label={resolveRenderableValue(typedNode.label, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
          message={resolveRenderableValue(typedNode.message, bindings)}
          placeholder={resolveRenderableValue(typedNode.placeholder, bindings)}
          value={stringOrUndefined(bindings?.values?.[typedNode.name as string]) ?? ''}
          onChange={(event) => bindings?.onValueChange?.(typedNode.name as string, event.target.value)}
        >
          {(typedNode.options as Array<{ label: UIValue; value: string }>).map((option) => (
            <option key={option.value} value={option.value}>
              {stringOrUndefined(resolveUIValue(option.label, bindings)) ?? ''}
            </option>
          ))}
        </SelectField>
      );
    case 'textarea-field':
      return (
        <TextareaField
          className={typedNode.className}
          label={resolveRenderableValue(typedNode.label, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
          message={resolveRenderableValue(typedNode.message, bindings)}
          placeholder={stringOrUndefined(resolveUIValue(typedNode.placeholder, bindings))}
          value={stringOrUndefined(bindings?.values?.[typedNode.name as string]) ?? ''}
          onChange={(event) => bindings?.onValueChange?.(typedNode.name as string, event.target.value)}
        />
      );
    case 'card':
      return (
        <Card
          className={typedNode.className}
          title={resolveRenderableValue(typedNode.title, bindings)}
          description={resolveRenderableValue(typedNode.description, bindings)}
          meta={resolveRenderableValue(typedNode.meta, bindings)}
        >
          {renderChildren(typedNode.children as ParsedUISchemaNode[] | undefined, bindings)}
        </Card>
      );
    case 'button':
      return (
        <Button className={typedNode.className} type={(typedNode.buttonType as 'button' | 'submit' | undefined) ?? 'button'} variant={typedNode.variant as 'primary' | 'secondary' | 'neutral' | 'subtle' | 'danger' | 'danger-subtle' | 'inverted' | 'ghost' | undefined} onClick={typedNode.action ? bindings?.actions?.[typedNode.action as string] : undefined}>
          {resolveRenderableValue(typedNode.label, bindings)}
        </Button>
      );
    case 'banner':
      return (
        <Banner className={typedNode.className} tone={typedNode.tone as 'notice' | 'error' | undefined}>
          {resolveRenderableValue(typedNode.text, bindings)}
        </Banner>
      );
    case 'meta-list':
      return (
        <MetaList className={typedNode.className}>
          {(typedNode.items as Array<{ label: UIValue; value: UIValue }>).map((item, index) => (
            <MetaItem key={index}>
              <MutedText>{resolveRenderableValue(item.label, bindings)}</MutedText>
              <span>{resolveRenderableValue(item.value, bindings)}</span>
            </MetaItem>
          ))}
        </MetaList>
      );
    default:
      return null;
  }
}

function resolveStats(items: Array<z.infer<typeof uiStatItemSchema>>, bindings?: UISchemaBindings) {
  return items.map((item) => ({
    label: resolveUIValue(item.label, bindings),
    value: resolveUIValue(item.value, bindings),
    hint: resolveUIValue(item.hint, bindings)
  }));
}

function renderChildren(children: ParsedUISchemaNode[] | undefined, bindings?: UISchemaBindings) {
  return children?.map((child, index) => {
    const rendered = renderUISchemaNode(child, bindings);
    return rendered ? <FragmentKey key={index}>{rendered}</FragmentKey> : null;
  });
}

function resolveUIValue(value: unknown, bindings?: UISchemaBindings) {
  if (value && typeof value === 'object' && 'binding' in value) {
    return bindings?.values?.[(value as { binding: string }).binding] ?? '';
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value ?? undefined;
  }
  return undefined;
}

function resolveRenderableValue(value: unknown, bindings?: UISchemaBindings): ReactNode {
  return resolveUIValue(value, bindings) as ReactNode;
}

function stringOrUndefined(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

function FragmentKey({ children }: { children: ReactElement }) {
  return children;
}

export const uiSchemaGeneratorPolicy = {
  version: 1,
  allowedLayouts: UI_SCHEMA_ALLOWED_LAYOUTS,
  allowedSections: UI_SCHEMA_ALLOWED_SECTIONS,
  allowedComponents: UI_SCHEMA_ALLOWED_COMPONENTS,
  constraints: [
    'Use only declared node types.',
    'Do not emit JSX or HTML.',
    'Do not invent new layout types or visual patterns.',
    'Treat schema as data; behavior is supplied only through external bindings.'
  ]
} as const;
