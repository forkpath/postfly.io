import { describe, expect, it } from 'vitest'

import { adminUserKeys, adminUserMutations, adminUserQueries } from '../users'

describe('adminUserKeys', () => {
  it('should generate correct base key', () => {
    expect(adminUserKeys.all).toEqual(['admin', 'users'])
  })

  it('should generate lists key', () => {
    expect(adminUserKeys.lists()).toEqual(['admin', 'users', 'list'])
  })

  it('should generate list key with params', () => {
    const params = { page: 1, search: 'test' }
    expect(adminUserKeys.list(params)).toEqual(['admin', 'users', 'list', params])
  })

  it('should generate detail key', () => {
    expect(adminUserKeys.detail('user-1')).toEqual(['admin', 'users', 'detail', 'user-1'])
  })

  it('should generate sessions key', () => {
    expect(adminUserKeys.sessions('user-1')).toEqual(['admin', 'users', 'detail', 'user-1', 'sessions'])
  })

  it('should generate sub-entity keys', () => {
    expect(adminUserKeys.accounts('u1')).toEqual(['admin', 'users', 'detail', 'u1', 'accounts'])
    expect(adminUserKeys.subscriptions('u1')).toEqual(['admin', 'users', 'detail', 'u1', 'subscriptions'])
    expect(adminUserKeys.orders('u1')).toEqual(['admin', 'users', 'detail', 'u1', 'orders'])
    expect(adminUserKeys.memberships('u1')).toEqual(['admin', 'users', 'detail', 'u1', 'memberships'])
    expect(adminUserKeys.invitations('u1')).toEqual(['admin', 'users', 'detail', 'u1', 'invitations'])
  })
})

describe('adminUserQueries', () => {
  it('should have list query factory', () => {
    expect(typeof adminUserQueries.list).toBe('function')
  })

  it('should have detail query factory', () => {
    expect(typeof adminUserQueries.detail).toBe('function')
  })

  it('should have sessions query factory', () => {
    expect(typeof adminUserQueries.sessions).toBe('function')
  })

  it('should have sub-entity query factories', () => {
    expect(typeof adminUserQueries.accounts).toBe('function')
    expect(typeof adminUserQueries.subscriptions).toBe('function')
    expect(typeof adminUserQueries.orders).toBe('function')
    expect(typeof adminUserQueries.memberships).toBe('function')
    expect(typeof adminUserQueries.invitations).toBe('function')
  })
})

describe('adminUserMutations', () => {
  it('should have mutation factories with fn and options', () => {
    const mutations = [
      adminUserMutations.update,
      adminUserMutations.delete,
      adminUserMutations.ban,
      adminUserMutations.unban,
      adminUserMutations.setPassword,
      adminUserMutations.revokeSession,
      adminUserMutations.revokeAllSessions,
      adminUserMutations.deleteAccount
    ]

    for (const mutation of mutations) {
      expect(mutation).toHaveProperty('fn')
      expect(mutation).toHaveProperty('options')
      expect(typeof mutation.fn).toBe('function')
      expect(typeof mutation.options).toBe('function')
    }
  })
})
