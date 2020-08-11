import { Message, Broker } from "./types";
import { getMaxThreads } from "./utils";
import { Thread } from "./thread";

export function createWorkerPool(code: Function, broker: Broker) {
  const maxWorkers = getMaxThreads() - 1;
  const pool = {
    maxWorkers,
    currentWorker: 1,
    workerList: {},
    getWorker(): number {
      const currentWorker = this.currentWorker;
      this.currentWorker =
        this.currentWorker <= this.maxWorkers ? this.currentWorker + 1 : 1;
      return currentWorker;
    },
    postMessage(message: Message): void {
      const node = message.receiver.split(".")[0];
      if (node === "*") {
        this.workerList[this.getWorker()].postMessage(message);
      } else {
        this.workerList[node].postMessage(message);
      }
    },
  };

  // Create a worker instance for each thread
  for (let i = 0; i <= maxWorkers; i++) {
    const id = String(i);
    pool.workerList[id] = new Thread(code, { name: id });
    pool.workerList[id].setOnMessage((e: MessageEvent) => {
      broker(e.data, pool);
    });
  }

  return pool;
}
