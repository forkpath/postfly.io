/* eslint-disable react-hooks/rules-of-hooks */
import type { QueryKey, useQuery } from '@tanstack/react-query'
import type { useReactTable } from '@tanstack/react-table'
import type { UseLocalDataTableProps } from './local'
import type { UseSearchParamsDataTableProps } from './search-params'

import { useLocalDataTable } from './local'
import { useSearchParamsDataTable } from './search-params'

export function useDataTable<
  TData,
  TQueryFnData extends { data?: TData[]; total?: number },
  TQueryKey extends QueryKey
>(
  props: UseLocalDataTableProps<TData, TQueryFnData, TQueryKey>
): {
  table: ReturnType<typeof useReactTable<TData>>
  query: ReturnType<typeof useQuery<TQueryFnData>>
}
export function useDataTable<TData>(props: UseSearchParamsDataTableProps<TData>): {
  table: ReturnType<typeof useReactTable<TData>>
}

export function useDataTable<
  TData,
  TQueryFnData extends { data?: TData[]; total?: number },
  TQueryKey extends QueryKey
>(props: UseLocalDataTableProps<TData, TQueryFnData, TQueryKey> | UseSearchParamsDataTableProps<TData>) {
  if (props.persistance === 'local') {
    return useLocalDataTable(props)
  }
  return useSearchParamsDataTable(props)
}

export type { UseLocalDataTableProps } from './local'
export type { UseSearchParamsDataTableProps } from './search-params'
export * from './common'
