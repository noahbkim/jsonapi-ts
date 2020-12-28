import {IData, IDocument, IError} from '../../schema';
import {IDocumentResponse} from '../broker';

export function logErrors(errors?: Array<IError>): void {
  if (errors) {
    for (const error of errors) {
      console.error(error);
      // console.error(error.code);  // TODO
    }
  }
}

type PromiseFilter<TData extends IData> = (response: IDocumentResponse<TData>) => Promise<IDocument<TData>>;

/** A promise functor that checks status code from a response.
 *
 * @param expected the status to compare to.
 */
export function status<TData extends IData>(expected: number): PromiseFilter<TData> {
  return (response: IDocumentResponse<TData>) => {
    if (response.status !== expected) {
      logErrors(response.document.errors);
      return Promise.reject(response.document.errors);
    } else {
      return Promise.resolve(response.document);
    }
  };
}
