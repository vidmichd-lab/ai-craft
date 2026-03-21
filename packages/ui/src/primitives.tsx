import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';

export const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

type ClassedProps = {
  className?: string;
};

type StackGap = 'sm' | 'md' | 'lg' | 12 | 16 | 20 | 24;

type StackProps = HTMLAttributes<HTMLDivElement> &
  ClassedProps & {
    gap?: StackGap;
  };

const resolveStackGapClass = (gap: StackGap) => {
  switch (gap) {
    case 'sm':
    case 12:
      return 'ui-stack-gap-sm';
    case 'lg':
    case 20:
      return 'ui-stack-gap-lg';
    case 24:
      return 'ui-stack-gap-xl';
    case 'md':
    case 16:
    default:
      return 'ui-stack-gap-md';
  }
};

export function Stack({ gap = 'md', className, ...props }: StackProps) {
  return <div {...props} className={cx('ui-stack', resolveStackGapClass(gap), className)} />;
}

type InlineGap = 'sm' | 'md' | 'lg' | 8 | 12 | 16;

type InlineProps = HTMLAttributes<HTMLDivElement> &
  ClassedProps & {
    gap?: InlineGap;
    wrap?: boolean;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between';
  };

const resolveInlineGapClass = (gap: InlineGap) => {
  switch (gap) {
    case 'sm':
    case 8:
      return 'ui-inline-gap-sm';
    case 'lg':
    case 16:
      return 'ui-inline-gap-lg';
    case 'md':
    case 12:
    default:
      return 'ui-inline-gap-md';
  }
};

export function Inline({
  gap = 'md',
  wrap = true,
  align = 'center',
  justify = 'start',
  className,
  ...props
}: InlineProps) {
  return (
    <div
      {...props}
      className={cx(
        'ui-inline',
        resolveInlineGapClass(gap),
        !wrap && 'ui-inline-nowrap',
        align === 'start' && 'ui-inline-align-start',
        align === 'end' && 'ui-inline-align-end',
        align === 'stretch' && 'ui-inline-align-stretch',
        justify === 'center' && 'ui-inline-justify-center',
        justify === 'end' && 'ui-inline-justify-end',
        justify === 'between' && 'ui-inline-justify-between',
        className
      )}
    />
  );
}

type SurfacePadding = 'md' | 'lg' | 16 | 20 | 24;
type SurfaceRadius = 'md' | 'lg' | 20 | 24;

type SurfaceProps = HTMLAttributes<HTMLDivElement> &
  ClassedProps & {
    padding?: SurfacePadding;
    radius?: SurfaceRadius;
    tone?: 'default' | 'soft';
  };

const resolveSurfacePaddingClass = (padding: SurfacePadding) => {
  switch (padding) {
    case 16:
      return 'ui-surface-padding-md';
    case 'lg':
    case 20:
      return 'ui-surface-padding-lg';
    case 'md':
    case 24:
    default:
      return 'ui-surface-padding-xl';
  }
};

const resolveSurfaceRadiusClass = (radius: SurfaceRadius) => {
  switch (radius) {
    case 'md':
    case 20:
      return 'ui-surface-radius-md';
    case 'lg':
    case 24:
    default:
      return 'ui-surface-radius-lg';
  }
};

export function Surface({
  padding = 'md',
  radius = 'lg',
  tone = 'default',
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      {...props}
      className={cx(
        'ui-surface',
        tone === 'soft' && 'ui-surface-soft',
        resolveSurfacePaddingClass(padding),
        resolveSurfaceRadiusClass(radius),
        className
      )}
    />
  );
}

type SectionHeaderProps = ClassedProps & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  className
}: SectionHeaderProps) {
  const hasEyebrow = Boolean(eyebrow);

  return (
    <div className={cx('ui-section-header', className)}>
      {hasEyebrow ? <div className="ui-eyebrow">{eyebrow}</div> : null}
      <h2 className={cx('ui-section-title', hasEyebrow && 'ui-section-title-with-eyebrow')}>{title}</h2>
      {description ? <div className="ui-section-description">{description}</div> : null}
    </div>
  );
}

type BannerProps = HTMLAttributes<HTMLDivElement> &
  ClassedProps & {
    tone?: 'notice' | 'error';
  };

export function Banner({ tone = 'notice', className, ...props }: BannerProps) {
  return (
    <div
      {...props}
      className={cx('ui-banner', tone === 'error' ? 'ui-banner-error' : 'ui-banner-notice', className)}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ClassedProps & {
    variant?:
      | 'primary'
      | 'secondary'
      | 'neutral'
      | 'subtle'
      | 'danger'
      | 'danger-subtle'
      | 'inverted'
      | 'ghost';
    size?: 'sm' | 'md';
    fullWidth?: boolean;
    iconOnly?: boolean;
  };

export function Button({
  variant = 'neutral',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        'ui-button',
        (variant === 'primary' || variant === 'inverted') && 'ui-button-inverted',
        (variant === 'secondary' || variant === 'neutral') && 'ui-button-neutral',
        variant === 'subtle' && 'ui-button-subtle',
        variant === 'danger' && 'ui-button-danger',
        variant === 'danger-subtle' && 'ui-button-danger-subtle',
        variant === 'ghost' && 'ui-button-ghost',
        size === 'sm' && 'ui-button-sm',
        fullWidth && 'ui-button-full',
        iconOnly && 'ui-button-icon-only',
        className
      )}
    >
      {children}
    </button>
  );
}

type FieldProps = ClassedProps & {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, children, className }: FieldProps) {
  return (
    <label className={cx('ui-field', className)} htmlFor={htmlFor}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      {children}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & ClassedProps;

export function Input({ className, ...props }: InputProps) {
  return (
    <span className="ui-control-shell">
      <input {...props} className={cx('ui-input', className)} />
    </span>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & ClassedProps;

export function TextArea({ className, ...props }: TextAreaProps) {
  return (
    <span className="ui-control-shell ui-control-shell-textarea">
      <textarea {...props} className={cx('ui-textarea', className)} />
    </span>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & ClassedProps;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <span className="ui-control-shell ui-control-shell-select">
      <select {...props} className={cx('ui-select', className)}>
        {children}
      </select>
      <span className="ui-control-icon ui-control-icon-end" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6.25L8 10.25L12 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

type MetaListProps = HTMLAttributes<HTMLDivElement> & ClassedProps;

export function MetaList({ className, ...props }: MetaListProps) {
  return <div {...props} className={cx('ui-meta-list', className)} />;
}

type MetaItemProps = HTMLAttributes<HTMLDivElement> & ClassedProps;

export function MetaItem({ className, ...props }: MetaItemProps) {
  return <div {...props} className={cx('ui-meta-item', className)} />;
}

type MutedTextProps = HTMLAttributes<HTMLSpanElement> & ClassedProps;

export function MutedText({ className, ...props }: MutedTextProps) {
  return <span {...props} className={cx('ui-muted-text', className)} />;
}

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ClassedProps & {
    active?: boolean;
  };

export function TabButton({ active = false, className, ...props }: TabButtonProps) {
  return (
    <button
      {...props}
      className={cx('ui-tag-toggle', active && 'is-selected', className)}
    />
  );
}
