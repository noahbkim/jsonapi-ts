import {JsonApi} from '../api';
import {AnyIResource, IType} from '../../schema';
import {IModel, Model} from '../../model';
import {PartialResourceQuery} from './query';
import {ManyDocument, OneDocument} from '../document';
import {IncrementalPromise} from '../library/promise';
import {ReferenceTo} from '../../resource';
import {join} from '../library/url';

export class ReadOnlyResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TIWriteResource extends AnyIResource<TType>,
  TModel extends Model<TType, TIReadResource, TIWriteResource>,
> {
  protected api: JsonApi;
  protected model: IModel<TType, TIReadResource, TIWriteResource, TModel>;
  protected url: string;

  public constructor(api: JsonApi, model: IModel<TType, TIReadResource, TIWriteResource, TModel>, url: string) {
    this.api = api;
    this.model = model;
    this.url = url;
  }

  public getAll(q: PartialResourceQuery<TModel>): Promise<ManyDocument<TModel>> {
    return this.api.getAll(this.url, this.model, q);
  }

  public getAllIncremental(q: PartialResourceQuery<TModel>): IncrementalPromise<ManyDocument<TModel>, void> {
    return this.api.getAllIncremental(this.url, this.model, q);
  }

  public getOne(reference: ReferenceTo<TModel>, q: PartialResourceQuery<TModel>): Promise<OneDocument<TModel>> {
    return this.api.getOne(join(this.url, reference.id), this.model, q);
  }
}

export class ResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TIWriteResource extends AnyIResource<TType>,
  TModel extends Model<TType, TIReadResource, TIWriteResource>,
> extends ReadOnlyResourceEndpoint<TType, TIReadResource, TIWriteResource, TModel> {
  public create(resource: TModel): Promise<OneDocument<TModel>> {
    return this.api.create(this.url, this.model, resource);
  }

  public update(resource: TModel): Promise<OneDocument<TModel>> {
    return this.api.update(join(this.url, resource.id), this.model, resource);
  }

  public delete(resource: TModel): Promise<void> {
    return this.api.delete(join(this.url, resource.id));
  }
}
