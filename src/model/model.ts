import {Resource, Reference} from '../resource';
import {AnyIResource, IType} from '../schema';
import {ModelRegistry} from './registry';

export interface IModel<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TIWriteResource extends AnyIResource<TType> = TIReadResource,
> {
  wrap(resource: TIReadResource): Model<TType, TIReadResource, TIWriteResource>,
  type: TType;
}

export abstract class Model<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TIWriteResource extends AnyIResource<TType> = TIReadResource,
> extends Resource<TType> {
  public static registry = new ModelRegistry();

  public abstract unwrap(): TIWriteResource;

  public reference(): Reference<this> {
    return new Reference<this>(this.id, this.type, this);
  }
}

export type AnyModel<TType extends IType = IType> = Model<TType, AnyIResource<TType>, AnyIResource<TType>>;
