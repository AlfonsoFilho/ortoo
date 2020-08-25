export function parseFunction(code: string) {
  return {
    body: code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim(),
    paramName: code.match(/\w+\s(\w+)\(([a-z0-9]*)\)/)![2].trim(),
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
