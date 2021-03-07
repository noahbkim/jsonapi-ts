import {DocumentPagination} from './pagination';
import {AnyIResource, IDocument, IError, IJsonApi, IMeta, IRequiredLinks, IType} from '../../schema';
import {Model, AnyModel, IWriteResourceFromModel, IModel, IReadResourceFromModel} from '../../model';
import {Resource} from "@/jsonapi";

export * from './pagination';

/** A wrapper around the JSON API document object.
 *
 * The document class is primarily intended to offer interoperability between
 * wrapped resources and documents. Since documents are top-level schema for
 * requests and responses, we want a way to manipulate wrapped resources while
 * still only communicating the underlying JSON API data.
 *
 * @template TModel the wrapped resource type.
 * @template TCardinality whether there are one or many items in the document.
 */
export abstract class Document {
  public included?: Array<AnyModel>;
  public errors?: Array<IError>;
  public meta?: IMeta;
  public links?: IRequiredLinks;
  public jsonapi?: IJsonApi;

  public abstract resources(): Array<Resource<IType>>;

  protected static bind<TDocument extends Document>(document: TDocument, data: IDocument<any>) {
    if (data.included !== undefined) {
      document.included = Model.registry.wrapAll(data.included);
    }
    document.errors = data.errors;
    document.meta = data.meta;
    document.links = data.links;
    document.jsonapi = data.jsonapi;
  }

  protected unwrap(): IDocument<any> {
    let included: Array<AnyIResource> | undefined = undefined;
    if (this.included !== undefined) {
      included = this.included.map((model: AnyModel) => model.unwrap());
    }
    return {
      data: undefined,
      included,
      errors: this.errors,
      meta: this.meta,
      links: this.links,
      jsonapi: this.jsonapi
    }
  }
}

export class OneDocument<TModel extends AnyModel> extends Document {
  data?: TModel;

  public constructor(data?: TModel) {
    super();
    this.data = data;
  }

  public static wrap<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    data: IDocument<IReadResourceFromModel<TModel>>,
    model: TIModel,
  ): OneDocument<TModel> {
    const document = new OneDocument<TModel>();
    super.bind(document, data);
    if (data.data !== undefined) {
      document.data = model.wrap(data.data);
    }
    return document;
  }

  public unwrap(): IDocument<IWriteResourceFromModel<TModel>> {
    return {
      ...super.unwrap(),
      data: this.data?.unwrap() as IWriteResourceFromModel<TModel>,
    }
  }

  public resources(): Array<Resource<IType>> {
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

export class ManyDocument<TModel extends AnyModel> extends Document {
  data?: Array<TModel>;

  public constructor(data?: Array<TModel>) {
    super();
    this.data = data;
  }

  public static wrap<TModel extends AnyModel, TIModel extends IModel<TModel>>(
    data: IDocument<Array<IReadResourceFromModel<TModel>>>,
    model: TIModel,
  ): ManyDocument<TModel> {
    const document = new ManyDocument<TModel>();
    super.bind(document, data);
    document.data = data.data?.map(model.wrap);
    return document;
  }

  public unwrap(): IDocument<Array<IWriteResourceFromModel<TModel>>> {
    return {
      ...super.unwrap(),
      data: this.data?.map((data: TModel) => data.unwrap() as IWriteResourceFromModel<TModel>),
    }
  }

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

  /** Merge data and include from another many document into this.
   *
   * We pretty much selectively care about data and included whenever we're
   * merging, so that's all we'll do.
   *
   * Important: this only works for ManyDocuments.
   *
   * @param other another document to merge data and includes from.
   */
  public merge(other: ManyDocument<TModel>): this {
    if (other.data !== undefined) {
      if (this.data === undefined) {
        this.data = other.data;
      } else {
        (this.data as Array<TModel>).push(...(other.data as Array<TModel>));
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

  public pagination(): DocumentPagination | undefined {
    return DocumentPagination.fromMeta(this.meta);
  }
}
