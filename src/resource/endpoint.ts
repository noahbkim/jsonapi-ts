import {Many} from '../core/algebra';
import {ManyDocument, OneDocument} from '../core/document';
import {Reference} from '../core/reference';
import {AnyResource, IFromResource} from '../core/resource';
import {JsonApi} from '../framework/api';
import {JsonApiEndpoint} from '../framework/endpoint';
import {IncrementalPromise} from '../library/promise';
import {Id, IReferenceTo} from '../schema';
import {pagination, PartialResourcePagination} from './pagination';
import {PartialResourceQuery, query} from './query';

/** Generic resource access wrapper.
 *
 * The resource endpoint serves as a usable baseclass for wrapping the
 * functionality of a resource API endpoint. It provides resource-
 * specific getters as well as a loader for any extra work involved
 * in producing a model.
 *
 * @template TIResource the resource interface this class handles.
 */
export class ResourceEndpoint<
  TResource extends AnyResource,
  TIResource extends IFromResource<TResource> = IFromResource<TResource>
> extends JsonApiEndpoint {
  public readonly type: string;

  /** Construct a new resource endpoint.
   *
   * The resource endpoint requires the root API to make requests. The
   * url of the endpoint as well as the JSON API resource name are
   * required for making requests.
   *
   * @param api the root API.
   * @param url the URL of the resource endpoint.
   * @param type the resource type name.
   */
  public constructor(api: JsonApi, url: string, type: string) {
    super(api, url);
    this.type = type;
  }

  public get(
    q: PartialResourceQuery<TResource, TIResource>,
    p: PartialResourcePagination,
  ): Promise<ManyDocument<TResource, TIResource>>;
  public get<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(
    q?: PartialResourceQuery<LTResource, LTIResource>,
    p?: PartialResourcePagination,
  ): Promise<ManyDocument<LTResource, LTIResource>>;

  /** Get a single page of resources.
   *
   * @param q an optional query to filter searchResults.
   * @param p a pagination marker.
   */
  public get<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(
    q: PartialResourceQuery<LTResource, LTIResource> = query(),
    p: PartialResourcePagination = pagination(),
  ): Promise<ManyDocument<LTResource, LTIResource>> {
    return this.api.resources.get<LTResource, Many, LTIResource>(this.url, q.typed(this.type), p);
  }

  public getAll(q?: PartialResourceQuery<TResource, TIResource>): Promise<ManyDocument<TResource, TIResource>>;
  public getAll<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(q?: PartialResourceQuery<LTResource, LTIResource>): Promise<ManyDocument<LTResource, LTIResource>>;

  /** Get all resource of the given type from the endpoint.
   *
   * @param q an optional query to filter searchResults.
   */
  public getAll<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(q: PartialResourceQuery<LTResource, LTIResource> = query()): Promise<ManyDocument<LTResource, LTIResource>> {
    return this.api.resources.getAll<LTResource, LTIResource>(this.url, q.typed(this.type));
  }

  // public getAllIncremental(
  //   q: PartialResourceQuery<TResource, TIResource>,
  // ): IncrementalPromise<ManyDocument<TResource, TIResource>, void>
  public getAllIncremental<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(q?: PartialResourceQuery<LTResource, LTIResource>): IncrementalPromise<ManyDocument<LTResource, LTIResource>, void>;

  /** Get all resources of a type incrementally from the endpoint.
   *
   * @param q an optional query to filter searchResults.
   */
  public getAllIncremental<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(
    q: PartialResourceQuery<LTResource, LTIResource> = query(),
  ): IncrementalPromise<ManyDocument<LTResource, LTIResource>, void> {
    return this.api.resources.getAllIncremental<LTResource, LTIResource>(this.url, q.typed(this.type));
  }

  public getOne(
    id: Reference<TResource> | IReferenceTo<TIResource> | Id,
    q?: PartialResourceQuery<TResource, TIResource>,
  ): Promise<OneDocument<TResource, TIResource>>;
  public getOne<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(
    id: Reference<LTResource> | IReferenceTo<LTIResource> | Id,
    q?: PartialResourceQuery<LTResource, LTIResource>,
  ): Promise<OneDocument<LTResource, LTIResource>>;

  /** Get a single resource. */
  public getOne<
    LTResource extends AnyResource = TResource,
    LTIResource extends IFromResource<LTResource> = IFromResource<LTResource>
  >(
    id: Reference<LTResource> | IReferenceTo<LTIResource> | Id,
    q: PartialResourceQuery<LTResource, LTIResource> = new PartialResourceQuery(),
  ): Promise<OneDocument<LTResource, LTIResource>> {
    let actualId: Id;
    if (id.hasOwnProperty('id')) {
      actualId = (id as Reference<TResource> | IReferenceTo<TIResource>).id;
    } else {
      actualId = id as Id;
    }
    return this.api.resources.getOne<LTResource, LTIResource>(this.url, actualId, q.typed(this.type));
  }

  public create(resource: TResource): Promise<OneDocument<TResource, TIResource>> {
    return this.api.resources.create(this.url, resource);
  }

  public update(resource: TResource): Promise<OneDocument<TResource, TIResource>> {
    return this.api.resources.update(this.url, resource);
  }

  public delete(resource: IReferenceTo<TIResource>): Promise<void> {
    return this.api.resources.delete(this.url, resource);
  }
}
