import {AnyIResource, IType} from '../schema';
import type {AnyModel, IModel} from './model';

export class ModelRegistry {
  private registered: Map<IType, IModel<IType, AnyIResource, AnyIResource>> = new Map();

  public put<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(model: IModel<TType, TIReadResource, TIWriteResource>) {
    this.registered.set(model.type, model);
  }

  public get<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(type: IType): IModel<TType, TIReadResource, TIWriteResource> {
    return this.registered.get(type)! as IModel<TType, TIReadResource, TIWriteResource>;
  }

  public wrap(resource: AnyIResource): AnyModel {
    return this.get(resource.type)!.wrap(resource);
  }

  public wrapAll(resources: Array<AnyIResource>): Array<AnyModel> {
    return resources.map(this.wrap);
  }
}
