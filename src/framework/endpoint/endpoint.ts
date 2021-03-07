import {JsonApi} from '../api';
import {AnyModel, IModel} from '../../model';
import {PartialResourceQuery, query} from './query';
import {ManyDocument, OneDocument} from '../document';
import {IncrementalPromise} from '../library/promise';
import {Reference, ReferenceTo} from '../../resource';
import {join} from '../library/url';
import {Id} from "@/jsonapi/schema";

export class ReadOnlyResourceEndpoint<
  TModel extends AnyModel,
  TIModel extends IModel<TModel> = IModel<TModel>,
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
    TNModel extends AnyModel,
    TNIModel extends IModel<TNModel> = IModel<TNModel>
  >(
    resource: TModel | Reference<TModel>,
    model: TNIModel,
    path: string,
  ): ReadOnlyResourceEndpoint<TNModel, TNIModel> {
    return new ReadOnlyResourceEndpoint(this.api, model, join(this.url, resource.id, path));
  }

  public getAll(q: PartialResourceQuery<TModel> = query()): Promise<ManyDocument<TModel>> {
    return this.api.getAll(this.url, this.model, q);
  }

  public getAllIncremental(q: PartialResourceQuery<TModel> = query()): IncrementalPromise<ManyDocument<TModel>, void> {
    return this.api.getAllIncremental(this.url, this.model, q);
  }

  public getOne(
    reference: ReferenceTo<TModel> | Id,
    q: PartialResourceQuery<TModel> = query()
  ): Promise<OneDocument<TModel>> {
    const id = typeof reference === 'string' ? reference : reference.id;
    return this.api.getOne(join(this.url, id), this.model, q);
  }
}

export class ResourceEndpoint<
  TModel extends AnyModel,
  TIModel extends IModel<TModel> = IModel<TModel>,
> extends ReadOnlyResourceEndpoint<TModel, TIModel> {
  public nested<
    TNModel extends AnyModel,
    TNIModel extends IModel<TNModel> = IModel<TNModel>
  >(
    resource: TModel | Reference<TModel>,
    model: TNIModel,
    path: string,
  ): ResourceEndpoint<TNModel, TNIModel> {
    return new ResourceEndpoint(this.api, model, join(this.url, resource.id, path));
  }

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
