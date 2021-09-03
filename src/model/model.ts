import {Reference, Resource} from '../resource';
import {AnyIResource, IType, PartialIResource} from '../schema';

export interface IModelFactory<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
> {
  read(resource: TIReadResource): TModel;
  type: TypeFromModel<TModel>;
}

export interface IReread<TType extends IType, TIReadResource extends AnyIResource<TType>> {
  reread(data: TIReadResource): void;
}

export interface ICreate<TType extends IType, TICreateResource extends AnyIResource<TType>> {
  create(): TICreateResource;
}

export interface IUpdate<TType extends IType, IWriteResource extends AnyIResource<TType>> {
  update(): PartialIResource<IWriteResource>;
}

export abstract class Model<TType extends IType> extends Resource<TType> {
  public reference(): Reference<this> {
    return new Reference<this>(this.id, this.type, this);
  }
}

export type AnyModel<TType extends IType = IType> = Model<TType>;
export type TypeFromModel<TModel extends AnyModel> = TModel['type'];

export type IReadResourceFromModel<TModel extends AnyModel & IReread<TModel['type'], AnyIResource<TModel['type']>>> =
  TModel extends IReread<TModel['type'], infer I> ? I : never;

export type IWriteResourceFromModel<TModel extends AnyModel & IUpdate<TModel['type'], AnyIResource<TModel['type']>>> =
  TModel extends IUpdate<TModel['type'], infer I> ? I : never;
