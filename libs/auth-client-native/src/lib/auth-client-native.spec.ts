import { resolvePermissionCheckSuccess } from './permission-result'

describe('resolvePermissionCheckSuccess', () => {
  it('supports Better Auth response envelopes', () => {
    expect(resolvePermissionCheckSuccess({ data: { success: true } })).toBe(true)
    expect(resolvePermissionCheckSuccess({ success: false })).toBe(false)
    expect(resolvePermissionCheckSuccess(undefined)).toBe(false)
  })
})
