import {Id, IReference, IResource} from '../schema';
import {AnyResource} from './resource';

/** A reference to a resource.
 *
 * In general, a reference provides the id and type of a resource.
 * Additionally, in order to more conveniently represent a relationship between
 * resources, a reference may also contain an in-memory reference to the actual
 * instantiated resource on the client side.
 *
 * Note: I've gone back and forth on whether it's necessary to have TIResource
 * in the template signature. So far I don't think it is, as in general
 * references don't really deal with any specifics of the TIResource.
 *
 * @template TResource the resource class this reference points to.
 */
export class Reference<TResource extends AnyResource> implements IReference<TResource['type']> {
  public readonly id: Id;
  public readonly type: TResource['type'];
  public resource: TResource | null = null;

  /** Construct a new resource, optionally with an actual existing resource.
   *
   * @param id the identifier of the referenced resource.
   * @param type the schema type of the referenced resource.
   * @param resource a local wrapped resource.
   */
  public constructor(id: Id, type: TResource['type'], resource: TResource | null = null) {
    this.id = id;
    this.type = type;
    this.resource = resource;
  }

  /** Return a reference to a resource.
   *
   * In general, use Resource.reference() if you already have the resource on
   * hand. That method will automatically include the in-memory reference to
   * the original resource, whereas this only provides ID and type.
   *
   * @param id the ID of the resource.
   * @param type the resource's type.
   * @return a wrapped reference.
   */
  public static to<TResource extends AnyResource>(id: Id, type: TResource['type']): Reference<TResource> {
    return new Reference<TResource>(id, type);
  }

  // Overloads for read
  public static wrap<TResource extends AnyResource>(
    reference: IReference<TResource['type']>,
    resource?: TResource,
  ): Reference<TResource>;
  public static wrap<TResource extends AnyResource>(reference: undefined, resource?: TResource): undefined;
  public static wrap<TResource extends AnyResource>(reference: null, resource?: TResource): null;
  public static wrap<TResource extends AnyResource>(
    reference: IReference<TResource['type']> | undefined,
    resource?: TResource,
  ): Reference<TResource> | undefined;
  public static wrap<TResource extends AnyResource>(
    reference: IReference<TResource['type']> | null,
    resource?: TResource,
  ): Reference<TResource> | null;

  /** Wrap a raw reference.
   *
   * @param reference the raw reference.
   * @param resource an optional resource to attach.
   * @return a wrapped reference.
   */
  public static wrap<TResource extends AnyResource>(
    reference: IReference<TResource['type']> | undefined | null,
    resource?: TResource,
  ): Reference<TResource> | undefined | null {
    if (reference === undefined || reference === null) {
      return reference;
    }
    return new Reference(reference.id, reference.type, resource);
  }

  // Overloads for wrapAll
  public static wrapAll<TResource extends AnyResource>(
    references: Array<IReference<TResource['type']>>,
    resources?: Array<TResource>,
  ): Array<Reference<TResource>>;
  public static wrapAll<TResource extends AnyResource>(references: undefined, resources?: Array<TResource>): undefined;
  public static wrapAll<TResource extends AnyResource>(
    references: Array<IReference<TResource['type']>> | undefined,
    resources?: Array<TResource>,
  ): Array<Reference<TResource>> | undefined;

  /** Wrap all references in an array.
   *
   * @param references the array of references.
   * @param resources optional resources to assign pairwise to each reference.
   * @return an array of wrapped references.
   */
  public static wrapAll<TResource extends AnyResource>(
    references: Array<IReference<TResource['type']>> | undefined,
    resources?: Array<TResource>,
  ): Array<Reference<TResource>> | undefined {
    return references?.map((reference: IReference<TResource['type']>, index: number) => {
      return new Reference(reference.id, reference.type, resources && resources[index]);
    });
  }

  /** Unwrap an array of references.
   *
   * @param references the array of wrapped references.
   * @return a serializable array of references.
   */
  public static unwrapAll<TResource extends AnyResource>(
    references: Array<Reference<TResource>>,
  ): Array<IReference<TResource['type']>> {
    return references.map((reference: Reference<TResource>) => reference.unwrap());
  }

  /** Unwrap a single resource.
   *
   * @return a serializable raw resource reference.
   */
  public unwrap(): IReference<TResource['type']> {
    return {id: this.id, type: this.type};
  }

  public conflate(): IResource<TResource['type']> {
    return {id: this.id, type: this.type, attributes: undefined, relationships: undefined};
  }
}
