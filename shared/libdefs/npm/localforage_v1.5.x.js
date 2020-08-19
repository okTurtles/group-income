// flow-typed signature: 925af5b2fdcaf03745a5f974ecaa0ce9
// flow-typed version: c6154227d1/localforage_v1.5.x/flow_>=v0.104.x

type PartialConfig = {
  driver?: string | Array<string>,
  name?: string,
  size?: number,
  storeName?: string,
  version?: string,
  description?: string,
  ...
};

type Driver = {
  _driver: string,
  _initStorage(config: PartialConfig): void,
  getItem<T>(
    key: string,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): ?Promise<?T>,
  setItem<T>(
    key: string,
    value: T,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): ?Promise<T>,
  removeItem(
    key: string,
    successCallback?: (err?: Error) => mixed,
  ): ?Promise<void>,
  clear(successCallback?: ?(numberOfKeys: number) => mixed): ?Promise<number>,
  length(successCallback?: (numberOfKeys: number) => mixed): ?Promise<number>,
  key(
    keyIndex: number,
    successCallback?: (keyName: string) => mixed,
  ): ?Promise<string>,
  keys(
    successCallback?: (keyNames: Array<string>) => mixed,
  ): ?Promise<Array<string>>,
  ...
};

type localforageInstance = {
  INDEXEDDB: 'asyncStorage',
  WEBSQL: 'webSQLStorage',
  LOCALSTORAGE: 'localStorageWrapper',
  getItem<T>(
    key: string,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): Promise<?T>,
  setItem<T>(
    key: string,
    value: T,
    successCallback?: (err?: Error, value?: T) => mixed,
  ): Promise<T>,
  removeItem(
    key: string,
    successCallback?: (err?: Error) => mixed,
  ): Promise<void>,
  clear(successCallback?: ?(numberOfKeys: number) => mixed): Promise<number>,
  length(successCallback?: (numberOfKeys: number) => mixed): Promise<number>,
  key(
    keyIndex: number,
    successCallback?: (keyName: string) => mixed,
  ): Promise<string>,
  keys(
    successCallback?: (keyNames: Array<string>) => mixed,
  ): Promise<Array<string>>,
  iterate<T>(
    iteratorCallback: (value: T, key: string, iterationNumber: number) => mixed,
    successCallback?: (result: void | [string, T]) => mixed,
  ): Promise<void | [string, T]>,
  setDriver(driverNames: string | Array<string>): void,
  config(config?: PartialConfig): boolean | PartialConfig,
  defineDriver(driver: Driver): void,
  driver(): string,
  ready(): Promise<void>,
  supports(driverName: string): boolean,
  createInstance(config?: PartialConfig): localforageInstance,
  dropInstance(config?: PartialConfig): Promise<void>,
  ...
};

declare module 'localforage' {
  declare module.exports: localforageInstance;
}
