import { describe, expect, it, vi } from 'vitest'

import { getAdminNavConfig } from '../nav-config'

describe('getAdminNavConfig', () => {
  const mockT = vi.fn((key: string) => key)

  it('should return a valid SecondaryNavConfig', () => {
    const config = getAdminNavConfig(mockT as never)

    expect(config).toHaveProperty('title')
    expect(config).toHaveProperty('groups')
    expect(config.title).toBe('admin')
  })

  it('should have exactly one group', () => {
    const config = getAdminNavConfig(mockT as never)

    expect(config.groups).toHaveLength(1)
  })

  it('should have 3 nav items (users, organizations, customers)', () => {
    const config = getAdminNavConfig(mockT as never)

    const items = config.groups[0].items
    expect(items).toHaveLength(3)
  })

  it('should have correct href paths', () => {
    const config = getAdminNavConfig(mockT as never)

    const hrefs = config.groups[0].items.map(item => item.href)
    expect(hrefs).toContain('/admin/users')
    expect(hrefs).toContain('/admin/organizations')
    expect(hrefs).toContain('/admin/customers')
  })

  it('should have icons for all items', () => {
    const config = getAdminNavConfig(mockT as never)

    for (const item of config.groups[0].items) {
      expect(item.icon).toBeDefined()
    }
  })
})
