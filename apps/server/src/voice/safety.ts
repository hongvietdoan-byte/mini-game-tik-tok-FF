/** Strict runtime deny-list: speech is rejected before a provider sees text. */
export function containsPlayerIdentity(text: string, playerNamesAndIds: Iterable<string>): boolean {
  const fold = (value: string) => value.normalize('NFKC').toLocaleLowerCase('und').replace(/\s+/gu, ' ').trim();
  const spoken = fold(text);
  for (const identity of playerNamesAndIds) {
    const candidate = fold(identity);
    if (candidate && spoken.includes(candidate)) return true;
  }
  return false;
}
