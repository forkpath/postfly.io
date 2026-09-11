import { describe, expect, it } from 'vitest'

import { BillingAccessDeniedException } from '../../exceptions/billing.exception'
import { BillingOwner } from '../../value-objects/billing-owner.vo'
import { UserId } from '../../value-objects/user-id.vo'
import { BillingAccount } from '../billing-account.entity'

describe('BillingAccount', () => {
  it('allows a user to manage their own billing account', () => {
    const account = new BillingAccount(BillingOwner.forUser('user-1'), [])
    expect(() => account.assertManageableBy(UserId.create('user-1'))).not.toThrow()
  })

  it('allows organization owners and admins to manage billing', () => {
    const account = new BillingAccount(BillingOwner.forOrganization('organization-1'), [])
    expect(() => account.assertManageableBy(UserId.create('user-1'), 'owner')).not.toThrow()
    expect(() => account.assertManageableBy(UserId.create('user-2'), 'admin')).not.toThrow()
  })

  it('denies organization members from managing billing', () => {
    const account = new BillingAccount(BillingOwner.forOrganization('organization-1'), [])
    expect(() => account.assertManageableBy(UserId.create('user-1'), 'member')).toThrow(BillingAccessDeniedException)
  })
})
