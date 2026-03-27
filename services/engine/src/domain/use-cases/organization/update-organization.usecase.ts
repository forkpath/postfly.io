import type { OrganizationEntity } from '../../entities/organization.entity'
import type { IOrganizationRepository } from '../../repositories/organization.repository.interface'

import {
  OrganizationNotFoundException,
  OrganizationSlugConflictException
} from '../../exceptions/organization.exception'
import { OrganizationSlug } from '../../value-objects/organization-slug.vo'

export interface UpdateOrganizationInput {
  organizationId: string
  name?: string
  slug?: string
}

export interface UpdateOrganizationOutput {
  organization: OrganizationEntity
}

export class UpdateOrganizationUseCase {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async execute(input: UpdateOrganizationInput): Promise<UpdateOrganizationOutput> {
    const existing = await this.organizationRepository.findById(input.organizationId)
    if (!existing) {
      throw new OrganizationNotFoundException(input.organizationId)
    }

    if (input.slug) {
      OrganizationSlug.create(input.slug)

      if (input.slug !== existing.slug) {
        const conflict = await this.organizationRepository.findBySlug(input.slug)
        if (conflict && conflict.id !== input.organizationId) {
          throw new OrganizationSlugConflictException(input.slug)
        }
      }
    }

    const updated = await this.organizationRepository.update(input.organizationId, {
      name: input.name,
      slug: input.slug
    })

    return { organization: updated }
  }
}
