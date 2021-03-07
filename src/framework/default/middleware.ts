import {DocumentRequest} from './http';

export interface IJsonApiMiddleware {
  apply(request: DocumentRequest<any, any>): void;
}
