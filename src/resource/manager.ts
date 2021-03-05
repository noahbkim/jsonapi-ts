import {JsonApi} from '@/jsonapi/framework';

import {Cardinality, Exactly, Many, One} from '../core/algebra';
import {Document, ManyDocument} from '../core/document';
import {AnyResource, IFromResource} from '../core/resource';
import {IncrementalPromise, IncrementalPromiseCallback} from '../library/promise';
import {join} from '../library/url';
import {expectStatus} from '../network';
import {AnyIResource, Id, IDocument, IReferenceTo} from '../schema';
import {pages, pagination, PartialResourcePagination} from './pagination';
import {ResourceQuery} from './query';

/** The central resource hub.
 *
 * Resources are inherently interconnected. When resources are request from the
 * server, it is possible that they come back with included resources of other
 * types. As such, whoever makes the actual request from the server should be
 * able to delegate tasks to specific endpoint.
 */
export class ResourceManager {
  protected readonly api: JsonApi;

  public constructor(api: JsonApi) {
    this.api = api;
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
   * @template TIResource the underlying resource interface we're expecting back.
   * @template TIData the data structure we're expecting in the document.
   * @template TResource an optional model subclass we've registered.
   * @param url the URL to request resources from.
   * @param q the resource query to send as GET parameters.
   * @return a promise for a list of resource models.
   */
  public getAll<TResource extends AnyResource, TIResource extends IFromResource<TResource> = IFromResource<TResource>>(
    url: string,
    q: ResourceQuery<TResource, TIResource>,
  ): Promise<ManyDocument<TResource, TIResource>> {
    return this.get<TResource, Many, TIResource>(url, q).then((document: ManyDocument<TResource, TIResource>) => {
      const p = document.pagination();
      if (p === undefined || p.offset === p.count) {
        return Promise.resolve(document);
      } else {
        return Promise.all(
          pages(p, document.data!.length).map((np) => this.get<TResource, Many, TIResource>(url, q, np)),
        ).then((results) => {
          results.forEach((page: ManyDocument<TResource, TIResource>) => document.merge(page));
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
   * @template TIResource the underlying resource interface we're expecting back.
   * @template TResource an optional model subclass we've registered.
   * @param url the URL to request resources from.
   * @param q the resource query to send as GET parameters.
   * @return an incremental promise for a list of resource models.
   */
  public getAllIncremental<
    TResource extends AnyResource,
    TIResource extends IFromResource<TResource> = IFromResource<TResource>
  >(
    url: string,
    q: ResourceQuery<TResource, TIResource>,
  ): IncrementalPromise<ManyDocument<TResource, TIResource>, void> {
    return new IncrementalPromise((step, resolve) => {
      return this.get<TResource, Many, TIResource>(url, q).then((page: ManyDocument<TResource, TIResource>) => {
        step(page);
        const fp = page.pagination();
        const np = fp && fp.advance(page.data!.length);
        if (np === undefined) {
          resolve();
        } else {
          return this.getRestIncremental<TResource, TIResource>(url, q, np);
        }
      });
    });
  }

  /** Get a single page of a resource query.
   *
   * This method takes a resource query and optional pagination and returns
   * two things: the resultant models and the updated pagination for the
   * consequent page.
   *
   * @template TIResource the underlying resource interface we're expecting back.
   * @template TResource an optional model subclass we've registered.
   * @template TCardinality the number of resources to expect, one or many.
   * @param url the URL to request resources from.
   * @param q the resource query to send as GET parameters.
   * @param p the pagination specifier to request.
   * @return a promise for a list of resource models and consequent pagination.
   */
  public get<
    TResource extends AnyResource,
    TCardinality extends Cardinality,
    TIResource extends IFromResource<TResource> = IFromResource<TResource>
  >(
    url: string,
    q: ResourceQuery<TResource, TIResource>,
    p: PartialResourcePagination = pagination(),
  ): Promise<Document<TResource, TCardinality, TIResource>> {
    return this.api
      .get(url)
      .parameters(q.with(p).parameters)
      .send()
      .then(expectStatus(200))
      .then((raw: IDocument<Exactly<TCardinality, TIResource>>) =>
        Document.wrap<TResource, TCardinality, TIResource>(raw),
      );
  }

  /** Get a single resource.
   *
   * This method takes a resource query and optional pagination and returns
   * two things: the resultant models and the updated pagination for the
   * consequent page.
   *
   * @template TIResource the underlying resource interface we're expecting back.
   * @template TResource an optional model subclass we've registered.
   * @template TCardinality the number of resources to expect, one or many.
   * @param url the URL to request resources from.
   * @param id the ID of the resource.
   * @param q the resource query to send as GET parameters.
   * @return a promise for a list of resource models and consequent pagination.
   */
  public getOne<TResource extends AnyResource, TIResource extends IFromResource<TResource> = IFromResource<TResource>>(
    url: string,
    id: Id,
    q: ResourceQuery<TResource, TIResource>,
  ): Promise<Document<TResource, One, TIResource>> {
    return this.api
      .get(url + id + '/')
      .parameters(q.parameters)
      .send()
      .then(expectStatus(200))
      .then((raw: IDocument<Exactly<One, TIResource>>) => Document.wrap<TResource, One, TIResource>(raw));
  }

  /** Create a new resource.
   *
   * Simply post the data of a resource to the endpoint. Rejects if the status
   * returned from the server is not 201.
   *
   * @param url the URL of the endpoint.
   * @param resource the resource object.
   */
  public create<TResource extends AnyResource, TIResource extends IFromResource<TResource> = IFromResource<TResource>>(
    url: string,
    resource: TResource,
  ): Promise<Document<TResource, One, TIResource>> {
    return this.api
      .post(url)
      .send({data: resource.unwrap()})
      .then(expectStatus(201))
      .then((data: IDocument<Exactly<One, TIResource>>) =>
        Promise.resolve(Document.wrap<TResource, One, TIResource>(data)),
      );
  }

  public update<TResource extends AnyResource, TIResource extends IFromResource<TResource> = IFromResource<TResource>>(
    url: string,
    resource: TResource,
  ): Promise<Document<TResource, One, TIResource>> {
    return this.api
      .put(join(url, resource.id))
      .send({data: resource.unwrap()})
      .then(expectStatus(201))
      .then((data: IDocument<Exactly<One, TIResource>>) =>
        Promise.resolve(Document.wrap<TResource, One, TIResource>(data)),
      );
  }

  public delete<TIResource extends AnyIResource, TReference extends IReferenceTo<TIResource>>(
    url: string,
    resource: TReference,
  ): Promise<void> {
    return this.api.delete(join(url, resource.id)).send().then(expectStatus(204)).then();
  }

  /** A recursive routine for getAllIncremental.
   *
   * Called internally to nicely generate callbacks for the resultant
   * incremental promise.
   *
   * @template TIResource the underlying resource interface we're expecting back.
   * @template TResource an optional model subclass we've registered.
   * @param url the URL to request resources from
   * @param q the resource query to send as GET parameters.
   * @param p the pagination specifier to request.
   * @return a specialized callback for the promise.
   */
  private getRestIncremental<
    TResource extends AnyResource,
    TIResource extends IFromResource<TResource> = IFromResource<TResource>
  >(
    url: string,
    q: ResourceQuery<TResource, TIResource>,
    p: PartialResourcePagination,
  ): IncrementalPromiseCallback<ManyDocument<TResource, TIResource>, void> {
    return (step, resolve, reject) => {
      return this.get<TResource, Many, TIResource>(url, q, p)
        .then((page: ManyDocument<TResource, TIResource>) => {
          step(page);
          const fp = page.pagination();
          const np = fp && fp.advance(page.data!.length);
          if (np === undefined) {
            resolve();
          } else {
            return this.getRestIncremental<TResource, TIResource>(url, q, np);
          }
        })
        .catch(reject);
    };
  }
}
