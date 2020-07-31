import { Message } from "./types";
import { SETUP_WORKER, SYSTEM } from "./constants";
import { getMaxThreads } from "./utils";

export interface IWorkerPool {
  maxWorkers: number;
  currentWorker: number;
  workerList: Record<string, Worker>;
  postMessage: (message: Message, options?: { workerId: string }) => void;
}

export function WorkerPool(
  this: IWorkerPool,
  code: Function,
  onMessage: (this: Worker, ev: MessageEvent) => void
) {
  const blob = new Blob([code.toString(), code.name, "()"], {
    type: "text/javascript",
  });
  const url = URL.createObjectURL(blob);

  this.maxWorkers = getMaxThreads();
  this.currentWorker = 0;
  this.workerList = {};

  this.postMessage = (
    message: Message,
    options: { workerId?: string } = {}
  ) => {
    console.log("log", message);
    // if (options.workerId && options.workerId !== "null") {
    if (options.workerId) {
      this.workerList[options.workerId].postMessage(message);
    } else {
      this.workerList[this.currentWorker].postMessage(message);
      this.currentWorker =
        this.currentWorker < this.maxWorkers ? this.currentWorker + 1 : 0;
    }
  };

  // Create a worker instance for each thread
  for (let i = 0; i <= this.maxWorkers; i++) {
    const id = String(i);
    this.workerList[id] = new Worker(url, { name: id });
    this.workerList[id].onmessage = onMessage;
  }

  // Inform worker about the system
  for (let worker in this.workerList) {
    const message: Message = {
      id: "_",
      type: SETUP_WORKER,
      payload: {
        currentWorker: worker,
        workers: Object.keys(this.workerList),
      },
      receiver: worker,
      sender: SYSTEM,
    };
    this.workerList[worker].postMessage(message);
  }
}
