/** Lithuanian-style plural pick; English content simply repeats the "few" form. */
export function plural(count: number, one: string, few: string, many: string): string {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return one;
  if (last === 0 || (lastTwo >= 11 && lastTwo <= 19)) return many;
  return few;
}
