import {Reference, AnyResource} from '../resource';

export type OneRelationship<TResource extends AnyResource> = Reference<TResource>;
export type OneOptionalRelationship<TResource extends AnyResource> = Reference<TResource> | null;
export type ManyRelationship<TResource extends AnyResource> = Array<Reference<TResource>>;
