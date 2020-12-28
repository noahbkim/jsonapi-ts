import {DocumentHttpRequest} from './http';

export interface IJsonApiMiddleware {
  apply(request: DocumentHttpRequest): void;
}
