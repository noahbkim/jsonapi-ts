import {ResourcePagination} from '../resource';
import {AnyIResource, IDocument, IError, IJsonApi, IMeta, IRequiredLinks} from '../schema';
import {Cardinality, Exactly, Many, One} from './algebra';
import {AnyResource, IFromResource, Resource} from './resource';

/** A wrapper around the JSON API document object.
 *
 * The document class is primarily intended to offer interoperability between
 * wrapped resources and documents. Since documents are top-level schema for
 * requests and responses, we want a way to manipulate wrapped resources while
 * still only communicating the underlying JSON API data.
 *
 * @template TIResource the raw resource type.
 * @template TResource the wrapped resource type.
 * @template TCardinality whether there are one or many items in the document.
 */
export class Document<
  TResource extends AnyResource,
  TCardinality extends Cardinality,
  TIResource extends AnyIResource = IFromResource<TResource>
> {
  public data?: Exactly<TCardinality, TResource>;
  public included?: Array<AnyResource>;
  private readonly document: IDocument<Exactly<TCardinality, TIResource>>;

  /** Construct a new document from a raw document.
   *
   * This method automatically starts managing the data and included resources
   * in the source document.
   *
   * @param document the raw document to wrap.
   */
  public constructor(document?: IDocument<Exactly<TCardinality, TIResource>>) {
    if (document) {
      this.document = document;
      if (document.data !== undefined) {
        if (Array.isArray(document.data)) {
          this.data = Resource.wrapAll(document.data as Array<TIResource>) as Exactly<TCardinality, TResource>;
        } else {
          this.data = Resource.wrap(document.data as TIResource) as Exactly<TCardinality, TResource>;
        }
      }
      if (document.included !== undefined) {
        this.included = Resource.wrapAll(document.included);
      }
    } else {
      this.document = {};
    }
  }

  /** Instantiate a new document from data.
   *
   * @template TIResource the raw resource type.
   * @template TResource the wrapped resource type.
   * @template TCardinality whether there are one or many items in the document.
   * @return a new document with the given data.
   */
  public static fromData<
    TIResource extends AnyIResource,
    TResource extends Resource<TIResource>,
    TCardinality extends Cardinality
  >(data: Exactly<TCardinality, TResource>): Document<TResource, TCardinality> {
    const document = new Document<TResource, TCardinality>();
    document.data = data;
    return document;
  }

  /** Instantiate a new document from a raw document.
   *
   * @template TIResource the raw resource type.
   * @template TResource the wrapped resource type.
   * @template TCardinality whether there are one or many items in the document.
   * @return a new document from the given raw document.
   */
  public static wrap<
    TResource extends AnyResource,
    TCardinality extends Cardinality,
    TIResource extends AnyIResource = TResource extends Resource<infer I> ? I : never
  >(data: IDocument<Exactly<TCardinality, TIResource>>): Document<TResource, TCardinality, TIResource> {
    return new Document<TResource, TCardinality, TIResource>(data);
  }

  /** Unwrap the document.
   *
   * If the document contains many resources, map over them and unwrap each
   * resource. Otherwise, simply unwrap the resource. If data is undefined,
   * the data in the resultant unwrapped document will be undefined. Also
   * unwraps all included resources.
   *
   * @return an unwrapped, serializable document.
   */
  public unwrap(): IDocument<Exactly<TCardinality, TIResource>> {
    if (this.data) {
      if (Array.isArray(this.data)) {
        this.document.data = this.data.map((r: Resource<AnyIResource>) => r.unwrap() as TIResource) as Exactly<
          TCardinality,
          TIResource
        >;
      } else {
        this.document.data = (this.data as TResource).unwrap() as Exactly<TCardinality, TIResource>;
      }
    } else {
      this.document.data = undefined;
    }
    this.document.included = this.included && this.included.map((resource: AnyResource) => resource.unwrap());
    return this.document;
  }

  /** Merge data and include from another many document into this.
   *
   * We pretty much selectively care about data and included whenever we're
   * merging, so that's all we'll do.
   *
   * Important: this only works for ManyDocuments.
   *
   * @param other another document to merge data and includes from.
   */
  public merge(other: Document<TResource, TCardinality, TIResource>): this {
    if (other.data !== undefined) {
      if (this.data === undefined) {
        this.data = other.data;
      } else {
        ((this.data as unknown) as Array<TResource>).push(...((other.data as unknown) as Array<TResource>)); // Lmao
      }
    }
    if (other.included !== undefined) {
      if (this.included === undefined) {
        this.included = other.included;
      } else {
        this.included.push(...other.included);
      }
    }
    return this;
  }

  public get errors(): Array<IError> | undefined {
    return this.document.errors;
  }

  public get meta(): IMeta | undefined {
    return this.document.meta;
  }

  public get links(): IRequiredLinks | undefined {
    return this.document.links;
  }

  public get jsonapi(): IJsonApi | undefined {
    return this.document.jsonapi;
  }

  public pagination(): ResourcePagination | undefined {
    return ResourcePagination.fromMeta(this.meta);
  }
}

export type ManyDocument<
  TResource extends AnyResource,
  TIResource extends IFromResource<TResource> = IFromResource<TResource>
> = Document<TResource, Many>;

export type OneDocument<
  TResource extends AnyResource,
  TIResource extends IFromResource<TResource> = IFromResource<TResource>
> = Document<TResource, One>;
