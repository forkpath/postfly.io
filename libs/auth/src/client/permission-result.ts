/**
 * 统一解析 hasPermission 返回值。
 * 不同版本/调用场景可能返回 { success } 或 { data: { success } }。
 */
export const resolvePermissionCheckSuccess = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }

  if (!value || typeof value !== 'object') {
    return false
  }

  const parsed = value as {
    success?: unknown
    data?: {
      success?: unknown
    }
  }

  if (typeof parsed.success === 'boolean') {
    return parsed.success
  }

  if (typeof parsed.data?.success === 'boolean') {
    return parsed.data.success
  }

  return false
}
