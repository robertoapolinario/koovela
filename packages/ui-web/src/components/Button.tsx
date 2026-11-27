import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary';
  readonly loading?: boolean;
  readonly asChild?: boolean;
  readonly children: ReactNode;
}

/** Botão (Figma: Componentes · Botão). Estados: hover, focus, disabled, loading (tokens state.*). */
export function Button({ variant = 'primary', loading = false, asChild = false, children, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className="kv-button" data-variant={variant} aria-busy={loading || undefined} {...rest}>
      {children}
    </Comp>
  );
}
