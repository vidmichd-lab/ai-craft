import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';

export const cx = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const colors = {
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.1)',
  panel: '#161616',
  panelSoft: '#101010',
  field: '#0d0d0d',
  text: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.64)',
  mutedStrong: 'rgba(255, 255, 255, 0.82)',
  noticeBg: 'rgba(66, 184, 131, 0.14)',
  noticeText: '#b1f2d1',
  errorBg: 'rgba(232, 64, 51, 0.14)',
  errorText: '#ffb4ad',
  dangerBg: 'rgba(96, 28, 28, 0.45)',
  dangerBorder: 'rgba(255, 120, 120, 0.18)',
  activeBg: '#ffffff',
  activeText: '#111111'
} as const;

type WithStyle = {
  className?: string;
  style?: CSSProperties;
};

type StackProps = HTMLAttributes<HTMLDivElement> &
  WithStyle & {
    gap?: number;
  };

export function Stack({ gap = 16, style, ...props }: StackProps) {
  return <div {...props} style={{ display: 'flex', flexDirection: 'column', gap, ...style }} />;
}

type InlineProps = HTMLAttributes<HTMLDivElement> &
  WithStyle & {
    gap?: number;
    wrap?: boolean;
    align?: CSSProperties['alignItems'];
    justify?: CSSProperties['justifyContent'];
  };

export function Inline({
  gap = 12,
  wrap = true,
  align = 'center',
  justify = 'flex-start',
  style,
  ...props
}: InlineProps) {
  return (
    <div
      {...props}
      style={{
        display: 'flex',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        alignItems: align,
        justifyContent: justify,
        gap,
        ...style
      }}
    />
  );
}

type SurfaceProps = HTMLAttributes<HTMLDivElement> &
  WithStyle & {
    padding?: number;
    radius?: number;
    tone?: 'default' | 'soft';
  };

export function Surface({
  padding = 24,
  radius = 24,
  tone = 'default',
  style,
  ...props
}: SurfaceProps) {
  return (
    <div
      {...props}
      style={{
        padding,
        border: `1px solid ${colors.border}`,
        borderRadius: radius,
        background: tone === 'soft' ? colors.panelSoft : colors.panel,
        ...style
      }}
    />
  );
}

type SectionHeaderProps = WithStyle & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
  style
}: SectionHeaderProps) {
  return (
    <div className={className} style={style}>
      {eyebrow ? (
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.56)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2 style={{ margin: eyebrow ? '8px 0 0' : 0, fontSize: 24 }}>{title}</h2>
      {description ? (
        <div style={{ marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 1.4 }}>
          {description}
        </div>
      ) : null}
    </div>
  );
}

type BannerProps = HTMLAttributes<HTMLDivElement> &
  WithStyle & {
    tone?: 'notice' | 'error';
  };

export function Banner({ tone = 'notice', style, ...props }: BannerProps) {
  const palette =
    tone === 'error'
      ? { background: colors.errorBg, color: colors.errorText }
      : { background: colors.noticeBg, color: colors.noticeText };

  return (
    <div
      {...props}
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        fontSize: 12,
        lineHeight: 1.35,
        ...palette,
        ...style
      }}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  WithStyle & {
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
  style,
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
      style={style}
    >
      {children}
    </button>
  );
}

type FieldProps = WithStyle & {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, children, className, style }: FieldProps) {
  return (
    <label
      className={className}
      htmlFor={htmlFor}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...style
      }}
    >
      {label ? <span style={{ color: colors.muted, fontSize: 13 }}>{label}</span> : null}
      {children}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & WithStyle;

export function Input({ className, style, ...props }: InputProps) {
  return (
    <span className="ui-control-shell" style={style}>
      <input {...props} className={cx('ui-input', className)} />
    </span>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & WithStyle;

export function TextArea({ className, style, ...props }: TextAreaProps) {
  return (
    <span className="ui-control-shell ui-control-shell-textarea" style={style}>
      <textarea {...props} className={cx('ui-textarea', className)} />
    </span>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & WithStyle;

export function Select({ className, style, children, ...props }: SelectProps) {
  return (
    <span className="ui-control-shell ui-control-shell-select" style={style}>
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

type MetaListProps = HTMLAttributes<HTMLDivElement> & WithStyle;

export function MetaList({ style, ...props }: MetaListProps) {
  return <div {...props} style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }} />;
}

type MetaItemProps = HTMLAttributes<HTMLDivElement> & WithStyle;

export function MetaItem({ style, ...props }: MetaItemProps) {
  return <div {...props} className={cx('ui-meta-item', props.className)} style={style} />;
}

type MutedTextProps = HTMLAttributes<HTMLSpanElement> & WithStyle;

export function MutedText({ style, ...props }: MutedTextProps) {
  return <span {...props} style={{ color: colors.muted, ...style }} />;
}

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  WithStyle & {
    active?: boolean;
  };

export function TabButton({ active = false, style, ...props }: TabButtonProps) {
  return (
    <button
      {...props}
      className={cx('ui-tag-toggle', active && 'is-selected', props.className)}
      style={style}
    />
  );
}
