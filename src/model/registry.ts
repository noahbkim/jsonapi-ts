import {AnyIResource, IType, IView} from '../schema';
import {AnyModel, IModelFactory, Model} from './model';

type ModelFactory = IModelFactory<IType, AnyIResource, AnyModel>;

class ModelRegistryEntry {
  public factory: ModelFactory | undefined;
  public factoryByView: Map<string, ModelFactory> | undefined;

  public constructor() {
    this.factory = undefined;
    this.factoryByView = undefined;
  }

  public setFactory(factory: ModelFactory): void {
    this.factory = factory;
  }

  public setFactoryForView(view: string, factory: ModelFactory): void {
    if (this.factoryByView === undefined) {
      this.factoryByView = new Map();
    }
    this.factoryByView.set(view, factory);
  }
}

class ModelRegistry {
  private registered: Map<IType, ModelRegistryEntry> = new Map();

  public put<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
    TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  >(modelFactory: TModelFactory): void {
    let entry = this.registered.get(modelFactory.type);
    if (entry === undefined) {
      entry = new ModelRegistryEntry();
      this.registered.set(modelFactory.type, entry);
    }
    entry.setFactory(modelFactory);
  }

  public putView<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
    TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  >(view: IView, modelFactory: TModelFactory): void {
    let entry = this.registered.get(modelFactory.type);
    if (entry === undefined) {
      entry = new ModelRegistryEntry();
      this.registered.set(modelFactory.type, entry);
    }
    entry.setFactoryForView(view, modelFactory);
  }

  public get<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
    TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  >(resource: TIReadResource): TModelFactory | undefined {
    const entry = this.registered.get(resource.type);
    if (resource.view !== undefined) {
      return entry?.factoryByView?.get(resource.view) as TModelFactory;
    } else {
      return entry?.factory as TModelFactory;
    }
  }

  public wrap<TType extends IType, TIReadResource extends AnyIResource<TType>, TModel extends Model<TType>>(
    resource: TIReadResource,
  ): TModel {
    const factory = this.get(resource);
    if (factory === undefined) {
      throw new Error(`no factory for type ${resource.type}, view ${resource.view ?? '<empty>'}`);
    }
    return factory.read(resource) as TModel;
  }

  public wrapAll(resources: Array<AnyIResource>): Array<AnyModel> {
    return resources.map(this.wrap.bind(this));
  }
}

export const registry = new ModelRegistry();

export function register<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
>(factory: TModelFactory): void {
  registry.put(factory);
}

register.view = function registerView<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
>(view: IView): (model: TModelFactory) => void {
  return (factory: TModelFactory) => {
    registry.putView(view, factory);
  };
};
