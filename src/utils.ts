export function getMaxThreads() {
  // return navigator.hardwareConcurrency;
  return 3;
}

export function generateId() {
  return Math.random().toString(32).substring(2, 12);
}

export function parseFunction(code) {
  return {
    body: code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim(),
    paramName: code.match(/\w+\s(\w+)\(([a-z0-9]*)\)/)[2].trim(),
  };
}

export function removeComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "");
}

/**
 * JSON.stringify with support to functions
 */
export function serialize(localMod: object) {
  return JSON.stringify(localMod, (k, v) => {
    if (typeof v === "function") {
      return parseFunction(removeComments(v.toString()));
    }
    return v;
  });
}

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
