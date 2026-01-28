import type { QueryKey, UseQueryOptions } from '@tanstack/react-query'
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
import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
import { DEBOUNCE_MS, getFiltersFromColumnFilters } from './common'

export interface UseLocalDataTableProps<
  TData,
  TQueryFnData extends { data?: TData[]; total?: number },
  TQueryKey extends QueryKey
> extends CommonProps,
    Omit<TableOptions<TData>, 'data' | 'state' | 'getCoreRowModel'> {
  persistance: 'local'
  query: (params: {
    page: number
    perPage: number
    sorting: SortingState
    filters: Record<string, string | string[] | null>
  }) => UseQueryOptions<TQueryFnData, Error, TQueryFnData, TQueryKey>
}

export function useLocalDataTable<
  TData,
  TQueryFnData extends { data?: TData[]; total?: number },
  TQueryKey extends QueryKey
>(props: UseLocalDataTableProps<TData, TQueryFnData, TQueryKey>) {
  const { debounceMs = DEBOUNCE_MS, columns, initialState, query: queryFn, ...tableProps } = props

  const [rowSelection, setRowSelection] = useState<RowSelectionState>(initialState?.rowSelection ?? {})

  const [sorting, setSorting] = useState<SortingState>(initialState?.sorting ?? [])

  const [page, setPage] = useState((initialState?.pagination?.pageIndex ?? 0) + 1)
  const [perPage, setPerPage] = useState(initialState?.pagination?.pageSize ?? 10)

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialState?.columnFilters ?? [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialState?.columnVisibility ?? {})

  const filterableColumns = useMemo(() => {
    return columns.filter(column => column.enableColumnFilter)
  }, [columns])

  const [filters, setFilters] = useState<Record<string, string | string[] | null>>(
    getFiltersFromColumnFilters({ columnFilters, filterableColumns })
  )

  const debouncedSetFilters = useDebounceCallback((values: Record<string, string | string[] | null>) => {
    setPage(1)
    setFilters(values)
  }, debounceMs)

  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: perPage
    }),
    [page, perPage]
  )

  const onPaginationChange = useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const newPagination = typeof updaterOrValue === 'function' ? updaterOrValue(pagination) : updaterOrValue
      setPage(newPagination.pageIndex + 1)
      setPerPage(newPagination.pageSize)
    },
    [pagination]
  )

  const onSortingChange = useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      setSorting(typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue)
    },
    [sorting]
  )

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

  const params = useMemo(
    () => ({
      page,
      perPage,
      sorting,
      filters
    }),
    [page, perPage, sorting, filters]
  )

  const query = useQuery({
    ...queryFn(params),
    placeholderData: keepPreviousData
  })

  const pageCount = useMemo(() => {
    return Math.ceil((query.data?.total ?? 0) / perPage)
  }, [query.data?.total, perPage])

  const table = useReactTable({
    columns,
    data: query.data?.data ?? [],
    pageCount,
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

  return { table, query }
}
