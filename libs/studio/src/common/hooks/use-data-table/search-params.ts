import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  TableOptions,
  Updater,
  VisibilityState
} from '@tanstack/react-table'
import type { CommonProps } from './common'

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import { useDebounceCallback } from '../use-debounce'
import { DEBOUNCE_MS, getFiltersFromColumnFilters, PAGE_KEY, PER_PAGE_KEY, SORT_KEY } from './common'

export interface UseSearchParamsDataTableProps<TData>
  extends CommonProps,
    Omit<TableOptions<TData>, 'state' | 'getCoreRowModel'> {
  persistance: 'searchParams'
  throttleMs?: number
}

export function useSearchParamsDataTable<TData>(props: UseSearchParamsDataTableProps<TData>) {
  const { columns, initialState, debounceMs = DEBOUNCE_MS, ...tableProps } = props

  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, unknown>

  const updateSearch = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      void navigate({
        search: updater as never,
        replace: true
      } as never)
    },
    [navigate]
  )

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(initialState?.rowSelection ?? {})

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialState?.columnVisibility ?? {})

  // Read from URL or use defaults
  const page = (search[PAGE_KEY] as number) ?? 1
  const perPage = (search[PER_PAGE_KEY] as number) ?? initialState?.pagination?.pageSize ?? 10
  const searchSorting = search[SORT_KEY] as SortingState | undefined
  const sorting = useMemo(() => searchSorting ?? initialState?.sorting ?? [], [searchSorting, initialState?.sorting])

  const setPage = useCallback(
    (newPage: number) => {
      updateSearch(prev => ({ ...prev, [PAGE_KEY]: newPage === 1 ? undefined : newPage }))
    },
    [updateSearch]
  )

  const setPerPage = useCallback(
    (newPerPage: number) => {
      updateSearch(prev => ({ ...prev, [PER_PAGE_KEY]: newPerPage === 10 ? undefined : newPerPage }))
    },
    [updateSearch]
  )

  const setSorting = useCallback(
    (newSorting: SortingState) => {
      updateSearch(prev => ({
        ...prev,
        [SORT_KEY]: newSorting.length === 0 ? undefined : JSON.stringify(newSorting)
      }))
    },
    [updateSearch]
  )

  const pagination: PaginationState = useMemo(() => {
    return {
      pageIndex: page - 1,
      pageSize: perPage
    }
  }, [page, perPage])

  const onPaginationChange = useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const newPagination = typeof updaterOrValue === 'function' ? updaterOrValue(pagination) : updaterOrValue
      setPage(newPagination.pageIndex + 1)
      setPerPage(newPagination.pageSize)
    },
    [pagination, setPage, setPerPage]
  )

  const onSortingChange = useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      setSorting(typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue)
    },
    [sorting, setSorting]
  )

  const filterableColumns = useMemo(() => columns.filter(column => column.enableColumnFilter), [columns])

  // Read filters from URL
  const initialColumnFilters: ColumnFiltersState = useMemo(() => {
    return filterableColumns.reduce<ColumnFiltersState>((acc, column) => {
      const value = search[column.id ?? '']
      if (value !== undefined && value !== null) {
        acc.push({
          id: column.id ?? '',
          value: Array.isArray(value) ? value : [value]
        })
      }
      return acc
    }, [])
  }, [filterableColumns, search])

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters)

  const debouncedSetFilters = useDebounceCallback((values: Record<string, string | string[] | null>) => {
    setPage(1)
    updateSearch(prev => {
      const newSearch: Record<string, unknown> = { ...prev }
      for (const [key, value] of Object.entries(values)) {
        if (value === null || (Array.isArray(value) && value.length === 0)) {
          delete newSearch[key]
        } else {
          newSearch[key] = value
        }
      }
      return newSearch
    })
  }, debounceMs)

  const onColumnFiltersChange = useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      setColumnFilters(prev => {
        const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue

        debouncedSetFilters(
          getFiltersFromColumnFilters({
            columnFilters: next,
            previousColumnFilters: prev,
            filterableColumns
          })
        )
        return next
      })
    },
    [debouncedSetFilters, filterableColumns]
  )

  const table = useReactTable({
    columns,
    initialState,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnFilters,
      rowSelection
    },
    enableRowSelection: true,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    ...tableProps
  })

  return { table }
}
