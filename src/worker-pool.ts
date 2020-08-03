import { Message, Broker, WorkerPoolPostMessageOptions } from "./types";
import { getMaxThreads } from "./utils";

export class InlineWorker {
  private _worker!: Worker;

  constructor(code: Function, options: WorkerOptions) {
    if (window.Worker && window.Blob) {
      const blob = new Blob(["(", code.toString(), ")()"], {
        type: "text/javascript",
      });
      const url = URL.createObjectURL(blob);
      this._worker = new Worker(url, options);
    }
  }

  public postMessage(msg) {
    this._worker.postMessage(msg);
  }

  public setOnMessage(callback: (ev: MessageEvent) => void) {
    this._worker.onmessage = callback;
  }
}

export function createWorkerPool(code: Function, broker: Broker) {
  const maxWorkers = getMaxThreads();
  const pool = {
    maxWorkers,
    currentWorker: 0,
    workerList: {},
    postMessage(
      message: Message,
      options: WorkerPoolPostMessageOptions = {}
    ): void {
      if (options.workerId) {
        this.workerList[options.workerId].postMessage(message);
      } else {
        this.workerList[this.currentWorker].postMessage(message);
        this.currentWorker =
          this.currentWorker < this.maxWorkers ? this.currentWorker + 1 : 0;
      }
    },
  };

  // Create a worker instance for each thread
  for (let i = 0; i <= maxWorkers; i++) {
    const id = String(i);
    pool.workerList[id] = new InlineWorker(code, { name: id });
    pool.workerList[id].setOnMessage((e: MessageEvent) => {
      broker(e.data, pool);
    });
  }

  return pool;
}
