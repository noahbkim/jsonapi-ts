class CacheEntry<TValue> {
  public constructor(public value: TValue, public expiry?: number) {}
}

export const CacheExpiration = {
  NEVER: 0,
  DISABLE: -1,
};

export class Cache<TKey, TValue> {
  private cache: Map<TKey, CacheEntry<TValue>> = new Map();
  private readonly expiration: number;

  public constructor(expiration: number = CacheExpiration.NEVER) {
    this.expiration = expiration;
  }

  public get(key: TKey): TValue | undefined {
    if (this.expiration === CacheExpiration.DISABLE) {
      return undefined;
    }
    const entry = this.cache.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (this.expiration === CacheExpiration.NEVER) {
      return entry.value;
    }
    if (entry.expiry !== undefined && entry.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  public set(key: TKey, value: TValue): TValue {
    const expiry = this.expiration ? Date.now() + this.expiration : undefined;
    this.cache.set(key, new CacheEntry<TValue>(value, expiry));
    return value;
  }

  public values(): Array<TValue> {
    return Array.from(this.cache.values()).map((entry: CacheEntry<TValue>) => entry.value);
  }

  public invalidate(): void {
    this.cache.clear();
  }
}
