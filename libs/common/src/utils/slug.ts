import { slugify } from 'transliteration'

/** URL-safe slug: lowercase a-z, digits, hyphens only (no leading/trailing hyphen). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function createSlug(input: string, fallback = 'category'): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return fallback
  }

  const slug = slugify(trimmed, {
    lowercase: true,
    separator: '-',
    trim: true,
    allowedChars: 'a-zA-Z0-9-'
  })
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug || !SLUG_PATTERN.test(slug)) {
    return fallback
  }

  return slug
}
