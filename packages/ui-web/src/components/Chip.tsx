import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly selected?: boolean;
  readonly label: string;
}

/** Chip (Figma: Componentes · Chip): alternável, com aria-pressed. */
export function Chip({ selected = false, label, ...rest }: ChipProps) {
  return (
    <button type="button" className="kv-chip" aria-pressed={selected} {...rest}>
      {label}
    </button>
  );
}
