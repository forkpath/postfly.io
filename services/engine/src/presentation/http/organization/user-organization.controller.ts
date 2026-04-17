import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface'
import type { GetInvitationsRes, GetMembersRes } from '@libs/payload'

import { BadRequestException, Controller, ForbiddenException, Get, Inject, Param, Query } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { MemberRole } from '@libs/common'
import { prisma } from '@libs/pg-dao'
import { Session } from '@libs/srv-shared'

import { ListInvitationsQueryDto, ListMembersQueryDto } from '../../../application/dtos/organization/organization.dto'
import { ListInvitationsQuery } from '../../../application/queries/organization/list-invitations.query'
import { ListMembersQuery } from '../../../application/queries/organization/list-members.query'
import { ORGANIZATION_REPOSITORY } from '../../../domain/repositories/organization.repository.interface'

interface AuthSession {
  user: { id: string; email: string; role?: string }
}

async function ensureMember(organizationId: string, userId: string): Promise<'owner' | 'admin' | 'member'> {
  const member = await prisma.member.findFirst({
    where: { organizationId, userId },
    select: { role: true }
  })
  if (!member) throw new ForbiddenException('Not a member of this organization')
  return member.role as 'owner' | 'admin' | 'member'
}

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 普通组织成员可访问的只读接口
 *
 * 仅保留 Better Auth `organization` plugin 未覆盖、或过滤能力不足的端点：
 * - slug 去重（Better Auth 不提供）
 * - 带 q/role/status 过滤的 members/invitations 列表（Better Auth listMembers/listInvitations 过滤维度有限）
 * - is-only-owner：离开组织前置校验（Better Auth 不提供）
 *
 * 组织详情、增删改成员/邀请等操作统一由前端 `authClient.organization.*` 直连 Better Auth handler。
 */
@Controller('organizations')
export class UserOrganizationController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgRepository: IOrganizationRepository
  ) {}

  @Get('slug')
  async generateSlug(@Query('name') name?: string): Promise<{ slug: string; available: boolean }> {
    if (!name) throw new BadRequestException('name is required')

    let base = toSlug(name)
    if (!base || !slugRegex.test(base)) base = 'organization'

    let slug = base
    let counter = 1
    while (await this.orgRepository.findBySlug(slug)) {
      slug = `${base}-${counter++}`
    }
    return { slug, available: true }
  }

  @Get(':id/members')
  async listMembers(
    @Param('id') id: string,
    @Query() query: ListMembersQueryDto,
    @Session() session: AuthSession
  ): Promise<GetMembersRes> {
    await ensureMember(id, session.user.id)
    return this.queryBus.execute(new ListMembersQuery(id, query))
  }

  @Get(':id/members/is-only-owner')
  async isOnlyOwner(@Param('id') id: string, @Session() session: AuthSession): Promise<{ isOnlyOwner: boolean }> {
    const role = await ensureMember(id, session.user.id)
    if (role !== MemberRole.OWNER) return { isOnlyOwner: false }

    const ownerCount = await prisma.member.count({
      where: { organizationId: id, role: MemberRole.OWNER }
    })
    return { isOnlyOwner: ownerCount <= 1 }
  }

  @Get(':id/invitations')
  async listInvitations(
    @Param('id') id: string,
    @Query() query: ListInvitationsQueryDto,
    @Session() session: AuthSession
  ): Promise<GetInvitationsRes> {
    const role = await ensureMember(id, session.user.id)
    if (role !== MemberRole.OWNER && role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only admins can list invitations')
    }
    return this.queryBus.execute(new ListInvitationsQuery(id, query))
  }
}
