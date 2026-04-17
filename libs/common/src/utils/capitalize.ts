export function capitalize<T extends string>(value: T): Capitalize<T> {
  if (!value) return value as Capitalize<T>
  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<T>
}
