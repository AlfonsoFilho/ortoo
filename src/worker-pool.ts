import { Message } from "./types";
import { getMaxThreads } from "./utils";
import { Thread } from "./thread";

export function createWorkerPool(code: Function) {
  const maxWorkers = getMaxThreads() - 1;
  const pool = {
    maxWorkers,
    workerList: {},
    postMessage(message: Message): void {
      const node = message.receiver.split(".")[0];
      this.workerList[node].postMessage(message);
    },
  };

  // Create a worker instance for each thread
  for (let i = 0; i <= maxWorkers; i++) {
    const id = String(i);
    pool.workerList[id] = new Thread(code, { name: id });
    pool.workerList[id].setOnMessage((e: MessageEvent) => {
      pool.postMessage(e.data);
    });
  }

  return pool;
}
