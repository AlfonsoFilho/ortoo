import { WorkerPool, IWorkerPool } from "./worker-pool";
import { worker } from "./worker";
import { Message } from "./types";
import { SYSTEM, SPAWN } from "./constants";

interface Settings {
  root?: any;
  debug?: boolean;
}

const serialize = (localMod) => {
  return JSON.stringify(localMod, (k, v) => {
    if (k === "start") {
      const code = v.toString();

      return code
        .replace(/\/\*[\s\S]*?\*\/|[\s\t]+\/\/.*/g, "")
        .substring(code.indexOf("{"), code.lastIndexOf("}"))
        .trim();
    }
    return v;
  });
};

export async function Ortoo(settings: Settings = {}) {
  const pool: IWorkerPool = new WorkerPool(worker, async (e: MessageEvent) => {
    const message: Message = e.data;

    if (message.receiver === SYSTEM) {
      switch (message.type) {
        case SPAWN: {
          const mod = await import(location.href + message.payload.url).then(
            (mod) => mod.default
          );

          console.log("SPAWN again?", message, mod);

          pool.postMessage({
            ...message,
            // sender: "SYSTEM",
            // receiver: "*",
            payload: { ...message.payload, code: serialize(mod) },
          });
          break;
        }
      }
    } else {
      const [workerId, ..._] = message.receiver ?? "";
      if (workerId in pool.workerList) {
        pool.postMessage(message, { workerId });
      } else {
        throw new Error(`Worker ${workerId} doesn't exist`);
      }
    }
  });

  if (settings.root) {
    const mod = await import(settings.root).then((mod) => mod.default);

    pool.postMessage({
      type: SPAWN,
      sender: SYSTEM,
      payload: { url: settings.root, code: serialize(mod) },
    } as any);
  }

  if (settings.debug) {
    globalThis.Ortoo = {
      version: 1,
      about: () => {
        console.table({
          agent: navigator.userAgent,
          workers: pool.maxWorkers,
        });
      },
      // getActors: ()
    };
  }
}
