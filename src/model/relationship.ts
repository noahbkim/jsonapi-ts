import {AnyResource, Reference} from '@/jsonapi';
import {Id, IMeta, IOptionalRelationship, IReferenceTo, IRelationship, IRequiredLinks} from '@/jsonapi/schema';

export class OneRelationship<TResource extends AnyResource> {
  public data: Reference<TResource>;
  public links: IRequiredLinks | null;
  public meta: IMeta | null;

  public constructor(data: Reference<TResource>, links: IRequiredLinks | null = null, meta: IMeta | null = null) {
    this.data = data;
    this.links = links;
    this.meta = meta;
  }

  public get id(): Id {
    return this.data.id;
  }

  public get resource(): TResource | null {
    return this.data.resource;
  }

  public set resource(resource: TResource | null) {
    this.data.resource = resource;
  }

  public static wrap<TResource extends AnyResource>(
    relationship: IRelationship<IReferenceTo<TResource>>,
  ): OneRelationship<TResource> {
    return new OneRelationship(
      Reference.wrap(relationship.data),
      relationship.links || null,
      relationship.meta || null,
    );
  }

  public rewrap(relationship: IRelationship<IReferenceTo<TResource>>): void {
    this.meta = relationship.meta ?? null;
    this.links = relationship.meta ?? null;
    this.data = Reference.wrap(relationship.data);
  }

  public unwrap(): IRelationship<IReferenceTo<TResource>> {
    return {
      data: this.data.unwrap(),
      links: this.links || undefined,
      meta: this.meta || undefined,
    };
  }

  public static unwrapAll<TResource extends AnyResource>(
    relationships: Array<OneRelationship<TResource>>,
  ): Array<IRelationship<IReferenceTo<TResource>>> {
    return relationships.map((r: OneRelationship<TResource>) => r.unwrap());
  }
}

export class ManyRelationship<TResource extends AnyResource> {
  public data: Array<Reference<TResource>>;
  public links: IRequiredLinks | null;
  public meta: IMeta | null;

  public constructor(
    data: Array<Reference<TResource>> = [],
    links: IRequiredLinks | null = null,
    meta: IMeta | null = null,
  ) {
    this.data = data;
    this.links = links;
    this.meta = meta;
  }

  public get resources(): Array<TResource | null> {
    return this.data.map((reference: Reference<TResource>) => reference.resource);
  }

  public static wrap<TResource extends AnyResource>(
    relationship: IRelationship<Array<IReferenceTo<TResource>>>,
  ): ManyRelationship<TResource>;
  public static wrap<TResource extends AnyResource>(
    relationship?: IRelationship<Array<IReferenceTo<TResource>>>,
  ): ManyRelationship<TResource> | null;

  public static wrap<TResource extends AnyResource>(
    relationship?: IRelationship<Array<IReferenceTo<TResource>>>,
  ): ManyRelationship<TResource> | null {
    if (relationship === undefined) {
      return null;
    } else {
      return new ManyRelationship(
        relationship.data.map<Reference<TResource>>(Reference.wrap),
        relationship.links || null,
        relationship.meta || null,
      );
    }
  }

  public rewrap(relationship: IRelationship<Array<IReferenceTo<TResource>>>): void {
    this.meta = relationship.meta ?? null;
    this.links = relationship.meta ?? null;
    this.data.length = 0;
    this.data.push(...relationship.data.map<Reference<TResource>>(Reference.wrap));
  }

  public unwrap(): IRelationship<Array<IReferenceTo<TResource>>> {
    return {
      data: this.data.map((reference: Reference<TResource>) => reference.unwrap()),
      links: this.links || undefined,
      meta: this.meta || undefined,
    };
  }
}

export class OneOptionalRelationship<TResource extends AnyResource> {
  public data: Reference<TResource> | null;
  public links: IRequiredLinks | null;
  public meta: IMeta | null;

  public constructor(
    data: Reference<TResource> | null = null,
    links: IRequiredLinks | null = null,
    meta: IMeta | null = null,
  ) {
    this.data = data;
    this.links = links;
    this.meta = meta;
  }

  public get id(): Id | null {
    return this.data?.id ?? null;
  }

  public get resource(): TResource | null {
    return this.data?.resource ?? null;
  }

  public set resource(resource: TResource | null) {
    this.data!.resource = resource;
  }

  public static wrap<TResource extends AnyResource>(
    relationship: IOptionalRelationship<IReferenceTo<TResource>>,
  ): OneOptionalRelationship<TResource> {
    return new OneOptionalRelationship(
      Reference.wrap(relationship.data),
      relationship.links || null,
      relationship.meta || null,
    );
  }

  public rewrap(relationship: IOptionalRelationship<IReferenceTo<TResource>>): void {
    this.meta = relationship.meta ?? null;
    this.links = relationship.meta ?? null;
    this.data = Reference.wrap(relationship.data);
  }

  public unwrap(): IOptionalRelationship<IReferenceTo<TResource>> {
    return {
      data: this.data?.unwrap() || null,
      links: this.links || undefined,
      meta: this.meta || undefined,
    };
  }
}
