export const isObject = (unknown: unknown): unknown is object =>
  unknown !== null && typeof unknown === 'object'

export const hasKey = <K extends string>(
  unknown: unknown,
  key: K,
): unknown is Record<K, unknown> => isObject(unknown) && key in unknown

export const hasKeys = <K extends string>(
  unknown: unknown,
  ...keys: Array<K>
): unknown is Record<K, unknown> =>
  keys.every((key): boolean => hasKey(unknown, key))

export const isStringUnion = <T extends string>(
  unknown: unknown,
  arrayOfStrings: Readonly<Array<T>>,
): unknown is typeof arrayOfStrings[number] =>
  typeof unknown === 'string' && arrayOfStrings.some((str) => str === unknown)

export function assertIsStringUnion<T extends string>(
  unknown: unknown,
  arrayOfStrings: Readonly<Array<T>>,
  msg: string,
): asserts unknown is typeof arrayOfStrings[number] {
  if (!isStringUnion(unknown, arrayOfStrings)) {
    throw new Error(msg)
  }
}

export const assertHasKey: <K extends string>(
  unknown: unknown,
  key: K,
  msg: string,
) => asserts unknown is Record<K, unknown> = <K extends string>(
  unknown: unknown,
  key: K,
  msg: string,
): asserts unknown is Record<K, unknown> => {
  if (!hasKey(unknown, key)) {
    throw new Error(msg)
  }
}

export const assertIsUint8Array: (
  something: unknown,
  msg: string,
) => asserts something is Uint8Array = (
  something: unknown,
  msg: string,
): asserts something is Uint8Array => {
  if (!(something instanceof Uint8Array)) {
    throw new Error(msg)
  }
}
