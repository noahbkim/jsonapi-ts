import {Resource, Reference} from '../resource';
import {AnyIResource, IType} from '../schema';
import {ModelRegistry} from './registry';

export interface IModel<TModel extends AnyModel> {
  wrap(resource: IReadResourceFromModel<TModel>): TModel,
  type: TypeFromModel<TModel>;
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
export type TypeFromModel<TModel extends AnyModel> = TModel['type'];

export type IReadResourceFromModel<
  TModel extends AnyModel
> = TModel extends Model<TModel['type'], infer IR, any> ? IR : never;

export type IWriteResourceFromModel<
  TModel extends AnyModel
> = TModel extends Model<TModel['type'], any, infer IW> ? IW : never;
