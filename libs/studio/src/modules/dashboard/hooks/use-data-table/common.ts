import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table'

export const PAGE_KEY = 'page'
export const PER_PAGE_KEY = 'perPage'
export const SORT_KEY = 'sort'
export const ARRAY_SEPARATOR = ','
export const DEBOUNCE_MS = 500
export const THROTTLE_MS = 50

export interface CommonProps {
  debounceMs?: number
}

export const getFiltersFromColumnFilters = <TData>({
  columnFilters,
  previousColumnFilters,
  filterableColumns
}: {
  columnFilters: ColumnFiltersState
  previousColumnFilters?: ColumnFiltersState
  filterableColumns: ColumnDef<TData>[]
}) => {
  const filterUpdates = columnFilters.reduce<Record<string, string | string[] | null>>((acc, filter) => {
    if (filterableColumns.find(column => column.id === filter.id)) {
      acc[filter.id] = filter.value as string | string[]
    }
    return acc
  }, {})

  for (const prevFilter of previousColumnFilters ?? []) {
    if (!columnFilters.some(filter => filter.id === prevFilter.id)) {
      filterUpdates[prevFilter.id] = null
    }
  }

  return filterUpdates
}
