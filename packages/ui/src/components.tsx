import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode
} from 'react';
import { Button, Surface, cx } from './primitives';

type Tone = 'neutral' | 'brand' | 'positive' | 'warning' | 'danger';

type ToneProps = {
  tone?: Tone;
};

export type TagProps = HTMLAttributes<HTMLSpanElement> &
  ToneProps & {
    variant?: 'primary' | 'secondary';
    removable?: boolean;
    selected?: boolean;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
  };

export function ButtonGroup({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-button-group', className)} {...props} />;
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={className} iconOnly {...props}>
      {children}
    </Button>
  );
}

export function Tag({
  tone = 'neutral',
  variant = 'primary',
  removable = false,
  selected = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cx(
        'ui-tag',
        `ui-tag-${tone}`,
        variant === 'secondary' && 'ui-tag-secondary',
        selected && 'is-selected',
        className
      )}
      {...props}
    >
      {leadingIcon ? <span className="ui-tag-icon">{leadingIcon}</span> : null}
      <span className="ui-tag-label">{children}</span>
      {trailingIcon ? <span className="ui-tag-icon">{trailingIcon}</span> : null}
      {removable ? (
        <span className="ui-tag-icon ui-tag-dismiss" aria-hidden="true">
          ×
        </span>
      ) : null}
    </span>
  );
}

export type TagToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function TagToggle({
  selected = false,
  className,
  children,
  ...props
}: TagToggleProps) {
  return (
    <button className={cx('ui-tag-toggle', selected && 'is-selected', className)} {...props}>
      {selected ? <span className="ui-tag-toggle-check">✓</span> : null}
      <span>{children}</span>
    </button>
  );
}

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Tabs({ className, children, ...props }: TabsProps) {
  return (
    <div className={cx('ui-tabs', className)} role="tablist" {...props}>
      {children}
    </div>
  );
}

export type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Tab({ active = false, className, children, ...props }: TabProps) {
  return (
    <button
      className={cx('ui-tab', active && 'is-active', className)}
      role="tab"
      aria-selected={active}
      {...props}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-segmented', className)} role="tablist" {...props} />;
}

export type SegmentedControlItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function SegmentedControlItem({
  active = false,
  className,
  children,
  ...props
}: SegmentedControlItemProps) {
  return (
    <button
      className={cx('ui-segmented-item', active && 'is-active', className)}
      aria-pressed={active}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
};

export function StatCard({ label, value, hint, className, ...props }: StatCardProps) {
  return (
    <div className={cx('ui-stat-card', className)} {...props}>
      <div className="ui-stat-card-label">{label}</div>
      <div className="ui-stat-card-value">{value}</div>
      {hint ? <div className="ui-stat-card-hint">{hint}</div> : null}
    </div>
  );
}

export type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'small' | 'medium' | 'large';
  shape?: 'circle' | 'square';
  src?: string | null;
  initials?: string;
  title?: ReactNode;
  description?: ReactNode;
};

export function Avatar({
  size = 'medium',
  shape = 'circle',
  src,
  initials,
  title,
  description,
  className,
  ...props
}: AvatarProps) {
  const body = (
    <span className={cx('ui-avatar-media', `ui-avatar-${size}`, `ui-avatar-${shape}`)}>
      {src ? <img src={src} alt="" className="ui-avatar-image" /> : <span>{initials || '?'}</span>}
    </span>
  );

  if (!title && !description) {
    return (
      <div className={cx('ui-avatar', className)} {...props}>
        {body}
      </div>
    );
  }

  return (
    <div className={cx('ui-avatar', 'ui-avatar-block', className)} {...props}>
      {body}
      <span className="ui-avatar-copy">
        {title ? <span className="ui-avatar-title">{title}</span> : null}
        {description ? <span className="ui-avatar-description">{description}</span> : null}
      </span>
    </div>
  );
}

export type AvatarGroupProps = HTMLAttributes<HTMLDivElement> & {
  overlap?: boolean;
  items: Array<{ id: string; src?: string | null; initials?: string }>;
  extraCount?: number;
};

export function AvatarGroup({
  overlap = false,
  items,
  extraCount = 0,
  className,
  ...props
}: AvatarGroupProps) {
  return (
    <div className={cx('ui-avatar-group', overlap && 'is-overlap', className)} {...props}>
      {items.map((item) => (
        <Avatar key={item.id} size="small" src={item.src} initials={item.initials} />
      ))}
      {extraCount > 0 ? <span className="ui-avatar-group-extra">+{extraCount}</span> : null}
    </div>
  );
}

export type NotificationProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'message' | 'alert';
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  onClose?: (() => void) | undefined;
};

export function Notification({
  variant = 'message',
  title,
  description,
  action,
  icon,
  onClose,
  className,
  ...props
}: NotificationProps) {
  return (
    <div className={cx('ui-notification', `ui-notification-${variant}`, className)} {...props}>
      <div className="ui-notification-head">
        <span className="ui-notification-icon">{icon || (variant === 'alert' ? '!' : 'i')}</span>
        <div className="ui-notification-copy">
          <div className="ui-notification-title">{title}</div>
          {description ? <div className="ui-notification-description">{description}</div> : null}
        </div>
        {onClose ? (
          <button className="ui-icon-button ui-icon-button-ghost" type="button" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>
      {action ? <div className="ui-notification-actions">{action}</div> : null}
    </div>
  );
}

export type TooltipProps = HTMLAttributes<HTMLDivElement> & {
  placement?: 'top' | 'bottom' | 'left' | 'right';
};

export function Tooltip({
  placement = 'top',
  className,
  children,
  ...props
}: TooltipProps) {
  return (
    <div className={cx('ui-tooltip', `ui-tooltip-${placement}`, className)} role="tooltip" {...props}>
      {children}
    </div>
  );
}

export type DialogProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  closeLabel?: string;
  onClose?: (() => void) | undefined;
  sheet?: boolean;
};

export function Dialog({
  title,
  description,
  actions,
  closeLabel = 'Close',
  onClose,
  sheet = false,
  className,
  children,
  ...props
}: DialogProps) {
  return (
    <div className={cx('ui-dialog-overlay', className)} {...props}>
      <div className={cx('ui-dialog', sheet && 'ui-dialog-sheet')}>
        <div className="ui-dialog-header">
          <div className="ui-dialog-copy">
            <div className="ui-dialog-title">{title}</div>
            {description ? <div className="ui-dialog-description">{description}</div> : null}
          </div>
          {onClose ? (
            <button
              className="ui-icon-button ui-icon-button-ghost"
              type="button"
              aria-label={closeLabel}
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </div>
        {children ? <div className="ui-dialog-body">{children}</div> : null}
        {actions ? <div className="ui-dialog-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'stroke' | 'brand';
  asset?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  direction?: 'horizontal' | 'vertical';
  outlined?: boolean;
};

export function Card({
  tone = 'default',
  asset,
  title,
  description,
  meta,
  direction = 'vertical',
  outlined = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        'ui-card',
        `ui-card-${tone}`,
        `ui-card-${direction}`,
        outlined && 'ui-card-outlined',
        className
      )}
      {...props}
    >
      {asset ? <div className="ui-card-asset">{asset}</div> : null}
      <div className="ui-card-body">
        {title ? <div className="ui-card-title">{title}</div> : null}
        {description ? <div className="ui-card-description">{description}</div> : null}
        {children}
        {meta ? <div className="ui-card-meta">{meta}</div> : null}
      </div>
    </div>
  );
}

export type PaginationProps = HTMLAttributes<HTMLElement> & {
  page: number;
  totalPages: number;
  onPageChange?: ((page: number) => void) | undefined;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className={cx('ui-pagination', className)} aria-label="Pagination" {...props}>
      <button
        className="ui-pagination-nav"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
      >
        ← Previous
      </button>
      <div className="ui-pagination-list">
        {pages.map((entry) => (
          <button
            key={entry}
            className={cx('ui-pagination-page', entry === page && 'is-current')}
            type="button"
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => onPageChange?.(entry)}
          >
            {entry}
          </button>
        ))}
      </div>
      <button
        className="ui-pagination-nav"
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange?.(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}

export type NavigationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  direction?: 'row' | 'column';
  size?: 'small' | 'medium';
  icon?: ReactNode;
};

export function NavigationButton({
  active = false,
  direction = 'column',
  size = 'small',
  icon,
  className,
  children,
  ...props
}: NavigationButtonProps) {
  return (
    <button
      className={cx(
        'ui-navigation-button',
        `ui-navigation-${direction}`,
        `ui-navigation-${size}`,
        active && 'is-active',
        className
      )}
      {...props}
    >
      {icon ? <span className="ui-navigation-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export type NavigationPillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function NavigationPill({
  active = false,
  className,
  children,
  ...props
}: NavigationPillProps) {
  return (
    <button className={cx('ui-navigation-pill', active && 'is-active', className)} {...props}>
      {children}
    </button>
  );
}

export function NavigationList({
  className,
  direction = 'row',
  ...props
}: HTMLAttributes<HTMLDivElement> & { direction?: 'row' | 'column' }) {
  return <div className={cx('ui-navigation-list', `ui-navigation-${direction}`, className)} {...props} />;
}

export function Menu({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-menu', className)} role="menu" {...props} />;
}

export function MenuHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-menu-header', className)} {...props} />;
}

export function MenuHeading({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-menu-heading', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cx('ui-menu-separator', className)} {...props} />;
}

export function MenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ui-menu-shortcut', className)} {...props} />;
}

export type MenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  active?: boolean;
  shortcut?: ReactNode;
};

export function MenuItem({
  icon,
  active = false,
  shortcut,
  className,
  children,
  ...props
}: MenuItemProps) {
  return (
    <button className={cx('ui-menu-item', active && 'is-active', className)} role="menuitem" {...props}>
      {icon ? <span className="ui-menu-item-icon">{icon}</span> : null}
      <span className="ui-menu-item-label">{children}</span>
      {shortcut ? <MenuShortcut>{shortcut}</MenuShortcut> : null}
    </button>
  );
}

export type AccordionItemProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  open?: boolean;
};

export function AccordionItem({
  title,
  open = false,
  className,
  children,
  ...props
}: AccordionItemProps) {
  return (
    <div className={cx('ui-accordion-item', open && 'is-open', className)} {...props}>
      <div className="ui-accordion-trigger">
        <span>{title}</span>
        <span className="ui-accordion-chevron" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </div>
      {open ? <div className="ui-accordion-panel">{children}</div> : null}
    </div>
  );
}

export function Accordion({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-accordion', className)} {...props} />;
}

export type CalendarDayButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  state?: 'default' | 'hover' | 'active' | 'hidden' | 'disabled' | 'range' | 'range-disabled';
};

export function CalendarDayButton({
  state = 'default',
  className,
  children,
  ...props
}: CalendarDayButtonProps) {
  return (
    <button className={cx('ui-calendar-day', `ui-calendar-day-${state}`, className)} {...props}>
      {children}
    </button>
  );
}

export type CalendarProps = HTMLAttributes<HTMLDivElement> & {
  monthLabel?: ReactNode;
  yearLabel?: ReactNode;
  controls?: ReactNode;
  days?: Array<ReactNode>;
};

export function Calendar({
  monthLabel = 'February',
  yearLabel = '2026',
  controls,
  days,
  className,
  ...props
}: CalendarProps) {
  return (
    <Surface className={cx('ui-calendar', className)} padding={20} radius={20} {...props}>
      <div className="ui-calendar-head">
        <div className="ui-calendar-fields">
          <span className="ui-calendar-field">{monthLabel}</span>
          <span className="ui-calendar-field">{yearLabel}</span>
        </div>
        <div className="ui-calendar-controls">{controls}</div>
      </div>
      <div className="ui-calendar-grid">
        {days ||
          Array.from({ length: 35 }, (_, index) => (
            <CalendarDayButton key={index}>{(index % 30) + 1}</CalendarDayButton>
          ))}
      </div>
    </Surface>
  );
}

export function TextHero({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cx('ui-text-hero', className)} {...props} />;
}

export function TextPageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx('ui-text-page-title', className)} {...props} />;
}

export function TextSubtitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('ui-text-subtitle', className)} {...props} />;
}

export function TextHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx('ui-text-heading', className)} {...props} />;
}

export function TextSubheading({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('ui-text-subheading', className)} {...props} />;
}

export function TextBody({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('ui-text-body', className)} {...props} />;
}

export function TextStrong({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ui-text-strong', className)} {...props} />;
}

export function TextSmall({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ui-text-small', className)} {...props} />;
}

export function TextLink({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={cx('ui-text-link', className)} {...props} />;
}

export type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  description?: ReactNode;
};

export function CheckboxField({
  label,
  description,
  className,
  ...props
}: CheckboxFieldProps) {
  return (
    <label className={cx('ui-choice', className)}>
      <input type="checkbox" className="ui-choice-input" {...props} />
      <span className="ui-choice-box" aria-hidden="true" />
      <span className="ui-choice-copy">
        {label ? <span className="ui-choice-label">{label}</span> : null}
        {description ? <span className="ui-choice-description">{description}</span> : null}
      </span>
    </label>
  );
}

export function RadioField({
  label,
  description,
  className,
  ...props
}: CheckboxFieldProps) {
  return (
    <label className={cx('ui-choice', className)}>
      <input type="radio" className="ui-choice-input" {...props} />
      <span className="ui-choice-box ui-choice-radio" aria-hidden="true" />
      <span className="ui-choice-copy">
        {label ? <span className="ui-choice-label">{label}</span> : null}
        {description ? <span className="ui-choice-description">{description}</span> : null}
      </span>
    </label>
  );
}

export type SwitchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  description?: ReactNode;
};

export function SwitchField({
  label,
  description,
  className,
  ...props
}: SwitchFieldProps) {
  return (
    <label className={cx('ui-switch', className)}>
      <span className="ui-switch-copy">
        {label ? <span className="ui-choice-label">{label}</span> : null}
        {description ? <span className="ui-choice-description">{description}</span> : null}
      </span>
      <span className="ui-switch-track">
        <input type="checkbox" className="ui-choice-input" {...props} />
        <span className="ui-switch-thumb" aria-hidden="true" />
      </span>
    </label>
  );
}

export type SliderFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  minLabel?: ReactNode;
  maxLabel?: ReactNode;
};

export function SliderField({
  label,
  minLabel,
  maxLabel,
  className,
  ...props
}: SliderFieldProps) {
  return (
    <label className={cx('ui-slider-field', className)}>
      {label ? <span className="ui-choice-label">{label}</span> : null}
      <input type="range" className="ui-slider" {...props} />
      <span className="ui-slider-meta">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </span>
    </label>
  );
}
