import {IData, IDocument} from '../../schema';
import {IDocumentResponse} from '../broker';

type PromiseFilter<TData extends IData> = (response: IDocumentResponse<TData>) => Promise<IDocument<TData>>;

/** A promise functor that checks status code from a response.
 *
 * @param expected the status to compare to.
 */
export function status<TData extends IData>(expected: number): PromiseFilter<TData> {
  return (response: IDocumentResponse<TData>) => {
    if (response.status !== expected) {
      console.warn(`expected status ${expected}, got ${response.status}!`);
      return Promise.reject(response.document.errors);
    } else {
      return Promise.resolve(response.document);
    }
  };
}
