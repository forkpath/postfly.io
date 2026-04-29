import type { BillingCustomerEntity } from '../../domain/entities/customer.entity'
import type {
  ICustomerRepository,
  ListCustomersCriteria,
  PagedCustomerResult
} from '../../domain/repositories/customer.repository.interface'

import { Injectable } from '@nestjs/common'

import { prisma } from '@libs/pg-dao'

import { BillingCustomer } from '../../domain/entities/customer.entity'

@Injectable()
export class CustomerRepository implements ICustomerRepository {
  async findAll(params: ListCustomersCriteria): Promise<PagedCustomerResult> {
    const { page, perPage, sort, q, provider, subscriptions, orders, createdAt } = params

    const conditions: string[] = ['1=1']
    const values: unknown[] = []
    let paramIdx = 1

    if (q) {
      conditions.push(`(u.name ILIKE $${paramIdx} OR c.external_id ILIKE $${paramIdx})`)
      values.push(`%${q}%`)
      paramIdx++
    }

    if (provider) {
      const placeholders = provider.map(() => `$${paramIdx++}`).join(', ')
      conditions.push(`c.provider IN (${placeholders})`)
      values.push(...provider)
    }

    if (createdAt) {
      conditions.push(`c.created_at >= $${paramIdx}::timestamptz AND c.created_at <= $${paramIdx + 1}::timestamptz`)
      values.push(createdAt.from, createdAt.to)
      paramIdx += 2
    }

    const havingConditions: string[] = []
    if (subscriptions) {
      havingConditions.push(
        `COUNT(DISTINCT s.id) >= ${subscriptions.from} AND COUNT(DISTINCT s.id) <= ${subscriptions.to}`
      )
    }
    if (orders) {
      havingConditions.push(`COUNT(DISTINCT o.id) >= ${orders.from} AND COUNT(DISTINCT o.id) <= ${orders.to}`)
    }

    const whereClause = conditions.join(' AND ')
    const havingClause = havingConditions.length ? `HAVING ${havingConditions.join(' AND ')}` : ''

    const sortColumn =
      sort?.[0]?.field === 'subscriptions'
        ? 'sub_count'
        : sort?.[0]?.field === 'orders'
          ? 'ord_count'
          : sort?.[0]?.field
            ? `c.${this.toSnakeCase(sort[0].field)}`
            : 'c.created_at'
    const sortDir = sort?.[0]?.desc ? 'DESC' : 'ASC'

    const dataQuery = `
      SELECT
        c.id, c.reference_id, c.provider,
        c.external_id, c.created_at, c.updated_at,
        u.name AS user_name, u.image AS user_image,
        COUNT(DISTINCT s.id)::int AS sub_count,
        COUNT(DISTINCT o.id)::int AS ord_count,
        COUNT(*) OVER() AS total_count
      FROM billing.customer c
      LEFT JOIN public."user" u ON c.reference_id = u.id
      LEFT JOIN billing.subscription s ON s.customer_id = c.id
      LEFT JOIN billing."order" o ON o.customer_id = c.id
      WHERE ${whereClause}
      GROUP BY c.id, u.name, u.image
      ${havingClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        reference_id: string
        provider: string
        external_id: string
        created_at: Date
        updated_at: Date
        user_name: string
        user_image: string | null
        sub_count: number
        ord_count: number
        total_count: number
      }>
    >(dataQuery, ...values)

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0

    const maxQuery = `
      SELECT
        COALESCE(MAX(sub_count), 0)::int AS max_subscriptions,
        COALESCE(MAX(ord_count), 0)::int AS max_orders
      FROM (
        SELECT
          COUNT(DISTINCT s.id) AS sub_count,
          COUNT(DISTINCT o.id) AS ord_count
        FROM billing.customer c
        LEFT JOIN billing.subscription s ON s.customer_id = c.id
        LEFT JOIN billing."order" o ON o.customer_id = c.id
        GROUP BY c.id
      ) sub
    `
    const maxResult = await prisma.$queryRawUnsafe<[{ max_subscriptions: number; max_orders: number }]>(maxQuery)

    const providerQuery = `
      SELECT DISTINCT provider
      FROM billing.customer
      ORDER BY provider
    `
    const providerRows = await prisma.$queryRawUnsafe<Array<{ provider: string }>>(providerQuery)

    return {
      list: rows.map(r =>
        this.mapToEntity({
          id: r.id,
          referenceId: r.reference_id,
          provider: r.provider,
          externalId: r.external_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          user: {
            name: r.user_name,
            image: r.user_image
          },
          subscriptionsCount: r.sub_count,
          ordersCount: r.ord_count
        })
      ),
      total,
      max: {
        subscriptions: maxResult[0]?.max_subscriptions ?? 0,
        orders: maxResult[0]?.max_orders ?? 0
      },
      options: {
        provider: providerRows.map(r => r.provider)
      }
    }
  }

  async count(): Promise<number> {
    return prisma.customer.count()
  }

  private mapToEntity(data: {
    id: string
    referenceId: string
    provider: string
    externalId: string
    createdAt: Date
    updatedAt: Date
    user: {
      name: string
      image: string | null
    }
    subscriptionsCount: number
    ordersCount: number
  }): BillingCustomerEntity {
    return BillingCustomer.fromPersistence(data)
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
  }
}
