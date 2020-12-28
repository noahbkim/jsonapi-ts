export type One = 'one';
export type Many = 'many';
export type Cardinality = One | Many;

export type Some<T> = T | Array<T>;
export type Exactly<TCardinality extends Cardinality, T> = TCardinality extends One ? T : Array<T>;

export class Cardinal {
  public static apply<T, U, TCardinality extends Cardinality>(
    data: Exactly<TCardinality, T>,
    one: (data: T) => U,
    many?: (data: Array<T>) => Array<U>,
  ): Exactly<TCardinality, U> {
    if (Array.isArray(data)) {
      if (many !== undefined) {
        return many(data as Array<T>) as Exactly<TCardinality, U>;
      } else {
        return data.map(one) as Exactly<TCardinality, U>;
      }
    } else {
      return one(data as T) as Exactly<TCardinality, U>;
    }
  }
}

export class Option {
  public static apply<T, U>(value: T | undefined, f: (t: T) => U) {
    if (value === undefined) {
      return undefined;
    } else {
      return f(value);
    }
  }
}
