export interface IBaseRes {
  code: number
  msg: string
}

export interface IDataRes<T> extends IBaseRes {
  data: T
}
