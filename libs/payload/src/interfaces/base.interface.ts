export interface IBaseRes {
  msg: string
}

export interface IDataRes<T> extends IBaseRes {
  data: T
}
