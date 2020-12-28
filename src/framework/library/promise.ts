export type Callback<T> = (v: T) => void;
export type OptionalCallback<T> = (v?: T) => void;

export type IncrementalPromiseCallback<TEach, TDone> = (
  step: Callback<TEach>,
  resolve: Callback<TDone>,
  reject: OptionalCallback<any>,
) => Promise<IncrementalPromiseCallback<TEach, TDone> | void>;

interface INone {}
const none = {};

export class IncrementalPromise<TEach, TDone> {
  private stepCallback: Callback<TEach> | undefined = undefined;
  private resolveCallback: Callback<TDone> | undefined = undefined;
  private rejectCallback: OptionalCallback<any> | undefined = undefined;
  private stepValues: Array<TEach> = [];
  private resolveValue: TDone | INone | null = none;
  private rejectValue: any | INone | null = none;

  public constructor(call: IncrementalPromiseCallback<TEach, TDone>) {
    this.invoke(call);
  }

  public each(callback: Callback<TEach>): Promise<TDone> {
    return new Promise((resolve, reject) => {
      if (this.stepValues) {
        this.stepValues.forEach((value) => callback(value));
      }
      if (this.resolveValue !== none) {
        resolve(this.resolveValue as TDone);
        return;
      }
      if (this.rejectValue !== none) {
        reject(this.rejectValue);
        return;
      }
      this.stepCallback = callback;
      this.resolveCallback = resolve;
      this.rejectCallback = reject;
    });
  }

  private invoke(call: IncrementalPromiseCallback<TEach, TDone>) {
    const promise = call(this.step.bind(this), this.resolve.bind(this), this.reject.bind(this));
    if (promise && this.resolveValue === none && this.rejectValue === none) {
      promise
        .then((recursiveCall) => {
          if (recursiveCall) {
            this.invoke(recursiveCall);
          }
        })
        .catch((error) => {
          this.reject(error);
        });
    }
  }

  private step(value: TEach) {
    if (this.stepCallback) {
      this.stepCallback(value);
    } else {
      this.stepValues.push(value);
    }
  }

  private resolve(value: TDone) {
    if (this.resolveCallback) {
      this.resolveCallback(value);
      this.resolveValue = null;
    } else {
      this.resolveValue = value;
    }
  }

  private reject(error?: any) {
    if (this.rejectCallback) {
      this.rejectCallback(error);
      this.rejectValue = null;
    } else {
      this.rejectValue = error;
    }
  }
}
