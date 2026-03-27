import { describe, expect, it } from 'vitest'

import { adminOrgKeys, adminOrgMutations, adminOrgQueries } from '../organizations'

describe('adminOrgKeys', () => {
  it('should generate correct base key', () => {
    expect(adminOrgKeys.all).toEqual(['admin', 'organizations'])
  })

  it('should generate list key with params', () => {
    const params = { page: 1 }
    expect(adminOrgKeys.list(params)).toEqual(['admin', 'organizations', 'list', params])
  })

  it('should generate detail key', () => {
    expect(adminOrgKeys.detail('org-1')).toEqual(['admin', 'organizations', 'detail', 'org-1'])
  })

  it('should generate members key', () => {
    expect(adminOrgKeys.members('org-1')).toEqual(['admin', 'organizations', 'detail', 'org-1', 'members'])
  })

  it('should generate invitations key', () => {
    expect(adminOrgKeys.invitations('org-1')).toEqual(['admin', 'organizations', 'detail', 'org-1', 'invitations'])
  })
})

describe('adminOrgQueries', () => {
  it('should have query factories', () => {
    expect(typeof adminOrgQueries.list).toBe('function')
    expect(typeof adminOrgQueries.detail).toBe('function')
    expect(typeof adminOrgQueries.members).toBe('function')
    expect(typeof adminOrgQueries.invitations).toBe('function')
  })
})

describe('adminOrgMutations', () => {
  it('should have mutation factories', () => {
    const mutations = [
      adminOrgMutations.update,
      adminOrgMutations.delete,
      adminOrgMutations.updateMember,
      adminOrgMutations.deleteMember,
      adminOrgMutations.deleteInvitation
    ]

    for (const mutation of mutations) {
      expect(mutation).toHaveProperty('fn')
      expect(mutation).toHaveProperty('options')
    }
  })
})
