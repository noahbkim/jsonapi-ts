import {JsonApi} from './api';

export class JsonApiEndpoint {
  public readonly url: string;
  protected readonly api: JsonApi;

  public constructor(api: JsonApi, url: string) {
    this.api = api;
    this.url = url;
  }
}
