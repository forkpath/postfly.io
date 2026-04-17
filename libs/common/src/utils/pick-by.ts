export function pickBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean = v => v !== undefined && v !== null && v !== ''
): Partial<T> {
  const result: Partial<T> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && predicate(obj[key], key)) {
      result[key] = obj[key]
    }
  }
  return result
}
