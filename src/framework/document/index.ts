import {AnyResource, Resource} from '../../resource';
import {Model, AnyModel, IModelFactory, IUpdate, IWriteResourceFromModel, registry} from '../../model';
import {AnyIResource, IDocument, IError, IJsonApi, IMeta, IRequiredLinks, IType} from '../../schema';
import {DocumentPagination} from './pagination';

export * from './pagination';

/** Base document.
 *
 * Documents must either contain data or errors. Data may consist of a single
 * resource or an array of zero or more resources. To address this practically,
 * there are corresponding document subclasses. This abstract class handles
 * the properties shared by both.
 */
export abstract class Document {
  public included?: Array<AnyModel>;
  public errors?: Array<IError>;
  public meta?: IMeta;
  public links?: IRequiredLinks;
  public jsonapi?: IJsonApi;

  /** Aggregate all resources in data and included.
   *
   * Useful for extracting resources from a document into a resource parent,
   * but generally not used in business logic.
   *
   * @return an array of all contained resources.
   */
  public abstract resources(): Array<Resource<IType>>;

  /** Helper function for constructing data-specific documents.
   *
   * @param document the document to bind data to.
   * @param data the raw document data to bind.
   */
  protected static bind<TDocument extends Document>(document: TDocument, data: IDocument<any>): void {
    if (data.included !== undefined) {
      document.included = registry.wrapAll(data.included);
    }
    document.errors = data.errors;
    document.meta = data.meta;
    document.links = data.links;
    document.jsonapi = data.jsonapi;
  }
}

/** Read-only document with a single resource as data. */
export class OneReadDocument<TModel extends AnyModel> extends Document {
  public data?: TModel;

  public constructor(data?: TModel) {
    super();
    this.data = data;
  }

  /** Wrap deserialized document data as a document.
   *
   * @param data the deserialized document to read.
   * @param modelFactory the model factory used for the data field.
   * @return a new document.
   */
  public static wrap<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
    TModelFactory extends IModelFactory<any, any, any>,
  >(data: IDocument<TIReadResource>, modelFactory: TModelFactory): OneReadDocument<TModel> {
    const document = new OneReadDocument<TModel>();
    super.bind(document, data);
    if (data.data !== undefined) {
      document.data = modelFactory.read(data.data);
    }
    return document;
  }

  /** Used for in-place read operations.
   *
   * In circumstances where the model being returned already exists in some
   * capacity on the client side, we don't want to spawn a new instance if
   * we can simply reread the existing one.
   *
   * @param data the deserialized document to read.
   * @return a new document.
   */
  public static wrapWithoutData<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
  >(data: IDocument<TIReadResource>): OneReadDocument<TModel> {
    const document = new OneReadDocument<TModel>();
    super.bind(document, data);
    return document;
  }

  /** Yield all resources in the document.
   *
   * @return an array of all resources.
   */
  public resources(): Array<AnyResource> {
    const result = [];
    if (this.data) {
      result.push(this.data);
    }
    if (this.included) {
      result.push(...this.included);
    }
    return result;
  }
}

/** A one document can only read resources with update.
 *
 * This document provides an update and can be used for modifying resource
 * endpoint functions.
 */
export class OneDocument<TModel extends AnyModel & IUpdate<IType, AnyIResource>> extends OneReadDocument<TModel> {
  public declare included?: Array<AnyModel & IUpdate<IType, AnyIResource>>;

  /** Unwrap the document into a serializable format.
   *
   * @return the raw document data.
   */
  public unwrap(): IDocument<IWriteResourceFromModel<TModel>> {
    return {
      data: this.data?.update() as IWriteResourceFromModel<TModel>,
      included: this.included?.map((model: AnyModel & IUpdate<IType, AnyIResource>) => model.update()),
      errors: this.errors,
      meta: this.meta,
      links: this.links,
      jsonapi: this.jsonapi,
    };
  }
}

/** Document with an array of models as data. */
export class ReadManyDocument<TModel extends AnyModel> extends Document {
  public data?: Array<TModel>;

  public constructor(data?: Array<TModel>) {
    super();
    this.data = data;
  }

  /** Wrap document data and contained models.
   *
   * The provided model factory is used to deserialize the document's resource
   * data into corresponding models.
   *
   * @param data the deserialized raw document data.
   * @param modelFactory a model wrapper for the document data.
   * @return a new many document.
   */
  public static wrap<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
    TIModel extends IModelFactory<TType, TIReadResource, TModel>,
  >(data: IDocument<Array<TIReadResource>>, modelFactory: TIModel): ReadManyDocument<TModel> {
    const document = new ReadManyDocument<TModel>();
    super.bind(document, data);
    document.data = data.data?.map(modelFactory.read);
    return document;
  }

  /** Combine the data and included resources of raw documents.
   *
   * Returns a new document. Does not modify any of the provided data.
   *
   * @param data an array of deserialized document data.
   * @param modelFactory wrapper for models in the document.
   * @return a new many document.
   */
  public static combine<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TModel extends Model<TType>,
    TIModel extends IModelFactory<TType, TIReadResource, TModel>,
  >(data: Array<IDocument<Array<TIReadResource>>>, modelFactory: TIModel): ReadManyDocument<TModel> {
    const document = new ReadManyDocument<TModel>();
    const combined = data.shift()!;
    for (const other of data) {
      combined.data!.push(...other.data!);
      combined.included?.push(...(other.included ?? []));
    }

    super.bind(document, combined);
    document.data = combined.data!.map(modelFactory.read);
    return document;
  }

  /** Aggregate resources from the document.
   *
   * @return an array of data and included resources.
   */
  public resources(): Array<Resource<IType>> {
    const result = [];
    if (this.data) {
      result.push(...this.data);
    }
    if (this.included) {
      result.push(...this.included);
    }
    return result;
  }

  /** Generate a pagination from the meta of the document.
   *
   * @return a new document pagination object or undefined.
   */
  public pagination(): DocumentPagination | undefined {
    return DocumentPagination.fromMeta(this.meta);
  }
}

/** Many document with update. */
export class ManyDocument<TModel extends AnyModel & IUpdate<IType, AnyIResource>> extends ReadManyDocument<TModel> {
  public declare included?: Array<AnyModel & IUpdate<IType, AnyIResource>>;

  /** Return raw document data and deserialized resource data.
   *
   * @return a many document with an array of resource data.
   */
  public unwrap(): IDocument<Array<IWriteResourceFromModel<TModel>>> {
    return {
      data: this.data?.map((data: TModel) => data.update() as IWriteResourceFromModel<TModel>),
      included: this.included?.map((model: AnyModel & IUpdate<IType, AnyIResource>) => model.update()),
      errors: this.errors,
      meta: this.meta,
      links: this.links,
      jsonapi: this.jsonapi,
    };
  }
}
