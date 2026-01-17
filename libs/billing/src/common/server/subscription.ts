import type { InsertSubscription } from '@workspace/db/schema'

import { buildConflictUpdateColumns, getTableColumns } from '@workspace/db'
import { subscription } from '@workspace/db/schema'
import { db } from '@workspace/db/server'

export const upsertSubscription = async (data: InsertSubscription) => {
  return db
    .insert(subscription)
    .values(data)
    .onConflictDoUpdate({
      target: [subscription.externalId, subscription.store],
      set: data
    })
    .returning()
}

export const upsertSubscriptions = async (data: InsertSubscription[]) => {
  return db
    .insert(subscription)
    .values(data)
    .onConflictDoUpdate({
      target: [subscription.externalId, subscription.store],
      set: buildConflictUpdateColumns(
        subscription,
        Object.keys(getTableColumns(subscription)) as (keyof typeof subscription._.columns)[]
      )
    })
    .returning()
}
