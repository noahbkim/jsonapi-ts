import {ParameterWrapper} from '../library/parameters';
import {AnyModel} from '../../model';

/** Parameter wrapper of resource query fields without type
 *
 * This parameter wrapper provides convenience methods for setting GET
 * parameters on a resource request. It does not contain a type.
 */
export class PartialResourceQuery<TModel extends AnyModel> extends ParameterWrapper {
  /** Construct a partial resource query.
   *
   * @param parameters an existing map of parameters to start with.
   */
  public constructor(parameters?: Map<string, string>) {
    super(parameters);
  }

  /** Provide common format for filter fields.
   *
   * Used in multiple places and is server-specific.
   *
   * @param field the name of the field to filter.
   */
  public static formatFilterField(field: string): string {
    return `filter[${field}]`;
  }

  /** Add a list of fields to sort by.
   *
   * Overwrites any previous sorting fields; does not stack.
   *
   * @param fields to sort the response by, to be comma-delimited.
   * @return this
   */
  public sort(...fields: Array<string>): this {
    this.set('sort', fields.join(','));
    return this;
  }

  /** Set a searchTerm term.
   *
   * Overwrites an existing searchTerm term.
   *
   * @param value the value to searchTerm for, server-specific.
   * @return this
   */
  public search(value: string): this {
    this.set('search', value);
    return this;
  }

  /** Set a resource view.
   *
   * This allows extra information to be added to the query result with low overhead.
   *
   * @param name the view name.
   * @return this
   */
  public view(name: string): this {
    this.set('view', name);
    return this;
  }

  /** Filter the searchResults by a field and value or set of values.
   *
   * Overwrites any existing filter for the same field.
   *
   * @param field the field on the resource to filter by.
   * @param value a value or set of values to expect from the field.
   * @return this
   */
  public filter(field: string, value: string | number | Array<string> | Array<number>): this {
    if (Array.isArray(value)) {
      value = value.join(',');
    }
    this.set(PartialResourceQuery.formatFilterField(field), value.toString());
    return this;
  }

  /** Request inclusion of a related field.
   *
   * @param fields the field names to include in the response.
   */
  public include(...fields: Array<string>): this {
    this.set('include', fields.join(','));
    return this;
  }

  /** Specify a type and get a concrete resource query.
   *
   * @param type the type of resource to get.
   * @return a complete resource query.
   */
  public typed(type: string): ResourceQuery<TModel> {
    return new ResourceQuery<TModel>(type, this.parameters);
  }
}

/** A complete resource query.
 *
 * Contains both a type and parameters to searchTerm, sort, filter, etc.
 * by on the server side.
 */
export class ResourceQuery<TModel extends AnyModel> extends PartialResourceQuery<TModel> {
  public readonly type: string;

  /** Initialize a new resource query with a concrete type.
   *
   * @param type the JSON API resource type.
   * @param parameters an optional list of parameters to start with.
   */
  public constructor(type: string, parameters?: Map<string, string>) {
    super(parameters);
    this.type = type;
  }

  /** Specify a type and get a concrete resource query.
   *
   * @param type the type of resource to get.
   * @return a complete resource query.
   */
  public typed(type: string): this {
    if (type !== this.type) {
      console.error(`Tried to set resource of type ${this.type} to ${type}`);
    }
    return this;
  }
}

export function query<TModel extends AnyModel>(): PartialResourceQuery<TModel>;
export function query<TModel extends AnyModel>(type: string): ResourceQuery<TModel>;

/** Shorthand for creating a new resource query.
 *
 * If the type is provided, a complete resource query will be returned.
 * Otherwise, a partial will be returned.
 *
 * @param type the JSON API resource type.
 * @return either a partial or full resource query based on type.
 */
export function query<TModel extends AnyModel>(type?: string): PartialResourceQuery<TModel> | ResourceQuery<TModel> {
  if (type !== undefined) {
    return new ResourceQuery(type);
  } else {
    return new PartialResourceQuery();
  }
}
