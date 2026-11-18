/** Compile a phrase matcher once per session; comments remain an O(1) hot-path check. */
export function lobbyKeywordMatcher(keyword: string): (text: string) => boolean {
  const normalizedKeyword = stripMarks(keyword).toLocaleLowerCase('und');
  const characters = Array.from(normalizedKeyword).filter((char) => /[\p{L}\p{N}]/u.test(char));
  if (characters.length === 0) return () => false;

  const phrase = characters.map(escapeRegExp).join('[\\s\\p{P}\\p{S}]*');
  const expression = new RegExp(`(?:^|[^\\p{L}\\p{N}])${phrase}(?![\\p{L}\\p{N}])`, 'iu');
  return (text) => expression.test(stripMarks(text).toLocaleLowerCase('und'));
}

function stripMarks(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
