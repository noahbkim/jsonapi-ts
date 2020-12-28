import {JsonApi} from '../api';
import {AnyIResource, IType} from '../../schema';
import {IModel, Model} from '../../model';
import {PartialResourceQuery} from './query';
import {ManyDocument} from '../document';

export class ReadOnlyResourceEndpoint<
  TType extends IType,
  TIReadResource extends AnyIResource<TType>,
  TIWriteResource extends AnyIResource<TType> = TIReadResource,
> {
  protected api: JsonApi;
  protected model: IModel<TType, TIReadResource, TIWriteResource>;
  protected url: string;

  public constructor(api: JsonApi, model: IModel<TType, TIReadResource, TIWriteResource>, url: string) {
    this.api = api;
    this.model = model;
    this.url = url;
  }

  public getAll(
    q: PartialResourceQuery<Model<TType, TIReadResource, TIWriteResource>>
  ): Promise<ManyDocument<Model<TType, TIReadResource, TIWriteResource>>> {
    return this.api.getAll(this.url, this.model, q);
  }
}
