import {JsonApi} from '../api';
import {AnyModel, IModel} from '../../model';
import {PartialResourceQuery} from './query';
import {ManyDocument, OneDocument} from '../document';
import {IncrementalPromise} from '../library/promise';
import {ReferenceTo} from '../../resource';
import {join} from '../library/url';

export class ReadOnlyResourceEndpoint<
  TModel extends AnyModel,
  TIModel extends IModel<TModel>,
> {
  protected api: JsonApi;
  protected model: TIModel;
  protected url: string;

  public constructor(api: JsonApi, model: TIModel, url: string) {
    this.api = api;
    this.model = model;
    this.url = url;
  }

  public nested<TNModel extends AnyModel, TNIModel extends IModel<TNModel>>(
    resource: TModel,
    path: string,
    model: TNIModel,
  ): ReadOnlyResourceEndpoint<TNModel, TNIModel> {
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
  TModel extends AnyModel,
  TIModel extends IModel<TModel>,
> extends ReadOnlyResourceEndpoint<TModel, TIModel> {
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
