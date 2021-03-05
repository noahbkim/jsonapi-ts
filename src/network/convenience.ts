import {IDocument, IError} from '../schema';

export function logErrors(errors?: Array<IError>): void {
  if (errors) {
    for (const error of errors) {
      console.error(error);
      // console.error(error.code);  // TODO
    }
  }
}

type PromiseStatusFilter<T> = (response: [T, number]) => Promise<T>;

/** A promise functor that checks status code from a response.
 *
 * @param expectedStatus the status to compare to.
 */
export function expectStatus<T extends IDocument<any>>(expectedStatus: number): PromiseStatusFilter<T> {
  return ([document, status]: [T, number]) => {
    if (status !== expectedStatus) {
      logErrors(document.errors);
      return Promise.reject(document.errors);
    } else {
      return Promise.resolve(document);
    }
  };
}
