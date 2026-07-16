import type { ReactNode } from 'react';
import { cn } from './cn';

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, required, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('ui-form-field', className)}>
      <label htmlFor={htmlFor} className="ui-form-field__label">
        {label}{required && <span className="ui-form-field__required"> *</span>}
      </label>
      {children}
      {error ? <p className="ui-form-field__error">{error}</p> : hint ? <p className="ui-form-field__hint">{hint}</p> : null}
    </div>
  );
}
