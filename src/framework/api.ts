import {DocumentHttpRequest, METHOD, request} from '../network';
import {ResourceManager} from '../resource';
import {IJsonApiMiddleware} from './middleware';

export class JsonApi {
  public readonly resources: ResourceManager = new ResourceManager(this);
  public readonly middleware: Array<IJsonApiMiddleware> = [];

  public get(url: string): DocumentHttpRequest {
    return this.request(METHOD.GET, url);
  }

  public post(url: string): DocumentHttpRequest {
    return this.request(METHOD.POST, url);
  }

  public put(url: string): DocumentHttpRequest {
    return this.request(METHOD.PUT, url);
  }

  public patch(url: string): DocumentHttpRequest {
    return this.request(METHOD.PATCH, url);
  }

  public delete(url: string): DocumentHttpRequest {
    return this.request(METHOD.DELETE, url);
  }

  private request(method: string, url: string): DocumentHttpRequest {
    const r = request(method, url);
    for (const middleware of this.middleware) {
      middleware.apply(r);
    }
    return r;
  }
}
