import {AnyIResource, AnyIResourceOfType, IReferenceTo} from '../schema';
import {Reference} from './reference';

export type ResourceConstructor<TResource extends AnyResource> = new (resource: IFromResource<TResource>) => TResource;

/** A wrapper class for raw JSON API resources.
 *
 * This container offers two important functions. First, it provides a more
 * concise way to manipulate resources. Secondly, it allows the developer to
 * register resource-specific subclasses that will be instantiated in place of
 * the base class when a resource is received from the server.
 *
 * Subclasses of the resource class may implement any methods or properties,
 * and this is encouraged to improve the ergonomics of working with more
 * complex data.
 */
export abstract class Resource<TIResource extends AnyIResource> {
  /** Registered resource subclasses. */
  private static registered: Map<string, ResourceConstructor<any>> = new Map();

  public id: string;
  public readonly type: TIResource['type'];

  protected constructor(resource: TIResource | IReferenceTo<TIResource>) {
    this.id = resource.id;
    this.type = resource.type;
  }

  /** Register a new resource subclass for a JSON API resource type.
   *
   * It's generally advised the binding of resource types is not done on the
   * fly but rather in close proximity to the definition of the resource type.
   * As such, this method as provided as a decorator.
   *
   * Note that types are weak as fuck on this method because we can't do
   * inference on returned method types.
   *
   * @param type the string resource identifier.
   */
  public static register(type: string): (constructor: any) => any {
    return (constructor: any) => {
      Resource.registered.set(type, constructor);
      return constructor;
    };
  }

  /** Construct a resource from raw data without knowing the type.
   *
   * This method looks at the internal registry of resource subclasses to
   * determine what object to new. If the type is not found, a default resource
   * is returned.
   *
   * @param resource the resource data to wrap.
   * @return a resource or resource subclass object.
   */
  public static wrap<
    TResource extends AnyResource,
    TIResource extends IFromResource<TResource> = IFromResource<TResource>
  >(resource: TIResource): TResource {
    const constructor = Resource.registered.get(resource.type)!;
    return new constructor(resource) as TResource;
  }

  /** Construct resources from a list of raw resources with inconsistent type.
   *
   * Shorthand for mapping the array with the arbitrary single-resource loader
   * defined above.
   *
   * @param resources an array of arbitrarily-typed resources to load.
   * @return an array of resource or resource subclass objects.
   */
  public static wrapAll(resources: Array<AnyIResource>): Array<AnyResource> {
    return resources.map((resource: AnyIResource) => {
      const constructor = Resource.registered.get(resource.type)!;
      return new constructor(resource);
    });
  }

  /** Construct resources from a list of homogeneous raw resources.
   *
   * This method is identical to fromAll with a slight optimization based on
   * the assumption that all resources in the array have the same type.
   *
   * @param resources an array of same-typed resources to load.
   * @return an array of resource or resource subclass objects.
   */
  public static wrapAllOfType<TIResource extends AnyIResource>(
    resources: Array<TIResource>,
  ): Array<Resource<TIResource>> {
    if (resources.length === 0) {
      return [];
    } else {
      if (!Resource.registered.has(resources[0].type)) {
        console.error(`No registered type ${resources[0].type}!`);
        return [];
      } else {
        const type = Resource.registered.get(resources[0].type)!;
        return resources.map((resource: TIResource) => new type(resource));
      }
    }
  }

  public reference(): Reference<this> {
    return new Reference<this>(this.id, this.type, this);
  }

  public abstract unwrap(): TIResource;
}

export type AnyResourceOfType<TType extends string> = Resource<AnyIResourceOfType<TType>>;
export type AnyResource = Resource<AnyIResource>;
export type IFromResource<
  TResource extends AnyResource,
  TIResource extends TResource extends Resource<infer I> ? I : never = TResource extends Resource<infer I> ? I : never
> = TIResource;
