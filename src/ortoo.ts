import { createWorkerPool } from "./worker-pool";
import { worker } from "./worker";
import { Settings, Broker } from "./types";
import { SYSTEM, SPAWN } from "./constants";
import { serialize } from "./utils";

// TODO: timeout
// TODO: extend actor
// TODO: agent actor
// TODO: main thread actor

const systemActor = {
  config: {
    mainThread: true,
  },
  start() {
    console.log("SYSTEM start!");
    console.log("whoami", self);
  },
  spawn() {},
};

export async function Ortoo(settings: Settings = {}) {
  const broker: Broker = (msg, workerPool) => {
    // console.log("Broker msg log: ", msg);

    if (msg.receiver === SYSTEM) {
    }
  };

  // 1. create worker pool
  const pool = createWorkerPool(worker, broker);

  // 2. create system actor (main thread)

  // 3. create root actor (worker thread)

  // const _pool: IWorkerPool = new WorkerPool(worker, async (e: MessageEvent) => {
  //   const message: Message = e.data;

  //   if (message.receiver === SYSTEM) {
  //     switch (message.type) {
  //       case SPAWN: {
  //         const mod = await import(location.href + message.payload.url).then(
  //           (mod) => mod.default
  //         );

  //         console.log("SPAWN again?", message, mod);

  //         pool.postMessage({
  //           ...message,
  //           // sender: "SYSTEM",
  //           // receiver: "*",
  //           payload: { ...message.payload, code: serialize(mod) },
  //         });
  //         break;
  //       }
  //     }
  //   } else {
  //     const [workerId, ..._] = message.receiver ?? "";
  //     if (workerId in pool.workerList) {
  //       pool.postMessage(message, { workerId });
  //     } else {
  //       throw new Error(`Worker ${workerId} doesn't exist`);
  //     }
  //   }
  // });

  // Create system actor
  pool.postMessage({
    type: SPAWN,
    sender: "0.0",
    payload: serialize(systemActor),
    receiver: "0.0",
  });

  if (settings.root) {
    // console.log("rott", settings.root);
    // const mod = await import(settings.root).then((mod) => mod.default);

    pool.postMessage({
      type: SPAWN,
      receiver: "*.*",
      sender: "0.0",
      payload: serialize(settings.root),
    });
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

// export class Ortoo {
//   private static _system: Ortoo;

//   private constructor() {
//     console.log("jew!!");
//   }

//   public static start(settings: Settings = {}): Ortoo {
//     if (!Ortoo._system) {
//       Ortoo._system = new Ortoo();
//     }

//     return Ortoo._system;
//   }

//   public static stop() {}
// }
