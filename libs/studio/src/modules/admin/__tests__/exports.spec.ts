import { describe, expect, it } from 'vitest'

import * as adminModule from '../index'

describe('admin module exports', () => {
  it('should export admin api (queries and mutations)', () => {
    expect(adminModule.admin).toBeDefined()
    expect(adminModule.admin.queries).toBeDefined()
    expect(adminModule.admin.mutations).toBeDefined()
    expect(adminModule.admin.queries.users).toBeDefined()
    expect(adminModule.admin.mutations.users).toBeDefined()
  })

  it('should export nav config', () => {
    expect(typeof adminModule.getAdminNavConfig).toBe('function')
  })

  it('should export layout components', () => {
    expect(typeof adminModule.DetailsList).toBe('function')
    expect(typeof adminModule.DetailsListItem).toBe('function')
    expect(typeof adminModule.AdminSecondaryNav).toBe('function')
    expect(typeof adminModule.ImpersonatingBanner).toBe('function')
  })

  it('should export user list DataTable', () => {
    expect(typeof adminModule.UsersDataTable).toBe('function')
  })

  it('should export user detail components', () => {
    expect(typeof adminModule.UserHeader).toBe('function')
    expect(typeof adminModule.UserDetails).toBe('function')
    expect(typeof adminModule.SessionsList).toBe('function')
  })

  it('should export user sub-entity DataTables', () => {
    expect(typeof adminModule.AccountsDataTable).toBe('function')
    expect(typeof adminModule.SubscriptionsDataTable).toBe('function')
    expect(typeof adminModule.OrdersDataTable).toBe('function')
    expect(typeof adminModule.MembershipsDataTable).toBe('function')
    expect(typeof adminModule.InvitationsDataTable).toBe('function')
  })

  it('should export user action components', () => {
    expect(typeof adminModule.BanAction).toBe('function')
    expect(typeof adminModule.DeleteAction).toBe('function')
    expect(typeof adminModule.ImpersonateAction).toBe('function')
  })

  it('should export organization list DataTable', () => {
    expect(typeof adminModule.OrganizationsDataTable).toBe('function')
  })

  it('should export organization detail components', () => {
    expect(typeof adminModule.OrganizationHeader).toBe('function')
    expect(typeof adminModule.OrganizationDetails).toBe('function')
    expect(typeof adminModule.MembersDataTable).toBe('function')
    expect(typeof adminModule.OrgInvitationsDataTable).toBe('function')
    expect(typeof adminModule.DeleteOrgAction).toBe('function')
  })

  it('should export customer list DataTable', () => {
    expect(typeof adminModule.CustomersDataTable).toBe('function')
  })
})
