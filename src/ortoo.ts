import { createWorkerPool } from "./worker-pool";
import { worker } from "./worker";
import { Settings, Message } from "./types";
import { serialize } from "./utils";

// TODO: timeout
// TODO: extend actor
// TODO: agent actor
// TODO: main thread actor

declare var fromActor: { ask: any; message: Message };

export async function Ortoo(settings: Settings = {}) {
  // 1. create worker pool
  const pool = createWorkerPool(worker);

  // 2. create system actor (main thread)
  const systemActor = {
    config: {
      mainThread: true,
    },
    start() {
      console.log("SYSTEM start!!!!");
      console.log("whoami", self);
    },
    async spawn() {
      const { ask, message } = fromActor;

      console.log("props", fromActor);

      console.log("asking system to spawn", message);

      const id = await ask({
        receiver: "1.0",
        type: "SYSTEM_SPAWN",
        sender: "0.0",
        payload: message.payload,
      });
      console.log("id", id);
    },
  };

  pool.postMessage({
    type: "SYSTEM_SPAWN",
    sender: "0.0",
    payload: serialize(systemActor),
    receiver: "0.0",
  });

  // 3. create root actor (worker thread)
  if (settings.root) {
    // console.log("rott", settings.root);
    // const mod = await import(settings.root).then((mod) => mod.default);

    pool.postMessage({
      type: "spawn",
      receiver: "0.0",
      sender: "0.0",
      payload: serialize(settings.root),
    });
  }

  // if (settings.debug) {
  //   globalThis.Ortoo = {
  //     version: 1,
  //     about: () => {
  //       console.table({
  //         agent: navigator.userAgent,
  //         workers: pool.maxWorkers,
  //       });
  //     },
  //     // getActors: ()
  //   };
  // }
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
