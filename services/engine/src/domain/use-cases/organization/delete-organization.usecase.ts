import type { IOrganizationRepository } from '../../repositories/organization.repository.interface'

import { OrganizationNotFoundException } from '../../exceptions/organization.exception'

export interface DeleteOrganizationInput {
  organizationId: string
}

export class DeleteOrganizationUseCase {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async execute(input: DeleteOrganizationInput): Promise<void> {
    const existing = await this.organizationRepository.findById(input.organizationId)
    if (!existing) {
      throw new OrganizationNotFoundException(input.organizationId)
    }

    await this.organizationRepository.delete(input.organizationId)
  }
}
