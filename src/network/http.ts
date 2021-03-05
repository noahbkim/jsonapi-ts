import {IDocument} from '../schema';

export const METHOD = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

export interface IHttpRequestMiddleware<TValue> {
  receive(request: XMLHttpRequest): Promise<[TValue, number]>;
  send(request: XMLHttpRequest, value?: TValue): void;
}

type Data = Document | BodyInit | null;

export class DataMiddleware<TValue> implements IHttpRequestMiddleware<TValue> {
  public receive(r: XMLHttpRequest): Promise<[TValue, number]> {
    return Promise.resolve([r.response, r.status]);
  }
  public send(r: XMLHttpRequest, value?: TValue): void {
    r.send((value as any) as Data);
  }
}

export type IJsonPrimitive = string | number | boolean | null;
interface IJsonObject {
  [type: string]: IJson;
}
type IJsonArray = Array<IJson>;
export type IJson = IJsonPrimitive | IJsonObject | IJsonArray;

export class JsonMiddleware implements IHttpRequestMiddleware<IJson> {
  public receive(r: XMLHttpRequest): Promise<[IJson, number]> {
    if (r.responseText.length === 0) {
      return Promise.resolve([null, r.status]);
    }
    let data;
    try {
      data = JSON.parse(r.responseText);
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve([data, r.status]);
  }
  public send(r: XMLHttpRequest, data?: IJson): void {
    if (data) {
      r.setRequestHeader('Content-Type', 'application/vnd.api+json');
    }
    r.setRequestHeader('Accept', 'application/vnd.api+json');
    r.send(data ? JSON.stringify(data) : undefined);
  }
}

export class DocumentMiddleware implements IHttpRequestMiddleware<IDocument<any>> {
  public receive(r: XMLHttpRequest): Promise<[IDocument<any>, number]> {
    if (r.responseText.length === 0) {
      return Promise.resolve([{data: {}}, r.status]);
    }
    let data;
    try {
      data = JSON.parse(r.responseText);
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve([data, r.status]);
  }

  public send(r: XMLHttpRequest, data?: IDocument<any>): void {
    if (data) {
      r.setRequestHeader('Content-Type', 'application/vnd.api+json');
    }
    r.setRequestHeader('Accept', 'application/vnd.api+json');
    r.send(data ? JSON.stringify(data) : undefined);
  }
}

export class HttpRequest<TValue = Data, TMiddleware extends IHttpRequestMiddleware<TValue> = DataMiddleware<TValue>> {
  private readonly method: string;
  private readonly url: string;
  private readonly urlParameters: Map<string, string> = new Map();
  private readonly requestHeaders: Map<string, string> = new Map();
  private readonly middleware: TMiddleware;

  public constructor(method: string, url: string, middleware: TMiddleware) {
    this.method = method;
    this.url = url;
    this.middleware = middleware;
  }

  public parameter(key: string, value: string): HttpRequest<TValue, TMiddleware> {
    this.urlParameters.set(key, value);
    return this;
  }

  public parameters(parameters: Map<string, string>): HttpRequest<TValue, TMiddleware> {
    parameters.forEach((value, key) => this.parameter(key, value));
    return this;
  }

  public header(key: string, value: string): HttpRequest<TValue, TMiddleware> {
    this.requestHeaders.set(key, value);
    return this;
  }

  public headers(headers: Map<string, string>): HttpRequest<TValue, TMiddleware> {
    headers.forEach((value, key) => this.header(key, value));
    return this;
  }

  public send(data?: TValue): Promise<[TValue, number]> {
    return new Promise((resolve, reject) => {
      const r = new XMLHttpRequest();
      r.addEventListener('load', () => this.middleware.receive(r).then(resolve).catch(reject));
      r.open(this.method, this.url + this.get(), true);
      this.requestHeaders.forEach((value, key) => r.setRequestHeader(key, value));
      this.middleware.send(r, data);
    });
  }

  private get(): string {
    if (this.urlParameters.size === 0) {
      return '';
    }
    const parts: Array<string> = [];
    this.urlParameters.forEach((value, key) => parts.push([key, value].map(encodeURIComponent).join('=')));
    return '?' + parts.join('&');
  }
}

const MIDDLEWARE = {document: new DocumentMiddleware()};

export type DocumentHttpRequest = HttpRequest<IDocument<any>, DocumentMiddleware>;

export function request(method: string, url: string): HttpRequest<IDocument<any>, DocumentMiddleware> {
  return new HttpRequest<IDocument<any>, DocumentMiddleware>(method, url, MIDDLEWARE.document);
}
