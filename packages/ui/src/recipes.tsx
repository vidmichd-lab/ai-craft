import type { HTMLAttributes, ReactNode } from 'react';
import { Button, SectionHeader, Stack, Surface, cx } from './primitives';
import {
  Avatar,
  Card,
  EmptyState,
  Menu,
  MenuItem,
  StatCard,
  TextBody,
  TextHeading
} from './components';

type RecipeSectionBaseProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
};

export type PageLayoutProps = HTMLAttributes<HTMLDivElement> & {
  header?: ReactNode;
  toolbar?: ReactNode;
};

export function PageLayout({ header, toolbar, className, children, ...props }: PageLayoutProps) {
  return (
    <div className={cx('ui-page-layout', className)} {...props}>
      {header}
      {toolbar}
      {children}
    </div>
  );
}

export type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  brand?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  brand,
  badges,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <Surface
      className={cx('ui-page-header', className)}
      padding="lg"
      radius="lg"
      {...props}
    >
      <div className="ui-page-header-main">
        <div className="ui-page-header-copy">
          {brand ? <div className="ui-page-header-brand">{brand}</div> : null}
          {title ? (
            <SectionHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
              className="ui-page-header-heading"
            />
          ) : null}
        </div>
        {(badges || actions) ? (
          <div className="ui-page-header-actions">
            {badges ? <div className="ui-page-header-badges">{badges}</div> : null}
            {actions ? <div className="ui-page-header-tools">{actions}</div> : null}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

export function Section({
  eyebrow,
  title,
  description,
  actions,
  footer,
  className,
  bodyClassName,
  children,
  ...props
}: RecipeSectionBaseProps) {
  const hasHeader = eyebrow || title || description || actions;

  return (
    <Surface className={cx('ui-section', className)} padding="lg" radius="lg" {...props}>
      <Stack gap="md">
        {hasHeader ? (
          <div className="ui-section-head">
            {title ? <SectionHeader eyebrow={eyebrow} title={title} description={description} /> : null}
            {actions ? <div className="ui-section-head-actions">{actions}</div> : null}
          </div>
        ) : null}
        <div className={cx('ui-section-body', bodyClassName)}>{children}</div>
        {footer ? <div className="ui-section-footer">{footer}</div> : null}
      </Stack>
    </Surface>
  );
}

export type FormSectionProps = RecipeSectionBaseProps;

export function FormSection(props: FormSectionProps) {
  return <Section {...props} className={cx('ui-form-section', props.className)} />;
}

export type SettingsPanelProps = RecipeSectionBaseProps & {
  stats?: ReactNode;
};

export function SettingsPanel({
  stats,
  className,
  children,
  ...props
}: SettingsPanelProps) {
  return (
    <Section {...props} className={cx('ui-settings-panel', className)}>
      {stats}
      {children}
    </Section>
  );
}

export type SidebarSectionProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
};

export function SidebarSection({
  eyebrow,
  title,
  description,
  footer,
  className,
  children,
  ...props
}: SidebarSectionProps) {
  return (
    <Surface className={cx('ui-sidebar-section', className)} padding="md" radius="lg" {...props}>
      <Stack gap="md">
        {title ? <SectionHeader eyebrow={eyebrow} title={title} description={description} /> : null}
        <div className="ui-sidebar-section-body">{children}</div>
        {footer ? <div className="ui-sidebar-section-footer">{footer}</div> : null}
      </Stack>
    </Surface>
  );
}

export type InspectorSectionProps = SidebarSectionProps;

export function InspectorSection(props: InspectorSectionProps) {
  return <SidebarSection {...props} className={cx('ui-inspector-section', props.className)} />;
}

export function Toolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-toolbar', className)} {...props} />;
}

export function ToolbarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-toolbar-group', className)} {...props} />;
}

export type SplitLayoutProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'content-sidebar' | 'sidebar-content' | 'balanced' | 'inspector-preview' | 'preview-rail';
  start: ReactNode;
  end: ReactNode;
};

export function SplitLayout({
  variant = 'content-sidebar',
  start,
  end,
  className,
  ...props
}: SplitLayoutProps) {
  return (
    <div className={cx('ui-split-layout', `ui-split-layout-${variant}`, className)} {...props}>
      <div className="ui-split-layout-start">{start}</div>
      <div className="ui-split-layout-end">{end}</div>
    </div>
  );
}

export type GridSectionProps = HTMLAttributes<HTMLDivElement> & {
  columns?: 2 | 3 | 4 | 'auto-fit';
};

export function GridSection({ columns = 'auto-fit', className, ...props }: GridSectionProps) {
  return <div className={cx('ui-grid-section', `ui-grid-section-${columns}`, className)} {...props} />;
}

type StatItem = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
};

export type StatGroupProps = HTMLAttributes<HTMLDivElement> & {
  items?: StatItem[];
  columns?: 2 | 3 | 4 | 'auto-fit';
};

export function StatGroup({
  items,
  columns = 4,
  className,
  children,
  ...props
}: StatGroupProps) {
  return (
    <div className={cx('ui-stat-group', `ui-stat-group-${columns}`, className)} {...props}>
      {items
        ? items.map((item, index) => (
            <StatCard
              key={index}
              className={item.className}
              label={item.label}
              value={item.value}
              hint={item.hint}
            />
          ))
        : children}
    </div>
  );
}

export type EmptyStateLayoutProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  media?: ReactNode;
};

export function EmptyStateLayout({
  title,
  description,
  action,
  media,
  className,
  ...props
}: EmptyStateLayoutProps) {
  return (
    <Surface className={cx('ui-empty-state-layout', className)} padding="md" radius="lg" {...props}>
      <EmptyState title={title} description={description} action={action} media={media} />
    </Surface>
  );
}

export type FormCardProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
};

export function FormCard({
  title,
  description,
  footer,
  className,
  children,
  ...props
}: FormCardProps) {
  return (
    <Surface className={cx('ui-form-card', className)} {...props}>
      <Stack gap={20}>
        <SectionHeader title={title} description={description} />
        <div className="ui-form-card-body">{children}</div>
        {footer ? <div className="ui-form-card-footer">{footer}</div> : null}
      </Stack>
    </Surface>
  );
}

export type HeroSectionProps = HTMLAttributes<HTMLElement> & {
  heading: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  media?: ReactNode;
};

export function HeroSection({
  heading,
  subtitle,
  actions,
  media,
  className,
  ...props
}: HeroSectionProps) {
  return (
    <section className={cx('ui-hero-section', className)} {...props}>
      <div className="ui-hero-copy">
        <TextHeading className="ui-text-hero">{heading}</TextHeading>
        {subtitle ? <TextBody className="ui-text-subtitle">{subtitle}</TextBody> : null}
        {actions ? <div className="ui-hero-actions">{actions}</div> : null}
      </div>
      {media ? <div className="ui-hero-media">{media}</div> : null}
    </section>
  );
}

export type PanelSectionProps = HTMLAttributes<HTMLElement> & {
  heading: ReactNode;
  body?: ReactNode;
  media?: ReactNode;
  reverse?: boolean;
};

export function PanelSection({
  heading,
  body,
  media,
  reverse = false,
  className,
  ...props
}: PanelSectionProps) {
  return (
    <section className={cx('ui-panel-section', reverse && 'is-reverse', className)} {...props}>
      <div className="ui-panel-copy">
        <TextHeading>{heading}</TextHeading>
        {body ? <TextBody>{body}</TextBody> : null}
      </div>
      {media ? <div className="ui-panel-media">{media}</div> : null}
    </section>
  );
}

export type CardGridSectionProps = HTMLAttributes<HTMLElement> & {
  heading?: ReactNode;
  cards: ReactNode;
};

export function CardGridSection({
  heading,
  cards,
  className,
  ...props
}: CardGridSectionProps) {
  return (
    <section className={cx('ui-card-grid-section', className)} {...props}>
      {heading ? <TextHeading>{heading}</TextHeading> : null}
      <div className="ui-card-grid">{cards}</div>
    </section>
  );
}

export type HeaderBarProps = HTMLAttributes<HTMLElement> & {
  brand: ReactNode;
  navigation?: ReactNode;
  actions?: ReactNode;
  auth?: ReactNode;
  mobileMenu?: ReactNode;
};

export function HeaderBar({
  brand,
  navigation,
  actions,
  auth,
  mobileMenu,
  className,
  ...props
}: HeaderBarProps) {
  return (
    <header className={cx('ui-header-bar', className)} {...props}>
      <div className="ui-header-brand">{brand}</div>
      {navigation ? <div className="ui-header-navigation">{navigation}</div> : null}
      {actions ? <div className="ui-header-actions">{actions}</div> : null}
      {auth ? <div className="ui-header-auth">{auth}</div> : null}
      {mobileMenu ? <div className="ui-header-mobile">{mobileMenu}</div> : null}
    </header>
  );
}

export type FooterSectionProps = HTMLAttributes<HTMLElement> & {
  brand: ReactNode;
  columns?: ReactNode;
  meta?: ReactNode;
};

export function FooterSection({
  brand,
  columns,
  meta,
  className,
  ...props
}: FooterSectionProps) {
  return (
    <footer className={cx('ui-footer-section', className)} {...props}>
      <div className="ui-footer-brand">{brand}</div>
      {columns ? <div className="ui-footer-columns">{columns}</div> : null}
      {meta ? <div className="ui-footer-meta">{meta}</div> : null}
    </footer>
  );
}

export type AIChatShellProps = HTMLAttributes<HTMLElement> & {
  sidebar?: ReactNode;
  messages?: Array<{ id: string; author: string; body: ReactNode; user?: boolean }>;
  composer?: ReactNode;
};

export function AIChatShell({
  sidebar,
  messages = [],
  composer,
  className,
  ...props
}: AIChatShellProps) {
  return (
    <section className={cx('ui-ai-chat', className)} {...props}>
      {sidebar ? <aside className="ui-ai-sidebar">{sidebar}</aside> : null}
      <div className="ui-ai-thread">
        <div className="ui-ai-messages">
          {messages.map((message) => (
            <div key={message.id} className={cx('ui-ai-message', message.user && 'is-user')}>
              <Avatar size="small" initials={message.author.slice(0, 1).toUpperCase()} />
              <Card
                className="ui-ai-bubble"
                title={message.author}
                description={message.body}
                direction="vertical"
              />
            </div>
          ))}
        </div>
        {composer ? <div className="ui-ai-composer">{composer}</div> : null}
      </div>
    </section>
  );
}

export type ExamplePageShellProps = HTMLAttributes<HTMLElement> & {
  header?: ReactNode;
  footer?: ReactNode;
  hero?: ReactNode;
  sidebar?: ReactNode;
};

export function ExamplePageShell({
  header,
  footer,
  hero,
  sidebar,
  className,
  children,
  ...props
}: ExamplePageShellProps) {
  return (
    <section className={cx('ui-example-page', className)} {...props}>
      {header}
      {hero}
      <div className="ui-example-body">
        {sidebar ? <aside className="ui-example-sidebar">{sidebar}</aside> : null}
        <main className="ui-example-content">{children}</main>
      </div>
      {footer}
    </section>
  );
}

export function ExampleSidebarFilters({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Surface className={cx('ui-example-filters', className)} padding={16} radius={20} {...props}>
      <Menu>
        <MenuItem>Price</MenuItem>
        <MenuItem>Categories</MenuItem>
        <MenuItem>Rating</MenuItem>
      </Menu>
    </Surface>
  );
}

export function ExampleProductGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('ui-example-product-grid', className)} {...props}>
      {Array.from({ length: 6 }, (_, index) => (
        <Card
          key={index}
          asset={<div className="ui-demo-image" />}
          title={`Product ${index + 1}`}
          description="Short description"
          meta={<TextBody>$99</TextBody>}
        />
      ))}
    </div>
  );
}

export function ExampleAuthActions() {
  return (
    <div className="ui-inline">
      <Button>Log in</Button>
      <Button variant="inverted">Start free</Button>
    </div>
  );
}
