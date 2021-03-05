export type One = 'one';
export type Many = 'many';
export type Cardinality = One | Many;

export type Some<T> = T | Array<T>;
export type Exactly<TCardinality, T> = TCardinality extends One ? T : Array<T>;
