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
  TIModel extends IModel<TType, TIReadResource, TIWriteResource, TModel>,
> {
  protected api: JsonApi;
  protected model: TIModel;
  protected url: string;

  public constructor(api: JsonApi, model: TIModel, url: string) {
    this.api = api;
    this.model = model;
    this.url = url;
  }

  public nested<
    TNType extends IType,
    TNIReadResource extends AnyIResource<TNType>,
    TNIWriteResource extends AnyIResource<TNType>,
    TNModel extends Model<TNType, TNIReadResource, TNIWriteResource>,
    TNIModel extends IModel<TNType, TNIReadResource, TNIWriteResource, TNModel>,
  >(
    resource: TModel,
    path: string,
    model: TNIModel,
  ): ReadOnlyResourceEndpoint<TNType, TNIReadResource, TNIWriteResource, TNModel, TNIModel> {
    return new ReadOnlyResourceEndpoint(this.api, model, join(this.url, resource.id, path));
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
  TIModel extends IModel<TType, TIReadResource, TIWriteResource, TModel>,
> extends ReadOnlyResourceEndpoint<TType, TIReadResource, TIWriteResource, TModel, TIModel> {
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
