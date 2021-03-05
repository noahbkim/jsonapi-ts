import {DocumentHttpRequest} from '../network';

export interface IJsonApiMiddleware {
  apply(request: DocumentHttpRequest): void;
}
