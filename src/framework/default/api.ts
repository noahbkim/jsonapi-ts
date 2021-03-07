import {DocumentRequest} from './http';
import {IJsonApiMiddleware} from './middleware';
import {IDocumentBroker, Method} from '../broker';
import {IData} from '../../schema';

export class DocumentBroker implements IDocumentBroker {
  public readonly middleware: Array<IJsonApiMiddleware>;

  public constructor(...middleware: Array<IJsonApiMiddleware>) {
    this.middleware = middleware;
  }

  public request<TReadData extends IData, TWriteData extends IData | undefined = undefined>(
    method: Method,
    url: string
  ): DocumentRequest<TReadData, TWriteData> {
    const r = new DocumentRequest<TReadData, TWriteData>(method, url);
    for (const middleware of this.middleware) {
      middleware.apply(r);
    }
    return r;
  }
}
