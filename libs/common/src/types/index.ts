export type EnumToConstant<T extends readonly string[]> = {
  [K in Uppercase<T[number]>]: T[number] extends infer V
    ? V extends string
      ? Uppercase<V> extends K
        ? V
        : never
      : never
    : never
}

export type Override<T, R> = Omit<T, keyof R> & R
