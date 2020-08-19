import { createWorkerPool } from "./worker-pool";
import { worker } from "./worker";
import { Settings, Message, WorkerPool } from "./types";

// TODO: timeout
// TODO: extend actor
// DONE: agent actor
// DONE: main thread actor
// TODO: dead letters
// TODO: ActorPool
// TODO: load actor
// TODO: dependency injection
// TODO: testing suite

declare var messageProps: {
  ask: any;
  message: Message;
  setState: (state: any) => void;
  getState: () => any;
};

// // TODO: remove this
// function serialize(localMod) {
//   return JSON.stringify(localMod, (k, v) => {
//     if (typeof v === "function") {
//       const code = v.toString();
//       return code
//         .replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "")
//         .substring(code.indexOf("{") + 1, code.lastIndexOf("}"))
//         .trim();
//     }
//     return v;
//   });
// }

export async function Ortoo(settings: Settings = {}) {
  const pool = createWorkerPool(worker);

  if (settings.root) {
    // const mod = await import(settings.root).then((mod) => mod.default);
    setTimeout(() => {
      pool.postMessage({
        type: "spawn",
        receiver: "1.0",
        sender: "0.0",
        // payload: { code: serialize(settings.root) },
        payload: { url: settings.root },
      });
    }, 0);
  }

  for (const item of settings.plugins ?? []) {
    item(pool);
  }
}

export function OrtooDebugger(pool: WorkerPool) {
  globalThis.OrtooDebug = {
    getActors: () => {
      console.log("Func from debugger", pool.workerList);
      for (const workerId of Object.keys(pool.workerList)) {
        pool.postMessage({
          type: "info",
          receiver: `${workerId}.0`,
          sender: "*",
        });
      }
    },
  };
}
