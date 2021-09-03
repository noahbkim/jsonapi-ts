import {IData, IDocument} from '../../schema';
import {IDocumentRequest, IDocumentResponse} from '../broker';

export interface IHttpRequestMiddleware<TReadData, TWriteData> {
  receive(request: XMLHttpRequest): Promise<TReadData>;
  send(request: XMLHttpRequest, value?: TWriteData): void;
}

type Data = Document | BodyInit | null;

export class DataMiddleware implements IHttpRequestMiddleware<XMLHttpRequest, Data> {
  public receive(r: XMLHttpRequest): Promise<XMLHttpRequest> {
    return Promise.resolve(r);
  }
  public send(r: XMLHttpRequest, value?: Data): void {
    r.send(value);
  }
}

export type IJsonPrimitive = string | number | boolean | null;
interface IJsonObject {
  [type: string]: IJson;
}
type IJsonArray = Array<IJson>;
export type IJson = IJsonPrimitive | IJsonObject | IJsonArray;

export class JsonMiddleware implements IHttpRequestMiddleware<[IJson, number], IJson> {
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

export class DocumentMiddleware implements IHttpRequestMiddleware<IDocumentResponse<any>, IDocument<any>> {
  public receive(r: XMLHttpRequest): Promise<IDocumentResponse<any>> {
    if (r.responseText.length === 0) {
      return Promise.resolve({document: {}, status: r.status, statusText: r.statusText});
    }
    let document;
    try {
      document = JSON.parse(r.responseText);
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve({
      document,
      status: r.status,
      statusText: r.statusText,
    });
  }

  public send(r: XMLHttpRequest, data?: IDocument<any>): void {
    if (data) {
      r.setRequestHeader('Content-Type', 'application/vnd.api+json');
    }
    r.setRequestHeader('Accept', 'application/vnd.api+json');
    r.send(data ? JSON.stringify(data) : undefined);
  }
}

class Get {
  public static format(key: string, value: string): string {
    return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

export class HttpRequest<TReadData, TWriteData> {
  private readonly method: string;
  private readonly url: string;
  private readonly urlParameters: Map<string, string> = new Map();
  private readonly requestHeaders: Map<string, string> = new Map();
  private readonly middleware: IHttpRequestMiddleware<TReadData, TWriteData>;

  public constructor(method: string, url: string, middleware: IHttpRequestMiddleware<TReadData, TWriteData>) {
    this.method = method;
    this.url = url;
    this.middleware = middleware;
  }

  public parameter(key: string, value: string): this {
    this.urlParameters.set(key, value);
    return this;
  }

  public parameters(parameters: Map<string, string>): this {
    parameters.forEach((value, key) => this.parameter(key, value));
    return this;
  }

  public header(key: string, value: string): this {
    this.requestHeaders.set(key, value);
    return this;
  }

  public headers(headers: Map<string, string>): this {
    headers.forEach((value, key) => this.header(key, value));
    return this;
  }

  public send(data?: TWriteData): Promise<TReadData> {
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
    this.urlParameters.forEach((value: string, key: string) => parts.push(Get.format(key, value)));
    return '?' + parts.join('&');
  }
}

export class DocumentRequest<TReadData extends IData, TWriteData extends IData | undefined>
  extends HttpRequest<IDocumentResponse<TReadData>, IDocument<TWriteData>>
  implements IDocumentRequest<TReadData, TWriteData | undefined>
{
  private static MIDDLEWARE: DocumentMiddleware = new DocumentMiddleware();

  public constructor(method: string, url: string) {
    super(method, url, DocumentRequest.MIDDLEWARE);
  }
}

export class JsonRequest extends HttpRequest<IJson, IJson> {
  private static MIDDLEWARE: JsonMiddleware = new JsonMiddleware();

  public constructor(method: string, url: string) {
    super(method, url, JsonRequest.MIDDLEWARE);
  }
}
