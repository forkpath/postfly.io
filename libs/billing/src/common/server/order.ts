import type { InsertOrder } from '@workspace/db/schema'

import { buildConflictUpdateColumns, getTableColumns } from '@workspace/db'
import { order } from '@workspace/db/schema'
import { db } from '@workspace/db/server'

export const upsertOrder = async (data: InsertOrder) => {
  return db
    .insert(order)
    .values(data)
    .onConflictDoUpdate({
      target: [order.externalId, order.store],
      set: data
    })
    .returning()
}

export const upsertOrders = async (data: InsertOrder[]) => {
  return db
    .insert(order)
    .values(data)
    .onConflictDoUpdate({
      target: [order.externalId, order.store],
      set: buildConflictUpdateColumns(order, Object.keys(getTableColumns(order)) as (keyof typeof order._.columns)[])
    })
    .returning()
}
