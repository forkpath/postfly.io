import { Prisma } from '@libs/pg-dao'

interface ListSort {
  readonly field: string
  readonly desc: boolean
}

// SQL identifiers cannot be query parameters. Only SQL fragments defined by
// the repository may become an ORDER BY expression, including internal callers.
export function listOrder(
  sort: readonly ListSort[] | undefined,
  columns: ReadonlyMap<string, Prisma.Sql>,
  fallback: Prisma.Sql,
  tieBreaker: Prisma.Sql
): Prisma.Sql {
  if (!sort?.length) return Prisma.sql`${fallback}, ${tieBreaker}`
  return Prisma.join([
    ...sort.map(item => {
      const column = columns.get(item.field)
      if (!column) throw new Error('Unsupported sort field')
      return Prisma.sql`${column} ${item.desc ? Prisma.sql`DESC` : Prisma.sql`ASC`}`
    }),
    tieBreaker
  ])
}

export function listOffset(page: number, perPage: number): number {
  const offset = (page - 1) * perPage
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(perPage) ||
    perPage < 1 ||
    perPage > 100 ||
    !Number.isSafeInteger(offset)
  ) {
    throw new Error('Invalid list pagination')
  }
  return offset
}
