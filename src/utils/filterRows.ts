export function filterRowIndexes(
  rows: readonly Readonly<Record<string, string>>[],
  query: string,
): number[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('sv-SE')
  if (!normalizedQuery) return rows.map((_, index) => index)

  return rows.flatMap((row, index) =>
    Object.values(row).some((value) => value.toLocaleLowerCase('sv-SE').includes(normalizedQuery))
      ? [index]
      : [],
  )
}
