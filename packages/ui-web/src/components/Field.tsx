import * as Label from '@radix-ui/react-label';
import { useId, type InputHTMLAttributes } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
  readonly error?: string;
}

/** Campo (Figma: Componentes · Campo) com rótulo associado e erro anunciado. */
export function Field({ label, error, id, ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const errId = `${inputId}-err`;
  return (
    <div className="kv-field">
      <Label.Root htmlFor={inputId}>{label}</Label.Root>
      <input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined} {...rest} />
      {error ? (
        <span id={errId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
