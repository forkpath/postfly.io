import type { GetCustomersRes } from '@libs/payload'

import { adminCustomerQueries, useApiClient } from '@libs/api-client'
import { DataTable, DataTableToolbar } from '@libs/ui-shared/web'

import { useDataTable } from '../../../../common/hooks/use-data-table'
import { useColumns } from './columns'

export function CustomersDataTable() {
  const api = useApiClient()
  const columns = useColumns()

  const { table } = useDataTable<
    GetCustomersRes['list'][number],
    GetCustomersRes,
    ReturnType<typeof adminCustomerQueries.list>['queryKey']
  >({
    persistance: 'local',
    columns,
    query: ({ page, perPage, sorting, filters }) =>
      adminCustomerQueries.list(api, {
        page,
        limit: perPage,
        sort: sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        ...filters
      }),
    initialState: {
      sorting: [{ id: 'user.name', desc: false }],
      columnVisibility: { q: false }
    },
    enableRowSelection: false
  })

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  )
}
