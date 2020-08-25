import { Settings } from "./types";
import { getMaxThreads } from "./utils/max-threads";
import { bootstrapThread, createWorker } from "./worker/bootstrap";

// TODO: timeout
// TODO: extend actor
// DONE: agent actor
// DONE: main thread actor
// TODO: dead letters
// TODO: ActorPool
// DONE: load actor
// TODO: dependency injection
// TODO: testing suite
// TODO: plugin

export async function Ortoo(settings: Settings = {}) {
  const cores = getMaxThreads();
  const workers = {};
  const workerOptions = { root: settings.root };

  const mainWorker = {
    port: undefined,
    name: "0",
    addEventListener: () => {},
    onmessage: (msg: Partial<MessageEvent>) => {},
    postMessage(data, port) {
      this.port = port[0];
      this.onmessage({ data });
    },
  };

  // Start main thread
  bootstrapThread(mainWorker, workerOptions);
  workers[0] = mainWorker;

  // Create workers
  for (let i = 1; i < cores; i++) {
    workers[i] = createWorker(bootstrapThread, i, workerOptions);
  }

  // Setup ports
  for (let i = 0; i < cores; i++) {
    for (let j = 0; j < cores; j++) {
      if (i !== j) {
        const channel = new MessageChannel();
        workers[i].postMessage({ worker: j, receiver_port: channel.port1 }, [
          channel.port1,
        ]);
        workers[j].postMessage({ worker: i, sender_port: channel.port2 }, [
          channel.port2,
        ]);
      }
    }
  }
}
