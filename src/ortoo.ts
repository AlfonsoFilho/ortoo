import { createWorkerPool } from "./worker-pool";
import { worker } from "./worker";
import { Settings, Message } from "./types";
// import { serialize } from "./utils";

// TODO: timeout
// TODO: extend actor
// DONE: agent actor
// DONE: main thread actor
// TODO: dead letters

declare var fromActor: {
  ask: any;
  message: Message;
  setState: (state: any) => void;
  getState: () => any;
};

function serialize(localMod) {
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

export async function Ortoo(settings: Settings = {}) {
  const pool = createWorkerPool(worker);

  if (settings.root) {
    // const mod = await import(settings.root).then((mod) => mod.default);
    setTimeout(() => {
      pool.postMessage({
        type: "spawn",
        receiver: "1.0",
        sender: "0.0",
        payload: serialize(settings.root),
      });
    }, 0);
  }
}
