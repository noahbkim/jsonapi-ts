import {AnyIResource, IType} from '../schema';
import type {AnyModel, IModel, TypeFromModel} from './model';

export class ModelRegistry {
  private registered: Map<IType, IModel<AnyModel>> = new Map();

  public put(model: IModel<AnyModel>) {
    this.registered.set(model.type, model);
  }

  public get<TModel extends AnyModel>(type: TypeFromModel<TModel>): IModel<TModel> {
    return this.registered.get(type)! as unknown as IModel<TModel>;
  }

  public wrap(resource: AnyIResource): AnyModel {
    return this.get(resource.type)!.wrap(resource);
  }

  public wrapAll(resources: Array<AnyIResource>): Array<AnyModel> {
    return resources.map(this.wrap);
  }
}
