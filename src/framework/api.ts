import {AnyIResource, IDocument, IType} from '../schema';
import {status} from './default';
import {IModel, Model} from '../model';
import {PartialResourceQuery, query} from './endpoint/query';
import {ManyDocument, OneDocument, pages, pagination, PartialDocumentPagination} from './document';
import {Callback, IncrementalPromise, IncrementalPromiseCallback, OptionalCallback} from './library/promise';
import {DocumentBroker} from './default/api';
import {IDocumentBroker, Method} from './broker';

export class JsonApi {
  private broker: IDocumentBroker;

  public constructor(api: IDocumentBroker = new DocumentBroker()) {
    this.broker = api;
  }

  /** Get a single page of a resource query.
   *
   * This method takes a resource query and optional pagination and returns
   * two things: the resultant models and the updated pagination for the
   * consequent page.
   *
   * @template TTModel an optional subclass to cast.
   * @param url the URL to request resources from.
   * @param model the model to wrap the response data with.
   * @param q the resource query to send as GET parameters.
   * @param p the pagination specifier to request.
   * @return a promise for a list of resource models and consequent pagination.
   */
  public getMany<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    q: PartialResourceQuery<Model<TType, TIReadResource, TIWriteResource>>,
    p: PartialDocumentPagination = pagination(),
  ): Promise<ManyDocument<Model<TType, TIReadResource, TIWriteResource>>> {
    type TModel = Model<TType, TIReadResource, TIWriteResource>;
    type TData = Array<TIReadResource>;
    return this.broker
      .request<TData>(Method.GET, url)
      .parameters(q.typed(model.type).with(p).parameters)
      .send()
      .then(status(200))
      .then((data: IDocument<TData>) => ManyDocument.wrap(data, model) as ManyDocument<TModel>);
  }

  /** Get all resources of a given type.
   *
   * We cannot know the pagination of the complete set of resources until we've
   * requested the first page. Therefore, the asynchronous flow of this method
   * looks like this:
   *
   * | request page 1 | -> | request page 2 | -> | resolve |
   *                       | request page 3 |
   *                       | ...            |
   *
   * @template TTModel a model subclass to cast.
   * @param url the URL to request resources from.
   * @param model the model to wrap the response data with.
   * @param q the resource query to send as GET parameters.
   * @return a promise for a list of resource models.
   */
  public getAll<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    q: PartialResourceQuery<Model<TType, TIReadResource, TIWriteResource>>,
  ): Promise<ManyDocument<Model<TType, TIReadResource, TIWriteResource>>> {
    type TModel = Model<TType, TIReadResource, TIWriteResource>;
    return this.getMany(url, model, q).then((document: ManyDocument<TModel>) => {
      const p = document.pagination();
      if (p === undefined || p.offset === p.count) {
        return Promise.resolve(document);
      } else {
        const promises = pages(p, document.data!.length)
          .map((np: PartialDocumentPagination) => this.getMany(url, model, q, np));
        return Promise.all(promises).then((results: Array<ManyDocument<TModel>>) => {
          results.forEach((page: ManyDocument<TModel>) => document.merge(page));
          return Promise.resolve(document);
        });
      }
    });
  }

  /** Get all resources of a given type incrementally.
   *
   * Similar to getAll, but provides an additional step() per the custom
   * IncrementalPromise that produces partial searchResults until completion.
   *
   * Note: I don't know if I'll ever be able to understand this code again.
   *
   * @template TModel an optional model to cast.
   * @param url the URL to request resources from.
   * @param model the model to wrap the response data with.
   * @param q the resource query to send as GET parameters.
   * @return an incremental promise for a list of resource models.
   */
  public getAllIncremental<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    q: PartialResourceQuery<Model<TType, TIReadResource, TIWriteResource>>,
  ): IncrementalPromise<ManyDocument<Model<TType, TIReadResource, TIWriteResource>>, void> {
    type TModel = Model<TType, TIReadResource, TIWriteResource>;
    return new IncrementalPromise((step: Callback<ManyDocument<TModel>>, resolve: Callback<void>) => {
      return this.getMany(url, model, q).then((page: ManyDocument<TModel>) => {
        step(page);
        const fp = page.pagination();
        const np = fp && fp.advance(page.data!.length);
        if (np === undefined) {
          resolve();
        } else {
          return this.getRestIncremental(url, model, q, np);
        }
      });
    });
  }

  /** Get a single resource.
   *
   * This method takes a resource query and optional pagination and returns
   * two things: the resultant models and the updated pagination for the
   * consequent page.
   *
   * @template TTModel an optional model subclass to cast.
   * @param url the URL to request resources from.
   * @param model the model to wrap the response data with.
   * @param q the resource query to send as GET parameters.
   * @return a single resource.
   */
  public getOne<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    q: PartialResourceQuery<Model<TType, TIReadResource, TIWriteResource>> = query(),
  ): Promise<OneDocument<Model<TType, TIReadResource, TIWriteResource>>> {
    type TModel = Model<TType, TIReadResource, TIWriteResource>;
    type TData = TIReadResource;
    return this.broker
      .request<TData>(Method.GET, url)
      .parameters(q.typed(model.type).parameters)
      .send()
      .then(status(200))
      .then((raw: IDocument<TData>) => OneDocument.wrap(raw, model) as OneDocument<TModel>);
  }

  /** A recursive routine for getAllIncremental.
   *
   * Called internally to nicely generate callbacks for the resultant
   * incremental promise.
   *
   * @template TTModel an optional model to cast.
   * @param url the URL to request resources from
   * @param model the model to wrap the response data with.
   * @param q the resource query to send as GET parameters.
   * @param p the pagination specifier to request.
   * @return a specialized callback for the promise.
   */
  private getRestIncremental<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    q: PartialResourceQuery<Model<TType, TIReadResource, TIWriteResource>>,
    p: PartialDocumentPagination,
  ): IncrementalPromiseCallback<ManyDocument<Model<TType, TIReadResource, TIWriteResource>>, void> {
    type TModel = Model<TType, TIReadResource, TIWriteResource>;
    return (step: Callback<ManyDocument<TModel>>, resolve: Callback<void>, reject: OptionalCallback<any>) => {
      return this.getMany(url, model, q, p)
        .then((page: ManyDocument<TModel>) => {
          step(page);
          const fp = page.pagination();
          const np = fp && fp.advance(page.data!.length);
          if (np === undefined) {
            resolve();
          } else {
            return this.getRestIncremental(url, model, q, np);
          }
        }).catch(reject);
    };
  }

  public create<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    resource: Model<TType, TIReadResource, TIWriteResource>,
  ): Promise<OneDocument<Model<TType, TIReadResource, TIWriteResource>>> {
    return this.broker
      .request<TIReadResource, TIWriteResource>(Method.POST, url)
      .send({data: resource.unwrap()})
      .then(status(201))
      .then((data: IDocument<TIReadResource>) => OneDocument.wrap(data, model));
  }

  public update<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType> = TIReadResource,
  >(
    url: string,
    model: IModel<TType, TIReadResource, TIWriteResource>,
    resource: Model<TType, TIReadResource, TIWriteResource>,
  ): Promise<OneDocument<Model<TType, TIReadResource, TIWriteResource>>> {
    return this.broker
      .request<TIReadResource, TIWriteResource>(Method.PATCH, url)
      .send({data: resource.unwrap()})
      .then(status(201))
      .then((data: IDocument<TIReadResource>) => OneDocument.wrap(data, model));
  }

  public delete(
    url: string,
  ): Promise<void> {
    return this.broker
      .request(Method.DELETE, url)
      .send()
      .then(status(204))
      .then();
  }
}
