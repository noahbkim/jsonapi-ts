/** The native type of JSON:API ID values. */
export type Id = string;

/** The native type of JSON:API type values. */
export type IType = string;

/** The native type for the model serialization view.
 *
 * This is not in the JSON:API specification, but I added it because I needed
 * a way to mark partially- and differently- serialized models. I'll probably
 * write up a Python implementation that supports this.
 */
export type IView = string;

export interface ILinks {}

export interface IRequiredLinks extends ILinks {
  self?: string;
  related?: string;
}

export interface IReference<TType extends IType> {
  id: Id;
  type: TType;
}

export type IReferenceTo<T extends {type: IType}> = IReference<T['type']>;

export type IReferenceOrId<TType extends IType> = IReference<TType> | Id;

export function id<TType extends IType>(of: IReferenceOrId<TType>): Id {
  if (typeof of === 'object' && of !== null) {
    return of.id;
  } else {
    return of;
  }
}

export type IData = IReference<IType> | Array<IReference<IType>>;

export type IAttributes = Record<string, any>;
export type IRelationships = Record<string, IRelationship<IData> | IOptionalRelationship<IData> | undefined>;

export interface IResource<
  TType extends IType,
  TAttributes extends IAttributes | undefined = undefined,
  TRelationships extends IRelationships | undefined = undefined,
> extends IReference<TType> {
  id: Id;
  type: TType;
  view?: IView;
  attributes: TAttributes;
  relationships: TRelationships;
}

export type AnyIResource<TType extends IType = IType> = IResource<
  TType,
  IAttributes | undefined,
  IRelationships | undefined
>;

type DefinedPartial<T> = T extends undefined ? undefined : Partial<T>;

export type PartialIResource<TIResource extends AnyIResource> = IResource<
  TIResource['type'],
  DefinedPartial<TIResource['attributes']>,
  DefinedPartial<TIResource['relationships']>
>;

export interface ISource {
  pointer?: string;
  parameter?: string;
}

export interface IError {
  id?: Id;
  links?: ILinks;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: ISource;
  meta?: IMeta;
}

export interface IMeta {
  [key: string]: any;
}

export interface IJsonApi {}

export interface IRelationship<TData extends IData> {
  data: TData;
  links?: IRequiredLinks;
  meta?: IMeta;
}

export interface IOptionalRelationship<TData extends IData> {
  data: TData | null;
  links?: IRequiredLinks;
  meta?: IMeta;
}

export type IOneRelationship<TType extends IType> = IRelationship<IReference<TType>>;
export type IOneOptionalRelationship<TType extends IType> = IOptionalRelationship<IReference<TType>>;
export type IManyRelationship<TType extends IType> = IRelationship<Array<IReference<TType>>>;

export interface IDocument<TData extends IData | undefined> {
  data?: TData;
  errors?: Array<IError>;
  meta?: IMeta;
  links?: IRequiredLinks;
  jsonapi?: IJsonApi;
  included?: Array<AnyIResource>;
}

export interface IPagination {
  count: number;
  limit: number;
  offset: number;
}
