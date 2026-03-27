import { describe, expect, it } from 'vitest'

import { admin } from '../lib/api'

describe('admin api', () => {
  describe('queries', () => {
    it('should have users queries', () => {
      expect(admin.queries.users).toBeDefined()
      expect(typeof admin.queries.users.get).toBe('function')
      expect(typeof admin.queries.users.getSessions).toBe('function')
    })

    it('should return query options with correct key prefix', () => {
      const options = admin.queries.users.get({ id: 'test-id' })

      expect(options.queryKey).toContain('admin')
      expect(options.queryKey).toContain('users')
      expect(options.queryKey).toContain('test-id')
    })

    it('should return sessions query options', () => {
      const options = admin.queries.users.getSessions({ id: 'test-id' })

      expect(options.queryKey).toContain('sessions')
    })
  })

  describe('mutations', () => {
    it('should have user mutations', () => {
      expect(admin.mutations.users).toBeDefined()
    })

    it('should have ban/unban mutation keys', () => {
      expect(admin.mutations.users.ban).toHaveProperty('mutationKey')
      expect(admin.mutations.users.unban).toHaveProperty('mutationKey')
    })

    it('should have delete mutation key', () => {
      expect(admin.mutations.users.delete).toHaveProperty('mutationKey')
    })

    it('should have impersonate mutations', () => {
      expect(admin.mutations.users.impersonate).toHaveProperty('mutationKey')
      expect(admin.mutations.users.stopImpersonating).toHaveProperty('mutationKey')
    })

    it('should have update mutation key', () => {
      expect(admin.mutations.users.update).toHaveProperty('mutationKey')
    })

    it('should have session mutations', () => {
      expect(admin.mutations.users.sessions.revoke).toHaveProperty('mutationKey')
      expect(admin.mutations.users.sessions.revokeAll).toHaveProperty('mutationKey')
    })
  })
})
