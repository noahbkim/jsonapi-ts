import {Cardinality, One} from '../algebra';
import {Reference, AnyResource} from '../resource';

export type OneRelationship<TResource extends AnyResource> = Reference<TResource>;
export type OneOptionalRelationship<TResource extends AnyResource> = Reference<TResource> | null;
export type ManyRelationship<TResource extends AnyResource> = Array<Reference<TResource>>;

export type Relationship<TResource extends AnyResource, TCardinality extends Cardinality> = TCardinality extends One
  ? OneRelationship<TResource>
  : ManyRelationship<TResource>;
