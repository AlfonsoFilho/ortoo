import { CONTEXT_SET } from "./constants.mjs";

export function WorkerPool(code, onMessage) {
  var blob = new Blob([code, "workerCode()"], { type: "text/javascript" });
  var url = URL.createObjectURL(blob);

  // const { href } = new URL(url, location.origin + '/lib/');
  this.maxWorkers = navigator.hardwareConcurrency;
  this.currentWorker = 0;
  this.workerList = [];
  /**
   * @param message {import("./types").Message}
   * @param options {object}
   */
  this.postMessage = (message, options = {}) => {
    if (options.workerId) {
      this.workerList[options.workerId].instance.postMessage(message);
    } else {
      this.workerList[this.currentWorker].instance.postMessage(message);
      this.currentWorker =
        this.currentWorker < this.maxWorkers ? this.currentWorker + 1 : 0;
    }
  };

  for (let i = 0; i <= this.maxWorkers; i++) {
    this.workerList[i] = {
      id: String(i),
      instance: new Worker(url, { name: i, type: "module" }),
    };
    this.workerList[i].instance.onmessage = onMessage;
  }

  for (let i = 0; i <= this.maxWorkers; i++) {
    const message = {
      type: CONTEXT_SET,
      payload: {
        currentWorker: i,
        workers: this.workerList.map(({ id }) => id),
      },
    };
    this.workerList[i].instance.postMessage(message);
  }
}
