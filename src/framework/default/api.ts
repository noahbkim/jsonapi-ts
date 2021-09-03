import {IData} from '../../schema';
import {IDocumentBroker, Method} from '../broker';
import {DocumentRequest} from './http';
import {IJsonApiMiddleware} from './middleware';

/** Default implementation for requesting a resource.
 *
 * A document broker provides a way to create a document request with
 * persistent middleware. Middleware components are specified via the
 * constructor and are applied sequentially to the request. Primarily, this is
 * used to attach authentication headers to requests.
 */
export class DocumentBroker implements IDocumentBroker {
  public readonly middleware: Array<IJsonApiMiddleware>;

  public constructor(...middleware: Array<IJsonApiMiddleware>) {
    this.middleware = middleware;
  }

  /** Create a new document request.
   *
   * @param method the HTTP method of the request.
   * @param url the URL being requested.
   */
  public request<TReadData extends IData, TWriteData extends IData | undefined = undefined>(
    method: Method,
    url: string,
  ): DocumentRequest<TReadData, TWriteData> {
    const r = new DocumentRequest<TReadData, TWriteData>(method, url);
    for (const middleware of this.middleware) {
      middleware.apply(r);
    }
    return r;
  }
}
