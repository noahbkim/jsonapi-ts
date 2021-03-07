import {Document} from '../framework';
import {AnyResource, Resource, Reference} from '../resource';
import {IResource} from '../schema';

/** A container for accessing resources by type and ID.
 *
 * Essentially a wrapper around a double map. Provides convenient put and get
 * operations with ergonomic model templating.
 */
export class ResourceMap {
  private caches: Map<string, Map<string, AnyResource>> = new Map();

  public static fromDocument(document: Document): ResourceMap {
    return new ResourceMap().putDocument(document);
  }

  /** Put a resource of any type in the cache.
   *
   * @param resource a resource or resource subclass.
   */
  public put(resource: AnyResource): this {
    this.getOrCreateCache(resource.type).set(resource.id, resource);
    return this;
  }

  /** Insert a collection of variably-typed resources in the store.
   *
   * For a list of resources of the same type, putAllOfType is more efficient
   * and should be used instead.
   *
   * @param resources a list of resources.
   */
  public putAll(resources: Array<AnyResource> | undefined): this {
    if (resources !== undefined) {
      for (const resource of resources) {
        this.put(resource);
      }
    }
    return this;
  }

  /** Insert a list of resources of the same type in the store.
   *
   * @param resources a list of homogeneously-typed resources.
   */
  public putAllOfType<TResource extends AnyResource>(resources: Array<TResource>): this {
    if (resources.length > 0) {
      const cache = this.getOrCreateCache(resources[0].type);
      for (const resource of resources) {
        cache.set(resource.id, resource);
      }
    }
    return this;
  }

  /** Put a document in the store, linking resource data. */
  public putDocument<TResource extends AnyResource>(document: Document): this {
    this.putAll(document.resources());
    return this;
  }

  /** Get a resource from the store.
   *
   * @template TIResource the type of resource to cast back.
   * @param reference a JSON API reference to the desired resource.
   * @return the resource if contained, otherwise undefined
   */
  public get<TResource extends AnyResource>(reference: Reference<TResource>): TResource | undefined {
    const cache = this.caches.get(reference.type);
    if (cache === undefined) {
      return undefined;
    }
    return cache.get(reference.id) as TResource;
  }

  /** Get all stored elements of a given type.
   *
   * @template TResource the resource signature
   * @param type the string resource type.
   * @return a new array containing all stored items of the type.
   */
  public getAllOfType<TResource extends AnyResource>(type: string): Array<TResource> {
    const cache = this.caches.get(type);
    if (cache === undefined) {
      return [];
    } else {
      return Array.from(cache.values()) as Array<TResource>;
    }
  }

  /** Internal shorthand for lazily getting or creating a cache.
   *
   * @param type the string resource type.
   * @return a cache, either existing or newly created, for resources.
   */
  private getOrCreateCache(type: string): Map<string, AnyResource> {
    const existing = this.caches.get(type);
    if (existing) {
      return existing;
    } else {
      const cache = new Map<string, AnyResource>();
      this.caches.set(type, cache);
      return cache;
    }
  }
}
