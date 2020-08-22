import { IThread } from "./types";
import { getMaxThreads } from "./utils";
import { createMainThread } from "./main-thread";
import { createWorkerThread } from "./worker-thread";

export function createWorkerPool() {
  const maxWorkers = getMaxThreads() - 1;
  const workerList: Record<string, void | Worker> = {};

  // Create a worker instance for each thread
  for (let i = 0; i <= maxWorkers; i++) {
    const id = String(i);
    workerList[id] =
      id === "0"
        ? createMainThread({
            id,
            isMainThread: true,
            maxWorkers,
            thread: {} as IThread,
          }) //   new MainThread(bootstrapWorker, { id, isMainThread: true, maxWorker })
        : createWorkerThread({
            id,
            isMainThread: false,
            maxWorkers,
            thread: {} as IThread,
          }); //  new WorkerThread(bootstrapWorker, { name: id, maxWorkers });
  }

  console.log("workerList??", workerList);

  return {
    workerList,
    postMessage,
  };
}
