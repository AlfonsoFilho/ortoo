export function getMaxThreads() {
  return navigator.hardwareConcurrency;
}

export function serialize(localMod) {
  return JSON.stringify(localMod, (k, v) => {
    if (typeof v === "function") {
      const code = v.toString();
      return code
        .replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "")
        .substring(code.indexOf("{") + 1, code.lastIndexOf("}"))
        .trim();
    }
    return v;
  });
}

export function deserialize(txt) {
  const { config = {}, ...obj } = JSON.parse(txt);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  for (const prop in obj) {
    obj[prop] = new AsyncFunction("fromActor", obj[prop]);
  }

  return { ...obj, config };
}
