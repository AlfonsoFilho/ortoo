import { createWorkerPool } from "./worker-pool";
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

export async function Ortoo(settings: Settings = {}) {
  // const channel = new BroadcastChannel("ortoo:channel");
  const pool = createWorkerPool(settings);

  if (settings.root) {
    // setTimeout(() => {
    // for (const workerId of Object.keys(pool.workerList)) {
    // channel.postMessage({
    //   type: "spawn",
    //   receiver: "1.0",
    //   payload: { url: settings.root },
    // });
    // }, 0);
  }

  for (const item of settings.plugins ?? []) {
    item(pool);
  }
}

export function OrtooDebugger(pool: WorkerPool) {
  const channel = new BroadcastChannel("ortoo:channel");

  globalThis.OrtooDebug = {
    getActors: () => {
      console.log("Func from debugger", pool.workerList);
      for (const workerId of Object.keys(pool.workerList)) {
        channel.postMessage({
          type: "info",
          receiver: `${workerId}.0`,
        });
      }
    },
  };
}
