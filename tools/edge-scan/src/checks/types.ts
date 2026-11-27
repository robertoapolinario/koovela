export interface CheckResult {
  readonly check: string;
  readonly target: string;
  readonly ok: boolean;
  readonly detail: string;
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export const result = (check: string, target: string, ok: boolean, detail = ''): CheckResult => ({ check, target, ok, detail });
