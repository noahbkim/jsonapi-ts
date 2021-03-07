export interface ILinks {}

export type Id = string;
export type IType = string;

export interface IRequiredLinks extends ILinks {
  self?: string;
  related?: string;
}

export interface IAttributes {
  [key: string]: any | undefined;
}

export interface IRelationships {
  [key: string]: IRelationship<any> | undefined;
}

export interface IReference<TType extends IType> {
  id: Id;
  type: TType;
}

export type IReferenceTo<T extends {type: IType}> = IReference<T['type']>;

export type IData = IReference<IType> | Array<IReference<IType>>;

export interface IResource<
  TType extends IType,
  TAttributes extends IAttributes | undefined = undefined,
  TRelationships extends IRelationships | undefined = undefined
> extends IReference<TType> {
  id: Id;
  type: TType;
  attributes: TAttributes;
  relationships: TRelationships;
}

export type AnyIResource<TType extends IType = IType> = IResource<TType, IAttributes | undefined, IRelationships | undefined>;
export type TypeFromIResource<TIResource extends AnyIResource> = TIResource extends IResource<infer T> ? T : never;

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

export interface IOptionalRelationship<TData extends IReference<IType>> {
  data: TData | null;
  links?: IRequiredLinks;
  meta?: IMeta;
}

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
