import type { GetOrganizationsRes } from '@libs/payload'

import { adminOrgQueries, useApiClient } from '@libs/api-client'
import { DataTable, DataTableToolbar } from '@libs/ui-shared/web'

import { useDataTable } from '../../../../common/hooks/use-data-table'
import { useColumns } from './columns'

export function OrganizationsDataTable() {
  const api = useApiClient()
  const columns = useColumns()

  const { table } = useDataTable<
    GetOrganizationsRes['list'][number],
    GetOrganizationsRes,
    ReturnType<typeof adminOrgQueries.list>['queryKey']
  >({
    persistance: 'local',
    columns,
    query: ({ page, perPage, sorting, filters }) =>
      adminOrgQueries.list(api, {
        page,
        limit: perPage,
        sort: sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        ...filters
      }),
    initialState: {
      sorting: [{ id: 'name', desc: false }],
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
