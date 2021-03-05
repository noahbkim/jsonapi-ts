import {AnyResource, Reference} from '..';
import {ResourceMap} from '../resource/map';
import {Cardinality, One} from './algebra';

export type OneRelationship<TResource extends AnyResource> = Reference<TResource>;
export type OneOptionalRelationship<TResource extends AnyResource> = Reference<TResource> | null;
export type ManyRelationship<TResource extends AnyResource> = Array<Reference<TResource>>;

export type Relationship<TResource extends AnyResource, TCardinality extends Cardinality> = TCardinality extends One
  ? OneRelationship<TResource>
  : ManyRelationship<TResource>;

export function isFieldReference<TResource extends AnyResource>(
  resource: TResource,
  resourceField: keyof TResource,
): boolean {
  return resource[resourceField] instanceof Reference;
}

export function isFieldReferenceArray<TResource extends AnyResource>(
  resource: TResource,
  resourceField: keyof TResource,
): boolean {
  if (!Array.isArray(resource[resourceField])) {
    return false;
  }
  const resourceReferences = (resource[resourceField] as unknown) as Array<any>;
  if (resourceReferences.length === 0) {
    return true;
  }
  return resourceReferences.map((value: any) => value instanceof Reference).reduce((a: boolean, b: boolean) => a && b);
}

export function connectOneToOne<TResource extends AnyResource, TRelatedResource extends AnyResource>(
  resource: TResource,
  resourceField: keyof TResource,
  relatedResource: TRelatedResource,
  relatedResourceField: keyof TRelatedResource | null = null,
): void {
  const resourceReference = (resource[resourceField] as unknown) as OneRelationship<TRelatedResource>;
  resourceReference.resource = relatedResource;
  if (relatedResourceField !== null) {
    const relatedResourceReference = (relatedResource[relatedResourceField] as unknown) as OneRelationship<TResource>;
    relatedResourceReference.resource = resource;
  }
}

export function connectOneToMany<TResource extends AnyResource, TRelatedResource extends AnyResource>(
  resource: TResource,
  resourceField: keyof TResource,
  relatedResources: ResourceMap,
  relatedResourceField: keyof TRelatedResource | null = null,
): void {
  const resourceReferences = (resource[resourceField] as unknown) as ManyRelationship<TRelatedResource>;
  for (const resourceReference of resourceReferences) {
    resourceReference.resource = relatedResources.get(resourceReference) as TRelatedResource;
    if (relatedResourceField !== null) {
      const relatedResourceReference = (resourceReference.resource[relatedResourceField] as unknown) as OneRelationship<
        TResource
      >;
      relatedResourceReference.resource = resource;
    }
  }
}
