import type { InvitationEntity, MemberEntity, OrganizationEntity } from '../../domain/entities/organization.entity'
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface'
import type {
  GetInvitationsReq,
  GetMembersReq,
  GetOrganizationsReq,
  UpdateMemberPayload,
  UpdateOrganizationPayload
} from '@libs/payload'

import { Injectable } from '@nestjs/common'

import { prisma } from '@libs/pg-dao'

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  async findAll(params: GetOrganizationsReq): Promise<{
    list: OrganizationEntity[]
    total: number
    max: { members: number }
  }> {
    const { page: rp = 1, perPage: rpp = 10, sort, q, createdAt, members } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const conditions: string[] = ['1=1']
    const values: unknown[] = []
    let paramIdx = 1

    if (q) {
      conditions.push(`(o.name ILIKE $${paramIdx} OR o.slug ILIKE $${paramIdx})`)
      values.push(`%${q}%`)
      paramIdx++
    }

    if (createdAt) {
      conditions.push(`o.created_at >= $${paramIdx}::timestamptz AND o.created_at <= $${paramIdx + 1}::timestamptz`)
      values.push(new Date(createdAt[0]), new Date(createdAt[1]))
      paramIdx += 2
    }

    const havingConditions: string[] = []
    if (members) {
      havingConditions.push(`COUNT(m.id) >= ${members[0]} AND COUNT(m.id) <= ${members[1]}`)
    }

    const whereClause = conditions.join(' AND ')
    const havingClause = havingConditions.length ? `HAVING ${havingConditions.join(' AND ')}` : ''

    const sortColumn =
      sort?.[0]?.id === 'members'
        ? 'member_count'
        : sort?.[0]?.id
          ? `o.${this.toSnakeCase(sort[0].id)}`
          : 'o.created_at'
    const sortDir = sort?.[0]?.desc ? 'DESC' : 'ASC'

    const dataQuery = `
      SELECT
        o.id, o.name, o.slug, o.logo, o.created_at,
        COUNT(m.id)::int AS member_count,
        COUNT(*) OVER() AS total_count
      FROM organization o
      LEFT JOIN member m ON m.organization_id = o.id
      WHERE ${whereClause}
      GROUP BY o.id
      ${havingClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        name: string
        slug: string | null
        logo: string | null
        created_at: Date
        member_count: number
        total_count: number
      }>
    >(dataQuery, ...values)

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0

    const maxQuery = `
      SELECT COALESCE(MAX(cnt), 0)::int AS max_members
      FROM (
        SELECT COUNT(m.id) AS cnt
        FROM organization o
        LEFT JOIN member m ON m.organization_id = o.id
        GROUP BY o.id
      ) sub
    `
    const maxResult = await prisma.$queryRawUnsafe<[{ max_members: number }]>(maxQuery)
    const membersMax = maxResult[0]?.max_members ?? 0

    return {
      list: rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        logo: r.logo,
        createdAt: r.created_at,
        membersCount: r.member_count
      })),
      total,
      max: { members: membersMax }
    }
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } }
      }
    })
    if (!org) return null
    return {
      id: org.id,
      name: org.name,
      slug: org.slug ?? null,
      logo: org.logo ?? null,
      createdAt: org.createdAt,
      membersCount: org._count.members
    }
  }

  async count(): Promise<number> {
    return prisma.organization.count()
  }

  async update(id: string, data: UpdateOrganizationPayload): Promise<OrganizationEntity> {
    const org = await prisma.organization.update({
      where: { id },
      data,
      include: { _count: { select: { members: true } } }
    })
    return {
      id: org.id,
      name: org.name,
      slug: org.slug ?? null,
      logo: org.logo ?? null,
      createdAt: org.createdAt,
      membersCount: org._count.members
    }
  }

  async delete(id: string): Promise<void> {
    await prisma.organization.delete({ where: { id } })
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const org = await prisma.organization.findFirst({
      where: { slug },
      include: { _count: { select: { members: true } } }
    })
    if (!org) return null
    return {
      id: org.id,
      name: org.name,
      slug: org.slug ?? null,
      logo: org.logo ?? null,
      createdAt: org.createdAt,
      membersCount: org._count.members
    }
  }

  async findMembers(orgId: string, params: GetMembersReq): Promise<{ list: MemberEntity[]; total: number }> {
    const { page: rp = 1, perPage: rpp = 10, sort, q, role, createdAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = {
      organizationId: orgId
    }
    if (q) {
      where.user = {
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }]
      }
    }
    if (role) where.role = { in: role }
    if (createdAt) {
      where.createdAt = {
        gte: new Date(createdAt[0]),
        lte: new Date(createdAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      }),
      prisma.member.count({ where })
    ])

    return {
      list: data.map(m => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image ?? null
        }
      })),
      total
    }
  }

  async findMemberById(orgId: string, memberId: string): Promise<MemberEntity | null> {
    const m = await prisma.member.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })
    if (!m) return null
    return {
      id: m.id,
      userId: m.userId,
      organizationId: m.organizationId,
      role: m.role,
      createdAt: m.createdAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image ?? null
      }
    }
  }

  async countMembers(orgId: string): Promise<number> {
    return prisma.member.count({
      where: { organizationId: orgId }
    })
  }

  async updateMember(orgId: string, memberId: string, data: UpdateMemberPayload): Promise<MemberEntity> {
    const m = await prisma.member.update({
      where: { id: memberId, organizationId: orgId },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })
    return {
      id: m.id,
      userId: m.userId,
      organizationId: m.organizationId,
      role: m.role,
      createdAt: m.createdAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image ?? null
      }
    }
  }

  async deleteMember(orgId: string, memberId: string): Promise<void> {
    await prisma.member.delete({
      where: { id: memberId, organizationId: orgId }
    })
  }

  async findInvitations(
    orgId: string,
    params: GetInvitationsReq
  ): Promise<{ list: InvitationEntity[]; total: number }> {
    const { page: rp = 1, perPage: rpp = 10, sort, email, role, status, expiresAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = {
      organizationId: orgId
    }
    if (email) {
      where.email = { contains: email, mode: 'insensitive' }
    }
    if (role) where.role = { in: role }
    if (status) where.status = { in: status }
    if (expiresAt) {
      where.expiresAt = {
        gte: new Date(expiresAt[0]),
        lte: new Date(expiresAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy
      }),
      prisma.invitation.count({ where })
    ])

    return {
      list: data.map(i => ({
        id: i.id,
        email: i.email,
        role: i.role ?? 'member',
        status: i.status,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        organizationId: i.organizationId,
        inviterId: i.inviterId
      })),
      total
    }
  }

  async deleteInvitation(orgId: string, invitationId: string): Promise<void> {
    await prisma.invitation.delete({
      where: { id: invitationId, organizationId: orgId }
    })
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
  }
}
