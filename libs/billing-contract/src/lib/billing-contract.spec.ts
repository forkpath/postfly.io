import { getBillingOwnerId, getBillingOwnerQueryKey } from './billing-contract'

describe('billing owner contract', () => {
  it('keeps user and organization cache namespaces distinct', () => {
    expect(getBillingOwnerQueryKey({ kind: 'user', userId: 'same-id' })).toEqual(['user', 'same-id'])
    expect(getBillingOwnerQueryKey({ kind: 'organization', organizationId: 'same-id' })).toEqual([
      'organization',
      'same-id'
    ])
  })

  it('returns the explicit owner id', () => {
    expect(getBillingOwnerId({ kind: 'organization', organizationId: 'org-1' })).toBe('org-1')
  })
})
