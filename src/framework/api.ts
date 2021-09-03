import {AnyIResource, IDocument, IType} from '../schema';
import {IDocumentBroker, Method} from './broker';
import {status} from './default';
import {pagination, PartialDocumentPagination} from './document';
import {PartialResourceQuery, query} from './endpoint';

export abstract class JsonApi {
  public abstract readonly broker: IDocumentBroker;

  /** Get a single page of a resource query.
   *
   * This method takes a resource query and optional pagination and returns
   * two things: the resultant models and the updated pagination for the
   * consequent page.
   *
   * @template TTModel an optional subclass to cast.
   * @param url the URL to request resources from.
   * @param type the resource type.
   * @param q the resource query to send as GET parameters.
   * @param p the pagination specifier to request.
   * @return a promise for a document of data and consequent pagination.
   */
  public list<TType extends IType, TIReadResource extends AnyIResource<TType>>(
    url: string,
    type: TType,
    q: PartialResourceQuery<TType>,
    p: PartialDocumentPagination = pagination(),
  ): Promise<IDocument<Array<TIReadResource>>> {
    return this.broker
      .request<Array<TIReadResource>>(Method.GET, url)
      .parameters(q.typed(type).with(p).parameters)
      .send()
      .then(status(200));
  }

  /** Get a single resource.
   *
   * This method takes a resource query and optional pagination and returns
   * two things: the resultant models and the updated pagination for the
   * consequent page.
   *
   * @template TTModel an optional modelFactory subclass to cast.
   * @param url the URL to request resources from.
   * @param type the resource type.
   * @param q the resource query to send as GET parameters.
   * @return a single resource.
   */
  public retrieve<TType extends IType, TIReadResource extends AnyIResource<TType>>(
    url: string,
    type: TType,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<IDocument<TIReadResource>> {
    return this.broker
      .request<TIReadResource>(Method.GET, url)
      .parameters(q.typed(type).parameters)
      .send()
      .then(status(200));
  }

  public create<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType>,
  >(
    url: string,
    resource: TIWriteResource,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<IDocument<TIReadResource>> {
    return this.broker
      .request<TIReadResource, TIWriteResource>(Method.POST, url)
      .parameters(q.typed(resource.type).parameters)
      .send({data: resource})
      .then(status(201));
  }

  public update<
    TType extends IType,
    TIReadResource extends AnyIResource<TType>,
    TIWriteResource extends AnyIResource<TType>,
  >(
    url: string,
    resource: TIWriteResource,
    q: PartialResourceQuery<TType> = query(),
  ): Promise<IDocument<TIReadResource>> {
    return this.broker
      .request<TIReadResource, TIWriteResource>(Method.PATCH, url)
      .parameters(q.typed(resource.type).parameters)
      .send({data: resource})
      .then(status(200));
  }

  public delete(url: string): Promise<void> {
    return this.broker.request(Method.DELETE, url).send().then(status(204)).then();
  }
}
