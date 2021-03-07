import {IData, IDocument} from '../schema';
import {DocumentRequest} from './default';

export enum Method {
  GET = 'GET',
  POST = 'POST',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export interface IDocumentResponse<TData extends IData> {
  document: IDocument<TData>;
  status: number;
  statusText?: string;
}

export interface IDocumentRequest<TReadData extends IData, TWriteData extends IData | undefined> {
  parameter(key: string, value: string): this;
  parameters(parameters: Map<string, string>): this;
  header(key: string, value: string): this;
  headers(headers: Map<string, string>): this;
  send(data?: IDocument<TWriteData>): Promise<IDocumentResponse<TReadData>>;
}

export interface IDocumentBroker {
  request<TReadData extends IData, TWriteData extends IData | undefined = undefined>(
    method: Method,
    url: string
  ): DocumentRequest<TReadData, TWriteData>
}
