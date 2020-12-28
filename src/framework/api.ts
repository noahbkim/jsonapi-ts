import {IDocument} from '../schema';
import {status} from './default';
import {AnyModel, IModel, IReadResourceFromModel, IWriteResourceFromModel} from '../model';
import {PartialResourceQuery, query} from './endpoint';
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
  public getMany<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    q: PartialResourceQuery<TModel>,
    p: PartialDocumentPagination = pagination(),
  ): Promise<ManyDocument<TModel>> {
    type TData = Array<IReadResourceFromModel<TModel>>;
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
  public getAll<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    q: PartialResourceQuery<TModel>,
  ): Promise<ManyDocument<TModel>> {
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
  public getAllIncremental<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    q: PartialResourceQuery<TModel>,
  ): IncrementalPromise<ManyDocument<TModel>, void> {
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
  public getOne<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    q: PartialResourceQuery<TModel> = query(),
  ): Promise<OneDocument<TModel>> {
    type TData = IReadResourceFromModel<TModel>;
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
  private getRestIncremental<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    q: PartialResourceQuery<TModel>,
    p: PartialDocumentPagination,
  ): IncrementalPromiseCallback<ManyDocument<TModel>, void> {
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

  public create<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    resource: TModel,
  ): Promise<OneDocument<TModel>> {
    type TReadData = IReadResourceFromModel<TModel>;
    type TWriteData = IWriteResourceFromModel<TModel>;
    const data = resource.unwrap() as TWriteData;
    return this.broker
      .request<TReadData, TWriteData>(Method.POST, url)
      .send({data})
      .then(status(201))
      .then((data: IDocument<TReadData>) => OneDocument.wrap(data, model));
  }

  public update<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    url: string,
    model: TIModel,
    resource: TModel,
  ): Promise<OneDocument<TModel>> {
    type TReadData = IReadResourceFromModel<TModel>;
    type TWriteData = IWriteResourceFromModel<TModel>;
    const data = resource.unwrap() as TWriteData;
    return this.broker
      .request<TReadData, TWriteData>(Method.PATCH, url)
      .send({data})
      .then(status(201))
      .then((data: IDocument<TReadData>) => OneDocument.wrap(data, model));
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
