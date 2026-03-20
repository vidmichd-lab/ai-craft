import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import { cx } from './primitives';

type FieldState = 'default' | 'error';

type FieldFrameProps = {
  className?: string;
  label?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  state?: FieldState;
  disabled?: boolean;
  children: ReactNode;
};

function FieldFrame({
  className,
  label,
  description,
  message,
  state = 'default',
  disabled = false,
  children
}: FieldFrameProps) {
  return (
    <label
      className={cx(
        'ui-field-block',
        state === 'error' && 'is-error',
        disabled && 'is-disabled',
        className
      )}
    >
      {label || description ? (
        <span className="ui-field-head">
          {label ? <span className="ui-field-label-lg">{label}</span> : null}
          {description ? <span className="ui-field-description">{description}</span> : null}
        </span>
      ) : null}
      {children}
      {message ? (
        <span className={cx('ui-field-message', state === 'error' && 'is-error')}>{message}</span>
      ) : null}
    </label>
  );
}

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  state?: FieldState;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  shellClassName?: string;
  inputClassName?: string;
};

export function InputField({
  className,
  label,
  description,
  message,
  state = 'default',
  disabled = false,
  leadingIcon,
  trailingIcon,
  shellClassName,
  inputClassName,
  ...props
}: InputFieldProps) {
  return (
    <FieldFrame
      className={className}
      label={label}
      description={description}
      message={message}
      state={state}
      disabled={disabled}
    >
      <span className={cx('ui-control-shell', shellClassName, state === 'error' && 'is-error')}>
        {leadingIcon ? <span className="ui-control-icon">{leadingIcon}</span> : null}
        <input {...props} disabled={disabled} className={cx('ui-input', inputClassName)} />
        {trailingIcon ? <span className="ui-control-icon ui-control-icon-end">{trailingIcon}</span> : null}
      </span>
    </FieldFrame>
  );
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  state?: FieldState;
  textareaClassName?: string;
};

export function TextareaField({
  className,
  label,
  description,
  message,
  state = 'default',
  disabled = false,
  textareaClassName,
  ...props
}: TextareaFieldProps) {
  return (
    <FieldFrame
      className={className}
      label={label}
      description={description}
      message={message}
      state={state}
      disabled={disabled}
    >
      <span className={cx('ui-control-shell', 'ui-control-shell-textarea', state === 'error' && 'is-error')}>
        <textarea {...props} disabled={disabled} className={cx('ui-textarea', textareaClassName)} />
      </span>
    </FieldFrame>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  description?: ReactNode;
  message?: ReactNode;
  state?: FieldState;
  placeholder?: ReactNode;
  selectClassName?: string;
};

export function SelectField({
  className,
  label,
  description,
  message,
  state = 'default',
  disabled = false,
  children,
  placeholder,
  selectClassName,
  ...props
}: SelectFieldProps) {
  return (
    <FieldFrame
      className={className}
      label={label}
      description={description}
      message={message}
      state={state}
      disabled={disabled}
    >
      <span className={cx('ui-control-shell', 'ui-control-shell-select', state === 'error' && 'is-error')}>
        <select {...props} disabled={disabled} className={cx('ui-select', selectClassName)}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {children}
        </select>
        <span className="ui-control-icon ui-control-icon-end" aria-hidden="true">
          <span className="material-icons">expand_more</span>
        </span>
      </span>
    </FieldFrame>
  );
}

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  trailingAction?: ReactNode;
};

export function SearchField({
  className,
  trailingAction,
  disabled = false,
  ...props
}: SearchFieldProps) {
  return (
    <span className={cx('ui-search-field', disabled && 'is-disabled')}>
      <span className="ui-control-icon" aria-hidden="true">
        <span className="material-icons">search</span>
      </span>
      <input {...props} disabled={disabled} className={cx('ui-input', 'ui-search-input', className)} />
      {trailingAction ? <span className="ui-control-icon ui-control-icon-end">{trailingAction}</span> : null}
    </span>
  );
}
