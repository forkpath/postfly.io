const PROVIDER_PREFIXES: Record<string, string> = {
  stripe: 'cus_'
}

export class ExternalId {
  private constructor(private readonly value: string) {}

  static create(externalId: string, provider?: string): ExternalId {
    if (!externalId || externalId.trim().length === 0) {
      throw new Error('External ID cannot be empty')
    }

    if (provider && PROVIDER_PREFIXES[provider]) {
      const prefix = PROVIDER_PREFIXES[provider]
      if (!externalId.startsWith(prefix)) {
        throw new Error(`External ID for ${provider} must start with "${prefix}"`)
      }
    }

    return new ExternalId(externalId)
  }

  getValue(): string {
    return this.value
  }

  equals(other: ExternalId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
