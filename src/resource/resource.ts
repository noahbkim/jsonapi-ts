import {Id, IReference} from '../schema';

export abstract class Resource<TType extends string> {
  public id: Id;
  public abstract type: TType;

  protected constructor(id: Id = '') {
    this.id = id;
  }
}

export type AnyResource = Resource<string>;
export type ReferenceTo<TModel extends AnyResource> = TModel extends Resource<infer TType> ? IReference<TType> : never;
