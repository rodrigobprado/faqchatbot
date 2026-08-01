import { randomUUID } from "node:crypto";

export type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}>;

export const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

export const flushPromises = async (): Promise<void> => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

export const createTestId = (prefix = "test"): string => `${prefix}-${randomUUID()}`;
