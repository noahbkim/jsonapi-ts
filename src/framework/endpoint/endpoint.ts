import {AnyModel, ICreate, IModelFactory, IReread, IUpdate, Model} from '../../model';
import {Reference, Resource} from '../../resource';
import {AnyIResource, Id, IDocument, IReference, IType, PartialIResource} from '../../schema';
import {JsonApi} from '../api';
import {
  DocumentPagination,
  OneReadDocument,
  pages,
  pagination,
  PartialDocumentPagination,
  ReadManyDocument,
} from '../document';
import {Callback, IncrementalPromise, IncrementalPromiseCallback, OptionalCallback} from '../library/promise';
import {join} from '../library/url';
import {PartialResourceQuery, query} from './query';

export interface IChild {
  copy(url: string): this;
}

export interface IChildren {
  [key: string]: IChild;
}

export function clone<T>(source: T, overwrite?: Record<string, any>): T {
  const copy = Object.create(Object.getPrototypeOf(source));
  Object.assign(copy, source, overwrite);
  return copy;
}

export abstract class Endpoint<TChildren extends IChildren> implements IChild {
  public constructor(
    protected readonly api: JsonApi,
    protected readonly url: string,
    public readonly children?: TChildren,
  ) {}

  public copy(url: string): this {
    return clone(this, {url: join(url, this.url)});
  }
}

type OneDocumentCallback<TModel extends AnyModel> = (document: OneReadDocument<TModel>, resource: TModel) => void;

/** A resource endpoint that can list and retrieve.
 *
 * Selectively permitting read-only operations allows us to use any models that
 * don't implement Unwrap.
 *
 * @template TType the resource type.
 * @template TNIReadResource the read resource interface.
 * @template TModel the wrapping model class.
 * @template TModelFactory a factory type that wraps the provided model type.
 */
export abstract class ReadOnlyResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  TChildren extends IChildren,
> extends Endpoint<TChildren> {
  protected abstract modelFactory: TModelFactory;

  public for(
    reference: AnyModel<TType> | Reference<AnyModel<TType>> | AnyIResource<TType> | IReference<TType> | Id,
  ): TChildren {
    const id = typeof reference === 'object' ? reference.id : reference;
    const url = join(this.url, id);
    return new Proxy<TChildren>(this.children!, {
      get(target: TChildren, name: string) {
        return Reflect.get(target, name).copy(url);
      },
    });
  }

  /** List an arbitrary number of resources at an endpoint.
   *
   * @param q any query options to send with the request.
   * @param p pagination options.
   * @return a promise for a document with the wrapped models requested.
   */
  public list(
    q: PartialResourceQuery<TType> = query(),
    p: PartialDocumentPagination = pagination(),
  ): Promise<ReadManyDocument<TModel>> {
    return this.api
      .list<TType, TIReadResource>(this.url, this.modelFactory.type, q, p)
      .then((document: IDocument<Array<TIReadResource>>) =>
        ReadManyDocument.wrap<TType, TIReadResource, TModel, TModelFactory>(document, this.modelFactory),
      );
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
   * @param q the resource query to send as GET parameters.
   * @param p pagination options.
   * @return a promise for a list of resource models.
   */
  public listAll(
    q: PartialResourceQuery<TType> = query(),
    p: PartialDocumentPagination = pagination(),
  ): Promise<ReadManyDocument<TModel>> {
    return this.api
      .list<TType, TIReadResource>(this.url, this.modelFactory.type, q, p)
      .then((document: IDocument<Array<TIReadResource>>) => {
        const p = DocumentPagination.fromMeta(document.meta);
        if (p === undefined || p.offset === undefined || p.offset >= p.count) {
          return Promise.resolve(ReadManyDocument.wrap(document, this.modelFactory));
        } else {
          const promises = pages(p, document.data!.length).map((np: PartialDocumentPagination) => {
            return this.api.list<TType, TIReadResource>(this.url, this.modelFactory.type, q, np);
          });
          return Promise.all(promises).then((rest: Array<IDocument<Array<TIReadResource>>>) => {
            rest.unshift(document);
            return Promise.resolve(ReadManyDocument.combine(rest, this.modelFactory));
          });
        }
      });
  }

  /** Get all resources of a given type incrementally.
   *
   * Similar to listAll, but provides an additional step() per the custom
   * IncrementalPromise that produces partial searchResults until completion.
   *
   * Note: I don't know if I'll ever be able to understand this code again.
   *
   * @template TModel an optional modelFactory to cast.
   * @param q the resource query to send as GET parameters.
   * @return an incremental promise for a list of resource models.
   */
  public listAllIncremental(
    q: PartialResourceQuery<TType> = query(),
  ): IncrementalPromise<ReadManyDocument<TModel>, void> {
    return new IncrementalPromise((step: Callback<ReadManyDocument<TModel>>, resolve: Callback<void>) => {
      return this.api
        .list<TType, TIReadResource>(this.url, this.modelFactory.type, q)
        .then(this.getListRestIncrementalCallback(step, resolve, q));
    });
  }

  private getListRestIncrementalCallback(
    step: Callback<ReadManyDocument<TModel>>,
    resolve: Callback<void>,
    q: PartialResourceQuery<TType>,
  ) {
    return (page: IDocument<Array<TIReadResource>>) => {
      step(ReadManyDocument.wrap(page, this.modelFactory));
      const fp = DocumentPagination.fromMeta(page.meta);
      const np = fp && fp.advance(page.data!.length);
      if (np === undefined) {
        resolve();
      } else {
        return this.listRestIncremental(q, np);
      }
    };
  }

  /** A recursive routine for listAllIncremental.
   *
   * Called internally to nicely generate callbacks for the resultant
   * incremental promise.
   *
   * @template TTModel an optional modelFactory to cast.
   * @param q the resource query to send as GET parameters.
   * @param p the pagination specifier to request.
   * @return a specialized callback for the promise.
   */
  private listRestIncremental(
    q: PartialResourceQuery<TType>,
    p: PartialDocumentPagination,
  ): IncrementalPromiseCallback<ReadManyDocument<TModel>, void> {
    return (step: Callback<ReadManyDocument<TModel>>, resolve: Callback<void>, reject: OptionalCallback<any>) => {
      return this.api
        .list<TType, TIReadResource>(this.url, this.modelFactory.type, q, p)
        .then(this.getListRestIncrementalCallback(step, resolve, q))
        .catch(reject);
    };
  }

  /** Retrieve a single resource via its reference or ID.
   *
   * @param reference the reference or ID to the desired resource.
   * @param q query parameters associated with the request.
   * @return a promise to a one document with the requested resource.
   */
  public retrieve(
    reference: Reference<TModel> | IReference<TType> | Id,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    const id = typeof reference === 'object' ? reference.id : reference;
    return this.api
      .retrieve<TType, TIReadResource>(join(this.url, id), this.modelFactory.type, q)
      .then((data: IDocument<TIReadResource>) => {
        return OneReadDocument.wrap(data, this.modelFactory);
      });
  }
}

/** A resource endpoint that can list and retrieve.
 *
 * Add write operations.
 *
 * @template TType the resource type.
 * @template TNIReadResource the read resource interface.
 * @template TNICreateResource the create resource interface.
 * @template TNIUpdateResource the update resource interface.
 * @template TModel the wrapping model class.
 * @template TModelFactory a factory type that wraps the provided model type.
 */
export abstract class ReadWriteResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TICreateResource extends AnyIResource<TType>,
  TIUpdateResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  TChildren extends IChildren,
> extends ReadOnlyResourceEndpoint<TType, TIReadResource, TModel, TModelFactory, TChildren> {
  /** Create a new resource given a local model.
   *
   * @param resource the model to send to be created.
   * @param q additional query parameters.
   * @return a promise for a one document with the created resource.
   */
  public create(
    resource: Resource<TType> & ICreate<TType, TICreateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.createFromData(resource.create(), q);
  }

  /** Create a new resource given a local model.
   *
   * @param data the data to create the resource with.
   * @param q additional query parameters.
   * @return a promise for a one document with the created resource.
   */
  public createFromData(
    data: TICreateResource,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.api
      .create<TType, TIReadResource, TICreateResource>(this.url, data, q)
      .then((data: IDocument<TIReadResource>) => OneReadDocument.wrap(data, this.modelFactory));
  }

  /** Update a resource based on a local model.
   *
   * @param resource the model to send to be updated.
   * @param q additional query parameters.
   * @return a promise for a one document with the updated resource.
   */
  public update(
    resource: Resource<TType> & IUpdate<TType, TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.updateFromData(resource.update(), q);
  }

  /** Update a resource based on write dataa.
   *
   * @param data the data to update the resource with.
   * @param q additional query parameters.
   * @return a promise for a one document with the updated resource.
   */
  public updateFromData(
    data: PartialIResource<TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.api
      .update<TType, TIReadResource, PartialIResource<TIUpdateResource>>(join(this.url, data.id), data, q)
      .then((data: IDocument<TIReadResource>) => OneReadDocument.wrap(data, this.modelFactory));
  }

  /** Delete a resource via its reference.
   *
   * @param resource the reference to the resource to delete.
   * @return a promise that yields on completion.
   */
  public delete(resource: IReference<TType>): Promise<void> {
    return this.api.delete(join(this.url, resource.id));
  }
}

/** A resource endpoint that can create, retrieve, and update in place.
 *
 * Add write-in-place operations via the Overwrite interface.
 *
 * @template TType the resource type.
 * @template TNIReadResource the read resource interface.
 * @template TNIWriteResource the write resource interface.
 * @template TModel the wrapping model class.
 * @template TModelFactory a factory type that wraps the provided model type.
 */
export abstract class ResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TICreateResource extends AnyIResource<TType>,
  TIUpdateResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  TChildren extends IChildren,
> extends ReadWriteResourceEndpoint<
  TType,
  TIReadResource,
  TICreateResource,
  TIUpdateResource,
  TModel,
  TModelFactory,
  TChildren
> {
  protected reread(
    document: IDocument<TIReadResource>,
    resource: TModel & IReread<TType, TIReadResource>,
    documentCallback?: OneDocumentCallback<TModel>,
  ): TModel {
    resource.reread(document.data!);
    if (documentCallback !== undefined) {
      const wrapped = OneReadDocument.wrapWithoutData<TType, TIReadResource, TModel>(document);
      documentCallback(wrapped, resource);
    }
    return resource;
  }

  /** Create a new resource given a local model.
   *
   * @param resource the model to send to be created.
   * @param q additional query parameters.
   * @return a promise for the same model once it reflects the remote changes.
   */
  public createInPlace(
    resource: TModel & IReread<TType, TIReadResource> & ICreate<TType, TICreateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<TModel> {
    return this.api
      .create<TType, TIReadResource, TICreateResource>(this.url, resource.create(), q)
      .then((data: IDocument<TIReadResource>) => {
        resource.id = data.data!.id;
        resource.reread(data.data!);
        return resource;
      });
  }

  /** Update a resource based on a local model.
   *
   * @param resource the model to send to be updated.
   * @param q additional query parameters.
   * @param documentCallback an additional callback to handle any other aspects of the document.
   * @return a promise for the same model once it reflects the remote changes.
   */
  public retrieveInPlace(
    resource: TModel & IReread<TType, TIReadResource>,
    q: PartialResourceQuery<TType> = query(),
    documentCallback?: (document: OneReadDocument<TModel>, resource: TModel) => void,
  ): Promise<TModel> {
    return this.api
      .retrieve<TType, TIReadResource>(join(this.url, resource.id), this.modelFactory.type, q)
      .then((document: IDocument<TIReadResource>) => this.reread(document, resource, documentCallback));
  }

  /** Update a resource based on a local model.
   *
   * @param resource the model to send to be created.
   * @param q additional query parameters.
   * @param documentCallback an additional callback to handle any other aspects of the document.
   * @return a promise for the same model once it reflects the remote changes.
   */
  public updateInPlace(
    resource: TModel & IReread<TType, TIReadResource> & IUpdate<TType, TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
    documentCallback?: (document: OneReadDocument<TModel>, resource: TModel) => void,
  ): Promise<TModel> {
    return this.updateInPlaceFromData(resource, resource.update(), q, documentCallback);
  }

  public updateInPlaceFromData(
    resource: TModel & IReread<TType, TIReadResource>,
    data: PartialIResource<TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
    documentCallback?: (document: OneReadDocument<TModel>, resource: TModel) => void,
  ): Promise<TModel> {
    return this.api
      .update<TType, TIReadResource, PartialIResource<TIUpdateResource>>(join(this.url, resource.id), data, q)
      .then((document: IDocument<TIReadResource>) => this.reread(document, resource, documentCallback));
  }
}

/** A resource endpoint that can list and retrieve.
 *
 * Add write operations.
 *
 * @template TType the resource type.
 * @template TNIReadResource the read resource interface.
 * @template TNICreateResource the create resource interface.
 * @template TNIUpdateResource the update resource interface.
 * @template TModel the wrapping model class.
 * @template TModelFactory a factory type that wraps the provided model type.
 */
export abstract class ReadWriteSingletonResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TICreateResource extends AnyIResource<TType>,
  TIUpdateResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  TChildren extends IChildren,
> extends Endpoint<TChildren> {
  protected abstract modelFactory: TModelFactory;

  public for(): TChildren {
    const url = this.url;
    return new Proxy<TChildren>(this.children!, {
      get(target: TChildren, name: string) {
        return Reflect.get(target, name).copy(url);
      },
    });
  }

  /** Create a new resource given a local model.
   *
   * @param resource the model to send to be created.
   * @param q additional query parameters.
   * @return a promise for a one document with the created resource.
   */
  public create(
    resource: Resource<TType> & ICreate<TType, TICreateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.createFromData(resource.create(), q);
  }

  /** Create a new resource given a local model.
   *
   * @param data the data to create the resource with.
   * @param q additional query parameters.
   * @return a promise for a one document with the created resource.
   */
  public createFromData(
    data: TICreateResource,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.api
      .create<TType, TIReadResource, TICreateResource>(this.url, data, q)
      .then((data: IDocument<TIReadResource>) => OneReadDocument.wrap(data, this.modelFactory));
  }

  /** Update a resource based on a local model.
   *
   * @param resource the model to send to be updated.
   * @param q additional query parameters.
   * @return a promise for a one document with the updated resource.
   */
  public update(
    resource: Resource<TType> & IUpdate<TType, TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.updateFromData(resource.update(), q);
  }

  /** Update a resource based on write dataa.
   *
   * @param data the data to update the resource with.
   * @param q additional query parameters.
   * @return a promise for a one document with the updated resource.
   */
  public updateFromData(
    data: PartialIResource<TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<OneReadDocument<TModel>> {
    return this.api
      .update<TType, TIReadResource, PartialIResource<TIUpdateResource>>(this.url, data, q)
      .then((data: IDocument<TIReadResource>) => OneReadDocument.wrap(data, this.modelFactory));
  }

  /** Delete a resource via its reference.
   *
   * @return a promise that yields on completion.
   */
  public delete(): Promise<void> {
    return this.api.delete(this.url);
  }
}

/** A resource endpoint that can create, retrieve, and update in place.
 *
 * Add write-in-place operations via the Overwrite interface.
 *
 * @template TType the resource type.
 * @template TNIReadResource the read resource interface.
 * @template TNIWriteResource the write resource interface.
 * @template TModel the wrapping model class.
 * @template TModelFactory a factory type that wraps the provided model type.
 */
export abstract class SingletonResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TICreateResource extends AnyIResource<TType>,
  TIUpdateResource extends AnyIResource<TType>,
  TModel extends Model<TType>,
  TModelFactory extends IModelFactory<TType, TIReadResource, TModel>,
  TChildren extends IChildren,
> extends ReadWriteSingletonResourceEndpoint<
  TType,
  TIReadResource,
  TICreateResource,
  TIUpdateResource,
  TModel,
  TModelFactory,
  TChildren
> {
  protected reread(
    document: IDocument<TIReadResource>,
    resource: TModel & IReread<TType, TIReadResource>,
    documentCallback?: OneDocumentCallback<TModel>,
  ): TModel {
    resource.reread(document.data!);
    if (documentCallback !== undefined) {
      const wrapped = OneReadDocument.wrapWithoutData<TType, TIReadResource, TModel>(document);
      documentCallback(wrapped, resource);
    }
    return resource;
  }

  /** Create a new resource given a local model.
   *
   * @param resource the model to send to be created.
   * @param q additional query parameters.
   * @return a promise for the same model once it reflects the remote changes.
   */
  public createInPlace(
    resource: TModel & IReread<TType, TIReadResource> & ICreate<TType, TICreateResource>,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<TModel> {
    return this.api
      .create<TType, TIReadResource, TICreateResource>(this.url, resource.create(), q)
      .then((data: IDocument<TIReadResource>) => {
        resource.id = data.data!.id;
        resource.reread(data.data!);
        return resource;
      });
  }

  /** Update a resource based on a local model.
   *
   * @param resource the model to send to be updated.
   * @param q additional query parameters.
   * @param documentCallback an additional callback to handle any other aspects of the document.
   * @return a promise for the same model once it reflects the remote changes.
   */
  public retrieveInPlace(
    resource: TModel & IReread<TType, TIReadResource>,
    q: PartialResourceQuery<TType> = query(),
    documentCallback?: (document: OneReadDocument<TModel>, resource: TModel) => void,
  ): Promise<TModel> {
    return this.api
      .retrieve<TType, TIReadResource>(this.url, this.modelFactory.type, q)
      .then((document: IDocument<TIReadResource>) => this.reread(document, resource, documentCallback));
  }

  /** Update a resource based on a local model.
   *
   * @param resource the model to send to be created.
   * @param q additional query parameters.
   * @param documentCallback an additional callback to handle any other aspects of the document.
   * @return a promise for the same model once it reflects the remote changes.
   */
  public updateInPlace(
    resource: TModel & IReread<TType, TIReadResource> & IUpdate<TType, TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
    documentCallback?: (document: OneReadDocument<TModel>, resource: TModel) => void,
  ): Promise<TModel> {
    return this.updateInPlaceFromData(resource, resource.update(), q, documentCallback);
  }

  public updateInPlaceFromData(
    resource: TModel & IReread<TType, TIReadResource>,
    data: PartialIResource<TIUpdateResource>,
    q: PartialResourceQuery<TType> = query(),
    documentCallback?: (document: OneReadDocument<TModel>, resource: TModel) => void,
  ): Promise<TModel> {
    return this.api
      .update<TType, TIReadResource, PartialIResource<TIUpdateResource>>(this.url, data, q)
      .then((document: IDocument<TIReadResource>) => this.reread(document, resource, documentCallback));
  }
}
