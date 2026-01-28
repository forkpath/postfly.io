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

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(initialState?.rowSelection ?? {})

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialState?.columnVisibility ?? {})

  // Read from URL or use defaults
  const page = (search[PAGE_KEY] as number) ?? 1
  const perPage = (search[PER_PAGE_KEY] as number) ?? initialState?.pagination?.pageSize ?? 10
  const sorting = (search[SORT_KEY] as SortingState) ?? initialState?.sorting ?? []

  const setPage = useCallback(
    (newPage: number) => {
      void navigate({
        search: prev => ({ ...prev, [PAGE_KEY]: newPage === 1 ? undefined : newPage }),
        replace: true
      })
    },
    [navigate]
  )

  const setPerPage = useCallback(
    (newPerPage: number) => {
      void navigate({
        search: prev => ({ ...prev, [PER_PAGE_KEY]: newPerPage === 10 ? undefined : newPerPage }),
        replace: true
      })
    },
    [navigate]
  )

  const setSorting = useCallback(
    (newSorting: SortingState) => {
      void navigate({
        search: prev => ({
          ...prev,
          [SORT_KEY]: newSorting.length === 0 ? undefined : JSON.stringify(newSorting)
        }),
        replace: true
      })
    },
    [navigate]
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
    void navigate({
      search: prev => {
        const newSearch = { ...prev }
        for (const [key, value] of Object.entries(values)) {
          if (value === null || (Array.isArray(value) && value.length === 0)) {
            delete newSearch[key]
          } else {
            newSearch[key] = value
          }
        }
        return newSearch
      },
      replace: true
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
