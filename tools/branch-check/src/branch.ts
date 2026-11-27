/** Nome de branch `NNN-nome` (REQ-FND-013); exceções para bots. */
export const BRANCH = /^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXCEPTIONS = [/^dependabot\//, /^main$/];

export function isValidBranch(name: string): boolean {
  return BRANCH.test(name) || EXCEPTIONS.some((re) => re.test(name));
}
