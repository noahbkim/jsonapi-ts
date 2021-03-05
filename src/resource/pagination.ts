import {IPagination} from '../schema';
import {ParameterWrapper} from './parameters';

/** A partial pagination object, good for initial queries.
 *
 * A partial pagination can be used to pick a certain offset of a requested
 * JSON API page without knowing the full details of the number of resources
 * or pagination schema.
 */
export class PartialResourcePagination extends ParameterWrapper {
  public readonly offset: number;
  public readonly limit?: number;

  /** Create a new partial resource pagination.
   *
   * @param offset the index of the first resource requested.
   * @param limit the maximum number of resources to retrieve.
   */
  public constructor(offset: number, limit?: number) {
    super();
    this.offset = offset;
    this.limit = limit;
    this.page('offset', this.offset);
    if (this.limit) {
      this.page('limit', this.limit);
    }
  }

  /** Format a field of the pagination for URL encoding.
   *
   * @param field the name of the field.
   * @return the formatted GET field name.
   */
  public static formatPageField(field: string): string {
    return `page[${field}]`;
  }

  /** Set an internal field on the pagination.
   *
   * @param field the name of the field.
   * @param value the value to set it to.
   * @return self
   */
  public page(field: string, value: string | number): this {
    this.set(PartialResourcePagination.formatPageField(field), value.toString());
    return this;
  }
}

/** A full resource pagination marker.
 *
 * Requires a limit and count of total resources available. Returned from
 * actual resource request and response.
 */
export class ResourcePagination extends PartialResourcePagination {
  public readonly limit: number;
  public readonly count: number;

  /** Create a new resource pagination.
   *
   * @param offset the index of the first resource requested.
   * @param limit the maximum number of resources to retrieve.
   * @param count the total number of resources available.
   */
  public constructor(offset: number, limit: number, count: number) {
    super(offset);
    this.limit = limit;
    this.count = count;
  }

  /** Load a pagination object from JSON API metadata.
   *
   * @param meta the meta object of the response.
   */
  public static fromMeta(meta: any): ResourcePagination | undefined {
    if (typeof meta !== 'object' || !meta.hasOwnProperty('pagination') || typeof meta['pagination'] !== 'object') {
      return undefined;
    }
    const p = meta['pagination'] as IPagination;
    return new ResourcePagination(p.offset, p.limit, p.count);
  }

  /** Get the next pagination from the current.
   *
   * Returns a partial pagination with the current offset plus the count of
   * resources returned. If the offset reaches the end, return undefined.
   *
   * @param by the amount to increment the offset by.
   * @param limit override the limit of the current pagination.
   */
  public advance(by: number, limit?: number): PartialResourcePagination | undefined {
    if (this.offset + by === this.count) {
      return undefined;
    } else {
      return new ResourcePagination(this.offset + by, limit || this.limit, this.count);
    }
  }
}

/** Create a new partial pagination.
 *
 * Only the API should be creating complete pagination objects, so we won't
 * bother creating a convenient constructor.
 *
 * @param offset the offset of the first resource requested.
 * @param limit the maximum number of resources to receive.
 */
export function pagination(offset = 0, limit?: number): PartialResourcePagination {
  return new PartialResourcePagination(offset, limit);
}

/** List all pages given an initial.
 *
 * Segments the total number of resources into a list of partial paginations
 * for parallel requests.
 *
 * @param p the initial page requested.
 * @param retrieved how many have been retrieved.
 */
export function pages(p: ResourcePagination, retrieved = 0): Array<PartialResourcePagination> {
  const ps = [];
  for (let i = 0; i < Math.ceil((p.count - retrieved) / p.limit); i++) {
    ps.push(pagination(p.offset + retrieved + i * p.limit));
  }
  return ps;
}
