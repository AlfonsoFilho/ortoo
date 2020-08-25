/**
 * JSON.parse with support to async functions
 */
export function deserialize(txt: string) {
  const { config = {}, ...obj } = JSON.parse(txt);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const prop in obj) {
    const { body, paramName } = obj[prop];
    obj[prop] = new AsyncFunction(paramName, body);
  }

  return { ...obj, config };
}
